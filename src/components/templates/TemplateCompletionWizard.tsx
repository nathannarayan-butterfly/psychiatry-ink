import { ChevronLeft, ChevronRight, Eye, Save, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type {
  DocumentTemplate,
  GeneratedDocument,
  TemplateInstance,
  TemplateInstanceAnswer,
} from '../../types/documentTemplate'
import { buildTemplateRenderContext } from '../../utils/documentTemplate/placeholderContext'
import {
  buildInitialFieldValues,
  renderTemplateDocumentHtml,
} from '../../utils/documentTemplate/renderTemplate'
import {
  answersToFieldValues,
  buildWizardSteps,
  fieldValuesToAnswers,
  validateWizardStep,
} from '../../utils/documentTemplate/wizardSteps'
import {
  findInProgressInstance,
  saveTemplateInstance,
} from '../../utils/documentTemplate/templateInstancesVault'
import { recordAuditEvent } from '../../services/auditApi'
import { A4PageView } from './A4PageView'
import { WizardFieldInput } from './WizardFieldInput'

export interface TemplateCompletionResult {
  fieldValues: Record<string, string | boolean | string[]>
  structuredAnswers: TemplateInstanceAnswer[]
  instanceId: string
  auditTrail: TemplateInstance['auditTrail']
}

interface TemplateCompletionWizardProps {
  template: DocumentTemplate
  caseId?: string
  onComplete: (result: TemplateCompletionResult) => void
  onClose: () => void
}

function appendAudit(
  trail: TemplateInstance['auditTrail'],
  action: string,
  stepIndex?: number,
  metadata?: Record<string, unknown>,
): TemplateInstance['auditTrail'] {
  return [
    ...trail,
    { at: new Date().toISOString(), action, stepIndex, metadata },
  ]
}

export function TemplateCompletionWizard({
  template,
  caseId,
  onComplete,
  onClose,
}: TemplateCompletionWizardProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [instanceId, setInstanceId] = useState<string>(() => crypto.randomUUID())
  const [auditTrail, setAuditTrail] = useState<TemplateInstance['auditTrail']>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean | string[]>>({})
  const [context, setContext] = useState<Awaited<ReturnType<typeof buildTemplateRenderContext>>>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      const ctx = await buildTemplateRenderContext(caseId)
      const initial = buildInitialFieldValues(template, ctx)

      if (caseId) {
        const existing = await findInProgressInstance(caseId, template.id)
        if (existing) {
          const restored = answersToFieldValues(existing.answers)
          setFieldValues({ ...initial, ...restored })
          setStepIndex(existing.currentStepIndex)
          setAuditTrail(existing.auditTrail)
          setInstanceId(existing.id)
          setContext(ctx)
          setLoading(false)
          return
        }
      }

      setFieldValues(initial)
      setContext(ctx)
      setAuditTrail(appendAudit([], 'wizard_started', 0, { templateId: template.id }))
      setLoading(false)
    })()
  }, [caseId, template])

  const steps = useMemo(
    () => buildWizardSteps(template, fieldValues),
    [template, fieldValues],
  )

  const currentStep = steps[stepIndex] ?? null
  const totalSteps = steps.length

  useEffect(() => {
    if (stepIndex >= steps.length && steps.length > 0) {
      setStepIndex(Math.max(0, steps.length - 1))
    }
  }, [stepIndex, steps.length])

  const handleFieldChange = useCallback((fieldId: string, value: string | boolean | string[]) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
    setStepErrors([])
  }, [])

  const persistDraft = useCallback(async () => {
    if (!caseId) return
    setSaving(true)
    try {
      const answers = fieldValuesToAnswers(template, fieldValues, 'manual')
      const instance: TemplateInstance = {
        id: instanceId,
        templateId: template.id,
        templateVersion: template.version,
        caseId,
        patientId: caseId,
        status: 'in_progress',
        currentStepIndex: stepIndex,
        answers,
        auditTrail: appendAudit(auditTrail, 'draft_saved', stepIndex),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await saveTemplateInstance(caseId, instance)
      setAuditTrail(instance.auditTrail)
      void recordAuditEvent('template_wizard_draft_saved', {
        caseId,
        metadata: { templateId: template.id, instanceId, stepIndex },
      })
    } finally {
      setSaving(false)
    }
  }, [auditTrail, caseId, fieldValues, instanceId, stepIndex, template])

  const goNext = useCallback(() => {
    if (!currentStep) return
    const errors = validateWizardStep(template, currentStep, fieldValues)
    if (errors.length > 0) {
      setStepErrors(errors)
      return
    }
    setStepErrors([])
    setAuditTrail((prev) => appendAudit(prev, 'step_completed', stepIndex))
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1))
  }, [currentStep, fieldValues, stepIndex, template, totalSteps])

  const goPrev = useCallback(() => {
    setStepErrors([])
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const handleGenerate = useCallback(async () => {
    for (let i = 0; i < steps.length; i += 1) {
      const errors = validateWizardStep(template, steps[i]!, fieldValues)
      if (errors.length > 0) {
        setStepIndex(i)
        setStepErrors(errors)
        return
      }
    }

    const structuredAnswers = fieldValuesToAnswers(template, fieldValues, 'manual')
    const completedTrail = appendAudit(auditTrail, 'wizard_completed', stepIndex, {
      templateId: template.id,
    })

    if (caseId) {
      const instance: TemplateInstance = {
        id: instanceId,
        templateId: template.id,
        templateVersion: template.version,
        caseId,
        patientId: caseId,
        status: 'completed',
        currentStepIndex: totalSteps - 1,
        answers: structuredAnswers,
        auditTrail: completedTrail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await saveTemplateInstance(caseId, instance)
      void recordAuditEvent('template_wizard_completed', {
        caseId,
        metadata: { templateId: template.id, instanceId },
      })
    }

    onComplete({
      fieldValues,
      structuredAnswers,
      instanceId,
      auditTrail: completedTrail,
    })
  }, [
    auditTrail,
    caseId,
    fieldValues,
    instanceId,
    onComplete,
    stepIndex,
    steps,
    template,
    totalSteps,
  ])

  const previewHtml = useMemo(() => {
    if (!previewOpen) return ''
    return renderTemplateDocumentHtml(template, fieldValues, context, { markUnresolved: !caseId })
  }, [caseId, context, fieldValues, previewOpen, template])

  if (loading || !currentStep) return null

  const stepFields = currentStep.fieldIds
    .map((id) => template.fields.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))

  const isLastStep = stepIndex >= totalSteps - 1

  return (
    <div className="dt-modal-overlay dt-wizard-overlay" role="dialog" aria-modal="true">
      <div className="dt-wizard-card">
        <header className="dt-wizard-card__header">
          <div>
            <p className="dt-wizard-card__progress">
              {t('templateWizardStepProgress')
                .replace('{current}', String(stepIndex + 1))
                .replace('{total}', String(totalSteps))}
            </p>
            <h2 className="dt-wizard-card__title">{currentStep.title}</h2>
            {currentStep.description ? (
              <p className="dt-wizard-card__desc">{currentStep.description}</p>
            ) : null}
          </div>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label={t('dokumenteClose')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="dt-wizard-card__body">
          {stepFields.map((field) => (
            <div key={field.id} className="dt-wizard-field">
              <WizardFieldInput
                field={field}
                value={fieldValues[field.id] ?? ''}
                onChange={(v) => handleFieldChange(field.id, v)}
              />
              {field.helperText ? <p className="dt-field-help">{field.helperText}</p> : null}
              {stepErrors.includes(field.id) ? (
                <p className="dt-field-error">{t('templateWizardRequiredError')}</p>
              ) : null}
            </div>
          ))}
        </div>

        {previewOpen ? (
          <div className="dt-wizard-preview">
            <A4PageView className="dt-a4-page--preview">
              <div className="dt-a4-page__inner" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </A4PageView>
          </div>
        ) : null}

        <footer className="dt-wizard-card__footer">
          <div className="dt-wizard-card__footer-left">
            <button
              type="button"
              className="dt-btn dt-btn--ghost"
              disabled={stepIndex === 0}
              onClick={goPrev}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateWizardPrevious')}
            </button>
          </div>
          <div className="dt-wizard-card__footer-center">
            {caseId ? (
              <button
                type="button"
                className="dt-btn dt-btn--ghost"
                disabled={saving}
                onClick={() => void persistDraft()}
              >
                <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('templateSaveDraft')}
              </button>
            ) : null}
            <button
              type="button"
              className="dt-btn dt-btn--ghost"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateWizardGeneratePreview')}
            </button>
            <button type="button" className="dt-btn dt-btn--ghost" onClick={onClose}>
              {t('templateWizardCancel')}
            </button>
          </div>
          <div className="dt-wizard-card__footer-right">
            {!isLastStep ? (
              <button type="button" className="dt-btn dt-btn--primary" onClick={goNext}>
                {t('templateWizardNext')}
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            ) : (
              <button type="button" className="dt-btn dt-btn--primary" onClick={() => void handleGenerate()}>
                {t('templateWizardGenerateDocument')}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

export type { GeneratedDocument }

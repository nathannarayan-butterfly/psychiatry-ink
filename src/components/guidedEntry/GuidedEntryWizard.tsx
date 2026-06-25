import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type {
  GuidedEntryAnswer,
  GuidedEntryFieldValues,
  GuidedEntrySchema,
} from '../../types/guidedEntry'
import {
  buildGuidedSteps,
  validateGuidedStep,
  type ResolvedGuidedStep,
} from '../../utils/guidedEntry/stepEngine'
import { generateGuidedNarrative } from '../../utils/guidedEntry/generateNarrative'
import { GuidedEntryFieldControl } from './GuidedEntryFieldControl'

export interface GuidedEntryWizardProps {
  open: boolean
  schema: GuidedEntrySchema
  caseId: string
  userId?: string
  initialValues?: GuidedEntryFieldValues
  initialStepIndex?: number
  initialGeneratedText?: string
  onSaveDraft: (payload: {
    values: GuidedEntryFieldValues
    stepIndex: number
    generatedText?: string
  }) => void | Promise<void>
  onGenerate: (payload: {
    text: string
    answers: GuidedEntryAnswer[]
    values: GuidedEntryFieldValues
  }) => void
  onCancel: () => void
}

export function GuidedEntryWizard({
  open,
  schema,
  caseId: _caseId,
  userId: _userId,
  initialValues = {},
  initialStepIndex = 0,
  initialGeneratedText = '',
  onSaveDraft,
  onGenerate,
  onCancel,
}: GuidedEntryWizardProps) {
  const { t, language } = useTranslation()
  const [values, setValues] = useState<GuidedEntryFieldValues>(initialValues)
  const [stepIndex, setStepIndex] = useState(initialStepIndex)
  const [reviewText, setReviewText] = useState(initialGeneratedText)
  const [showReview, setShowReview] = useState(Boolean(initialGeneratedText.trim()))
  const [errors, setErrors] = useState<string[]>([])
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(initialValues)
    setStepIndex(initialStepIndex)
    setReviewText(initialGeneratedText)
    setShowReview(Boolean(initialGeneratedText.trim()))
    setErrors([])
  }, [open, initialGeneratedText, initialStepIndex, initialValues])

  const steps = useMemo(() => buildGuidedSteps(schema, values), [schema, values])
  const totalSteps = steps.length
  const currentStep: ResolvedGuidedStep | undefined = steps[stepIndex]
  const progressLabel = showReview
    ? t('guidedEntryStepReview')
    : t('guidedEntryStepProgress')
        .replace('{current}', String(stepIndex + 1))
        .replace('{total}', String(totalSteps))

  const handleFieldChange = useCallback((fieldId: string, value: string | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setErrors([])
  }, [])

  const handleBack = useCallback(() => {
    if (showReview) {
      setShowReview(false)
      return
    }
    setStepIndex((i) => Math.max(0, i - 1))
    setErrors([])
  }, [showReview])

  const handleNext = useCallback(() => {
    if (showReview) return
    if (!currentStep) return
    const stepErrors = validateGuidedStep(currentStep, values)
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      return
    }
    if (stepIndex >= totalSteps - 1) {
      const { text } = generateGuidedNarrative(schema, values, language)
      setReviewText(text)
      setShowReview(true)
      return
    }
    setStepIndex((i) => i + 1)
  }, [currentStep, language, schema, showReview, stepIndex, totalSteps, values])

  const handleSaveDraft = useCallback(async () => {
    setSavingDraft(true)
    try {
      await onSaveDraft({
        values,
        stepIndex: showReview ? totalSteps : stepIndex,
        generatedText: reviewText || undefined,
      })
    } finally {
      setSavingDraft(false)
    }
  }, [onSaveDraft, reviewText, showReview, stepIndex, totalSteps, values])

  const handleGenerate = useCallback(() => {
    const text = reviewText.trim()
    if (!text) return
    const { answers } = generateGuidedNarrative(schema, values, language)
    onGenerate({ text, answers, values })
  }, [language, onGenerate, reviewText, schema, values])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, open])

  if (!open) return null

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ge-modal" onClick={(e) => e.stopPropagation()}>
        <header className="ge-modal__header">
          <div>
            <h2 className="ge-modal__title">{t(schema.titleKey as UiTranslationKey)}</h2>
            {schema.descriptionKey ? (
              <p className="ge-modal__desc">{t(schema.descriptionKey as UiTranslationKey)}</p>
            ) : null}
          </div>
          <button type="button" className="ge-icon-btn" onClick={onCancel} aria-label={t('guidedEntryCancel')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="ge-modal__progress" aria-live="polite">
          {progressLabel}
        </div>

        <div className="ge-modal__body">
          {showReview ? (
            <>
              <p className="ge-review-hint">{t('guidedEntryReviewHint')}</p>
              <textarea
                className="ge-textarea ge-textarea--review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={12}
                aria-label={t('guidedEntryReviewLabel')}
              />
            </>
          ) : currentStep ? (
            <>
              <h3 className="ge-step-title">{t(currentStep.titleKey as UiTranslationKey)}</h3>
              {currentStep.descriptionKey ? (
                <p className="ge-step-desc">{t(currentStep.descriptionKey as UiTranslationKey)}</p>
              ) : null}
              <div className="ge-fields">
                {currentStep.fields.map((field) => (
                  <GuidedEntryFieldControl
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    hasError={errors.includes(field.id)}
                    onChange={(v) => handleFieldChange(field.id, v)}
                  />
                ))}
              </div>
              {errors.length > 0 ? (
                <p className="ge-error" role="alert">
                  {t('guidedEntryRequiredHint')}
                </p>
              ) : null}
            </>
          ) : (
            <p className="ge-step-desc">{t('guidedEntryNoSteps')}</p>
          )}
        </div>

        <footer className="ge-modal__footer">
          <div className="ge-modal__footer-left">
            <button type="button" className="ge-btn ge-btn--ghost" onClick={onCancel}>
              {t('guidedEntryCancel')}
            </button>
            <button
              type="button"
              className="ge-btn ge-btn--ghost"
              onClick={() => void handleSaveDraft()}
              disabled={savingDraft}
            >
              {savingDraft ? t('guidedEntrySavingDraft') : t('guidedEntrySaveDraft')}
            </button>
          </div>
          <div className="ge-modal__footer-right">
            <button
              type="button"
              className="ge-btn ge-btn--ghost"
              onClick={handleBack}
              disabled={!showReview && stepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {t('guidedEntryBack')}
            </button>
            {showReview ? (
              <button type="button" className="ge-btn ge-btn--primary" onClick={handleGenerate}>
                {t('guidedEntryGenerate')}
              </button>
            ) : (
              <button type="button" className="ge-btn ge-btn--primary" onClick={handleNext}>
                {stepIndex >= totalSteps - 1 ? t('guidedEntryPreview') : t('guidedEntryNext')}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../../data/uiTranslations'
import type { GuidedEntrySchema } from '../../../../types/guidedEntry'
import { buildPrefilledValues } from '../../../../utils/guidedEntry/prefillResolver'
import {
  buildGuidedSteps,
  validateGuidedStep,
} from '../../../../utils/guidedEntry/stepEngine'
import { generateGuidedNarrative } from '../../../../utils/guidedEntry/generateNarrative'
import { GuidedEntryFieldControl } from '../../../guidedEntry/GuidedEntryFieldControl'
import { OverviewQuickActionShell } from './OverviewQuickActionShell'

export interface OverviewQuickGuidedModalProps {
  open: boolean
  caseId: string
  schema: GuidedEntrySchema
  userId?: string
  /** Secondary hint below the form (e.g. link to full workspace entry). */
  hint?: React.ReactNode
  onClose: () => void
  onSave: (payload: {
    text: string
    answers: import('../../../../types/guidedEntry').GuidedEntryAnswer[]
    instanceId: string
  }) => void
}

export function OverviewQuickGuidedModal({
  open,
  caseId,
  schema,
  userId: _userId,
  hint,
  onClose,
  onSave,
}: OverviewQuickGuidedModalProps) {
  const { t, language } = useTranslation()
  const [values, setValues] = useState<Record<string, string | boolean | string[]>>({})
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const instanceId = useMemo(() => crypto.randomUUID(), [])

  useEffect(() => {
    if (!open) return
    const { values: prefilled } = buildPrefilledValues(
      schema.fields.map((field) => ({ fieldId: field.id, prefillPath: field.prefillPath })),
      { caseId, language },
    )
    setValues(prefilled)
    setErrors(new Set())
    setSaving(false)
  }, [open, caseId, language, schema.fields])

  const steps = useMemo(() => buildGuidedSteps(schema, values), [schema, values])
  const visibleFields = useMemo(() => steps.flatMap((step) => step.fields), [steps])

  const handleFieldChange = useCallback((fieldId: string, value: string | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setErrors((prev) => {
      const next = new Set(prev)
      next.delete(fieldId)
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    const missing = new Set<string>()
    for (const step of steps) {
      for (const fieldId of validateGuidedStep(step, values)) {
        missing.add(fieldId)
      }
    }
    if (missing.size > 0) {
      setErrors(missing)
      return
    }

    setSaving(true)
    try {
      const { text, answers } = generateGuidedNarrative(schema, values, language)
      if (!text.trim()) {
        setSaving(false)
        return
      }
      onSave({
        text,
        answers,
        instanceId,
      })
    } finally {
      setSaving(false)
    }
  }, [instanceId, language, onSave, schema, steps, values])

  const footer = (
    <>
      <button type="button" className="ov-quick-btn ov-quick-btn--ghost" onClick={onClose}>
        {t('guidedEntryCancel')}
      </button>
      <button
        type="button"
        className="ov-quick-btn ov-quick-btn--primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? t('overviewQuickSaving') : t('overviewQuickSave')}
      </button>
    </>
  )

  return (
    <OverviewQuickActionShell
      open={open}
      title={t(schema.titleKey as UiTranslationKey)}
      description={
        schema.descriptionKey ? t(schema.descriptionKey as UiTranslationKey) : undefined
      }
      footer={footer}
      onClose={onClose}
    >
      <div className="ov-quick-form">
        {visibleFields.map((field) => (
          <GuidedEntryFieldControl
            key={field.id}
            field={field}
            value={values[field.id]}
            hasError={errors.has(field.id)}
            onChange={(value) => handleFieldChange(field.id, value)}
          />
        ))}
        {errors.size > 0 ? (
          <p className="ov-quick-form__error" role="alert">
            {t('guidedEntryRequiredHint')}
          </p>
        ) : null}
        {hint ? <p className="ov-quick-form__hint">{hint}</p> : null}
      </div>
    </OverviewQuickActionShell>
  )
}

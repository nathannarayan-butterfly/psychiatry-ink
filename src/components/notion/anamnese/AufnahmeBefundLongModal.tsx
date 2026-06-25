import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { GuidedEntryFieldValues } from '../../../types/guidedEntry'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { neuroBefundFields, somaticBefundFields } from '../../../data/guidedEntry/schemas/anamneseBefundFields'
import { buildGuidedSteps } from '../../../utils/guidedEntry/stepEngine'
import { GuidedEntryFieldControl } from '../../guidedEntry/GuidedEntryFieldControl'

export interface AufnahmeBefundLongModalProps {
  open: boolean
  sectionId: string
  initialValues: GuidedEntryFieldValues
  onClose: () => void
  onSave: (values: GuidedEntryFieldValues) => void
}

function guidedItemTypeForSection(sectionId: string): 'anamnese-somatic-befund' | 'anamnese-neuro-befund' {
  return sectionId === 'neurologischer-befund' ? 'anamnese-neuro-befund' : 'anamnese-somatic-befund'
}

export function AufnahmeBefundLongModal({
  open,
  sectionId,
  initialValues,
  onClose,
  onSave,
}: AufnahmeBefundLongModalProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<GuidedEntryFieldValues>(initialValues)

  const schema = useMemo(
    () => getGuidedEntrySchema(guidedItemTypeForSection(sectionId)),
    [sectionId],
  )

  const fields = sectionId === 'neurologischer-befund' ? neuroBefundFields : somaticBefundFields

  const steps = useMemo(() => buildGuidedSteps(schema, values), [schema, values])
  const visibleFields = useMemo(() => steps.flatMap((step) => step.fields), [steps])

  useEffect(() => {
    if (open) setValues(initialValues)
  }, [initialValues, open])

  if (!open) return null

  const titleKey =
    sectionId === 'neurologischer-befund'
      ? 'aufnahmeBefundNeuroLongTitle'
      : 'aufnahmeBefundSomaticLongTitle'

  return (
    <div className="aufnahme-befund-overlay" role="presentation" onClick={onClose}>
      <div
        className="aufnahme-befund-modal aufnahme-befund-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aufnahme-befund-long-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="aufnahme-befund-modal__header">
          <div>
            <h2 id="aufnahme-befund-long-title" className="aufnahme-befund-modal__title">
              {t(titleKey)}
            </h2>
            <p className="aufnahme-befund-modal__desc">{t('aufnahmeBefundLongDesc')}</p>
          </div>
          <button type="button" className="aufnahme-befund-modal__close" onClick={onClose} aria-label={t('guidedEntryCancel')}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="aufnahme-befund-modal__body aufnahme-befund-modal__body--scroll">
          <div className="aufnahme-befund-long-grid">
            {fields.map((field) => {
              const resolved = visibleFields.find((item) => item.id === field.id)
              if (!resolved) return null
              return (
                <GuidedEntryFieldControl
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
                />
              )
            })}
          </div>
        </div>
        <footer className="aufnahme-befund-modal__footer">
          <button type="button" className="aufnahme-befund-btn aufnahme-befund-btn--ghost" onClick={onClose}>
            {t('guidedEntryCancel')}
          </button>
          <button
            type="button"
            className="aufnahme-befund-btn aufnahme-befund-btn--primary"
            onClick={() => onSave(values)}
          >
            {t('aufnahmeBefundLongGenerate')}
          </button>
        </footer>
      </div>
    </div>
  )
}

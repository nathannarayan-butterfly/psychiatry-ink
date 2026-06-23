import { useMemo, useRef, useState } from 'react'
import { Check, Loader2, Sparkles, Eye, EyeOff, RotateCcw, Pencil } from 'lucide-react'
import type { MedicationEducationSectionState } from '../../types/medicationEducation'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'

interface PatientEducationGenericSectionCardProps {
  label: string
  aiCapable: boolean
  section: MedicationEducationSectionState
  onChange: (content: string) => void
  onGenerate: () => void
  onAccept: () => void
  onRevert: () => void
  onToggleIncluded: () => void
  generating: boolean
}

function formatEditedAt(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function PatientEducationGenericSectionCard({
  label,
  aiCapable,
  section,
  onChange,
  onGenerate,
  onAccept,
  onRevert,
  onToggleIncluded,
  generating,
}: PatientEducationGenericSectionCardProps) {
  const { language } = useTranslation()
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const needsReview = section.status === 'ai_generated'
  const hasContent = section.currentContent.trim().length > 0
  const showAccept = needsReview && hasContent
  const isAccepted = section.status === 'accepted'
  const isClinicianEdited = section.status === 'clinician_edited'

  const statusLabel = translateMedicationUi(language, `medEducationStatus_${section.status}` as never)

  const editedMeta = useMemo(() => {
    if (!section.clinicianEditedAt) return null
    const template = translateMedicationUi(language, 'medEducationClinicianEditedAt')
    return template.replace('{date}', formatEditedAt(section.clinicianEditedAt, language))
  }, [language, section.clinicianEditedAt])

  const contentRows = Math.max(3, section.currentContent.split('\n').length + 1)

  const startEditing = () => {
    setEditing(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <article
      className={`medication-education-section${needsReview ? ' medication-education-section--pending' : ''}${isAccepted ? ' medication-education-section--accepted' : ''}${isClinicianEdited ? ' medication-education-section--edited' : ''}${!section.included ? ' medication-education-section--excluded' : ''}`}
    >
      <header className="medication-education-section__header">
        <div className="medication-education-section__title-block">
          <h3 className="medication-education-section__title">{label}</h3>
          <div className="medication-education-section__meta">
            <span
              className={`medication-education-section__status medication-education-section__status--${section.status}`}
            >
              {statusLabel}
            </span>
            {editedMeta ? (
              <span className="medication-education-section__edited-at">{editedMeta}</span>
            ) : null}
          </div>
        </div>
        <div className="medication-education-section__actions">
          <button
            type="button"
            className="icon-action-btn icon-action-btn--bordered"
            onClick={startEditing}
            title={translateMedicationUi(language, 'medEducationEditSection')}
            aria-label={translateMedicationUi(language, 'medEducationEditSection')}
            aria-pressed={editing}
          >
            <Pencil size={15} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--bordered"
            onClick={onToggleIncluded}
            title={translateMedicationUi(language, 'medEducationToggleInclude')}
            aria-label={translateMedicationUi(language, 'medEducationToggleInclude')}
          >
            {section.included ? (
              <Eye size={15} strokeWidth={1.75} aria-hidden />
            ) : (
              <EyeOff size={15} strokeWidth={1.75} aria-hidden />
            )}
          </button>
          {aiCapable ? (
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              disabled={generating}
              onClick={onGenerate}
              title={translateMedicationUi(language, 'medEducationGenerate')}
              aria-label={translateMedicationUi(language, 'medEducationGenerate')}
            >
              {generating ? (
                <Loader2 size={15} className="spin" aria-hidden />
              ) : (
                <Sparkles size={15} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          ) : null}
          {section.previousContent ? (
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              onClick={onRevert}
              title={translateMedicationUi(language, 'medEducationRevert')}
              aria-label={translateMedicationUi(language, 'medEducationRevert')}
            >
              <RotateCcw size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          {showAccept ? (
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered icon-action-btn--success"
              onClick={onAccept}
              title={translateMedicationUi(language, 'medEducationAccept')}
              aria-label={translateMedicationUi(language, 'medEducationAccept')}
            >
              <Check size={15} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      <div className="medication-education-section__body">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="medication-education-section__textarea"
            value={section.currentContent}
            onChange={(e) => onChange(e.target.value)}
            rows={contentRows}
            placeholder={translateMedicationUi(language, 'medEducationSectionPlaceholder')}
            aria-label={label}
          />
        ) : hasContent ? (
          <div className="medication-education-section__content" aria-label={label}>
            {section.currentContent}
          </div>
        ) : (
          <p className="medication-education-section__empty">
            {translateMedicationUi(language, 'medEducationSectionPlaceholder')}
          </p>
        )}
      </div>
    </article>
  )
}

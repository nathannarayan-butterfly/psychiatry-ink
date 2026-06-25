import { useState } from 'react'
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react'
import type { MedicationEducationReference } from '../../types/medicationEducation'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'

interface MedicationEducationReferencesPanelProps {
  references: MedicationEducationReference[]
  sectionLabels?: Record<string, string>
}

export function MedicationEducationReferencesPanel({
  references,
  sectionLabels = {},
}: MedicationEducationReferencesPanelProps) {
  const { language } = useTranslation()
  const [open, setOpen] = useState(true)
  const countLabel = translateMedicationUi(language, 'medEducationReferencesCount').replace(
    '{count}',
    String(references.length),
  )

  return (
    <section className="medication-education-references" aria-label={translateMedicationUi(language, 'medEducationReferencesTitle')}>
      <button
        type="button"
        className="medication-education-references__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="medication-education-references__toggle-mark">
          <BookOpen size={15} aria-hidden />
        </span>
        <span className="medication-education-references__toggle-text">
          <span className="medication-education-references__title">
            {translateMedicationUi(language, 'medEducationReferencesTitle')}
          </span>
          <span className="medication-education-references__count">{countLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={`medication-education-references__chevron${open ? ' medication-education-references__chevron--open' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="medication-education-references__body">
          <p className="medication-education-references__hint">
            {translateMedicationUi(language, 'medEducationReferencesHint')}
          </p>

          {references.length === 0 ? (
            <p className="medication-education-references__empty">
              {translateMedicationUi(language, 'medEducationReferencesEmpty')}
            </p>
          ) : (
            <ol className="medication-education-references__list">
              {references.map((ref, index) => {
                const sectionLabel = ref.sectionId ? sectionLabels[ref.sectionId] : undefined
                return (
                  <li key={`${ref.title}-${index}`} className="medication-education-references__item">
                    <span className="medication-education-references__index">{index + 1}.</span>
                    <div className="medication-education-references__content">
                      {ref.url ? (
                        <a
                          href={ref.url}
                          className="medication-education-references__link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ref.title}
                          <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : (
                        <span className="medication-education-references__title-text">{ref.title}</span>
                      )}
                      {ref.source ? (
                        <span className="medication-education-references__source">{ref.source}</span>
                      ) : null}
                      {sectionLabel ? (
                        <span className="medication-education-references__section">
                          {sectionLabel}
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  )
}

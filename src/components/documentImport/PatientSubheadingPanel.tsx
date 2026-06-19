import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { OverviewSuggestionStatus } from './OverviewSuggestionsPanel'

interface PatientSubheadingPanelProps {
  subheading: string
  status: OverviewSuggestionStatus
  onToggle: (status: OverviewSuggestionStatus) => void
}

export function PatientSubheadingPanel({ subheading, status, onToggle }: PatientSubheadingPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="doc-import-overview-suggestions doc-import-patient-subheading" aria-labelledby="doc-import-subheading-heading">
      <div className="doc-import-overview-suggestions__header">
        <h3 id="doc-import-subheading-heading" className="doc-import-overview-suggestions__title">
          <Sparkles className="doc-import-overview-suggestions__icon" aria-hidden strokeWidth={1.75} />
          {t('documentImportPatientSubheadingHeading')}
        </h3>
      </div>
      <p className="doc-import-overview-suggestions__hint">{t('documentImportPatientSubheadingHint')}</p>
      <div className="doc-import-overview-suggestions__item doc-import-patient-subheading__item">
        <p className="doc-import-patient-subheading__text">{subheading}</p>
        <div className="doc-import-overview-suggestions__actions">
          <button
            type="button"
            className={`doc-import-chip ${status === 'accepted' ? 'doc-import-chip--accepted' : ''}`}
            onClick={() => onToggle(status === 'accepted' ? 'pending' : 'accepted')}
          >
            {t('documentImportAccept')}
          </button>
          <button
            type="button"
            className={`doc-import-chip ${status === 'rejected' ? 'doc-import-chip--rejected' : ''}`}
            onClick={() => onToggle(status === 'rejected' ? 'pending' : 'rejected')}
          >
            {t('documentImportReject')}
          </button>
        </div>
      </div>
    </section>
  )
}

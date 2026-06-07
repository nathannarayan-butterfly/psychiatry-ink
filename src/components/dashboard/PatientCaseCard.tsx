import { FileText } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { DashboardCase } from '../../hooks/useCaseRegistry'

import { formatSiteLocaleDate } from '../../utils/siteTimezone'

interface PatientCaseCardProps {
  caseItem: DashboardCase
  onOpen: (caseId: string) => void
}

function formatRelativeDate(iso: string, locale: string): string {
  return formatSiteLocaleDate(iso, locale)
}

function formatLocalDate(isoDate: string, locale: string): string {
  return formatSiteLocaleDate(isoDate, locale)
}

export function PatientCaseCard({ caseItem, onOpen }: PatientCaseCardProps) {
  const { t, language } = useTranslation()

  return (
    <button
      type="button"
      className="patient-case-card"
      onClick={() => onOpen(caseItem.caseId)}
      aria-label={t('dashboardOpenCase').replace('{title}', caseItem.displayTitle)}
    >
      <div className="patient-case-card__header">
        <FileText className="patient-case-card__icon" strokeWidth={1.5} aria-hidden />
        <h3 className="patient-case-card__title">{caseItem.displayTitle}</h3>
      </div>

      {caseItem.documentTypeSummary ? (
        <p className="patient-case-card__doc-type">{caseItem.documentTypeSummary}</p>
      ) : null}

      {caseItem.timelineCount || caseItem.labGraphCount ? (
        <p className="patient-case-card__counts">
          {caseItem.timelineCount
            ? t('dashboardTimelineCount').replace('{count}', String(caseItem.timelineCount))
            : null}
          {caseItem.timelineCount && caseItem.labGraphCount ? ' · ' : null}
          {caseItem.labGraphCount
            ? t('dashboardLabGraphCount').replace('{count}', String(caseItem.labGraphCount))
            : null}
        </p>
      ) : null}

      <p className="patient-case-card__meta">
        {t('dashboardLastEdited')}: {formatRelativeDate(caseItem.lastEditedAt, language)}
      </p>

      {caseItem.localAge ? (
        <p className="patient-case-card__local-meta">
          {t('patientAgeLabel')}: {caseItem.localAge}
        </p>
      ) : null}

      {caseItem.localGeburtsdatum ? (
        <p className="patient-case-card__local-meta">
          {t('patientFieldGeburtsdatum')}: {formatLocalDate(caseItem.localGeburtsdatum, language)}
          <span className="patient-case-card__local-badge"> ({t('patientFieldLocalOnly')})</span>
        </p>
      ) : null}

      {caseItem.localName ? (
        <p className="patient-case-card__local-hint">{t('dashboardLocalNameHint')}</p>
      ) : null}
    </button>
  )
}

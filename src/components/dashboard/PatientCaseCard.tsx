import { FileText } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import type { CaseClinicalStats } from '../../utils/dashboardCaseStats'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'

interface PatientCaseCardProps {
  caseItem: DashboardCase
  clinicalStats?: CaseClinicalStats
  onOpen: (caseId: string) => void
}

function formatLocalDate(isoDate: string, locale: string): string {
  return formatSiteLocaleDate(isoDate, locale)
}

export function PatientCaseCard({ caseItem, clinicalStats, onOpen }: PatientCaseCardProps) {
  const { t, language } = useTranslation()
  const genderLabel =
    caseItem.localGeschlecht === 'maennlich'
      ? t('patientGeschlechtMaennlich')
      : caseItem.localGeschlecht === 'weiblich'
        ? t('patientGeschlechtWeiblich')
        : caseItem.localGeschlecht === 'divers'
          ? t('patientGeschlechtDivers')
          : null
  const patientDetails = [
    caseItem.localGeburtsdatum
      ? `${t('patientFieldGeburtsdatum')}: ${formatLocalDate(caseItem.localGeburtsdatum, language)}`
      : null,
    genderLabel,
  ].filter(Boolean)

  const statChips = clinicalStats
    ? [
        clinicalStats.diagnoses > 0
          ? t('dashboardStatChipDiagnoses').replace('{count}', String(clinicalStats.diagnoses))
          : null,
        clinicalStats.documents > 0
          ? t('dashboardStatChipDocuments').replace('{count}', String(clinicalStats.documents))
          : null,
        clinicalStats.verlauf > 0
          ? t('dashboardStatChipVerlauf').replace('{count}', String(clinicalStats.verlauf))
          : null,
        clinicalStats.labor > 0
          ? t('dashboardStatChipLabor').replace('{count}', String(clinicalStats.labor))
          : null,
      ].filter(Boolean)
    : []

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

      {patientDetails.length > 0 ? (
        <p className="patient-case-card__details">{patientDetails.join(' · ')}</p>
      ) : null}

      {caseItem.documentTypeSummary ? (
        <p className="patient-case-card__doc-type">{caseItem.documentTypeSummary}</p>
      ) : null}

      {statChips.length > 0 ? (
        <div className="patient-case-card__chips" aria-label={t('dashboardClinicalOverview')}>
          {statChips.map((chip) => (
            <span key={chip} className="patient-case-card__chip">
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <p className="patient-case-card__meta">
        {t('dashboardLastOpened')}: {formatSiteLocaleDate(caseItem.lastEditedAt, language)}
      </p>

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

      {caseItem.localName || caseItem.localVorname || caseItem.localNachname ? (
        <p className="patient-case-card__local-hint">{t('dashboardLocalNameHint')}</p>
      ) : null}
    </button>
  )
}

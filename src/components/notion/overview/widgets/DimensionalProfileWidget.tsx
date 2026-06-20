import { useTranslation } from '../../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../../hooks/useClinicalIntelligence'
import { summarizeDimensional } from '../../../../services/clinicalIntelligence/dimensionalIntegration'
import { OverviewCardShell } from '../OverviewCard'
import { ClinicalEyebrow } from '../../../clinical/ClinicalEyebrow'
import { CiHypothesisBanner } from '../../../clinical/clinicalIntelligence/CiHypothesisBanner'

interface DimensionalProfileWidgetProps {
  caseId: string
  onOpenSection?: () => void
}

export function DimensionalProfileWidget({
  caseId,
  onOpenSection,
}: DimensionalProfileWidgetProps) {
  const { t } = useTranslation()
  const ci = useClinicalIntelligence(caseId)
  const stats = summarizeDimensional(ci.latestRun?.dimensional ?? null)

  return (
    <OverviewCardShell>
      <ClinicalEyebrow inline>{t('overviewWidgetCiDimensional')}</ClinicalEyebrow>
      <CiHypothesisBanner compact />
      {!ci.latestRun ? (
        <p className="ci-widget__empty">{t('ciNoRunYet')}</p>
      ) : (
        <div className="ci-widget">
          <p className="ci-widget__meta">
            {t('ciWidgetActiveCount')}: <strong>{stats.activeCount}</strong> · {' '}
            {t('ciWidgetMaxSeverity')}: <strong>{stats.maxSeverity}/4</strong>
          </p>
          {stats.topDimensions.length > 0 ? (
            <ul className="ci-list ci-list--exploratory">
              {stats.topDimensions.map((dim) => (
                <li key={dim.dimensionId} className="ci-widget__row ci-widget__row--top">
                  <span>{dim.dimensionName}</span>
                  <span className={`ci-widget__pill ci-widget__pill--${dim.confidence}`}>
                    {dim.severity}/4
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ci-widget__empty">{t('ciNoActiveDimensions')}</p>
          )}
          <div className="ci-widget__counts">
            <span className="ci-widget__pill ci-widget__pill--high">
              {t('ciConfidenceHigh')}: {stats.confidenceCounts.high}
            </span>
            <span className="ci-widget__pill ci-widget__pill--moderate">
              {t('ciConfidenceModerate')}: {stats.confidenceCounts.moderate}
            </span>
            <span className="ci-widget__pill ci-widget__pill--low">
              {t('ciConfidenceLow')}: {stats.confidenceCounts.low}
            </span>
          </div>
          <p className="ci-widget__meta">
            {t('ciStatusAccepted')}: {stats.acceptedCount + stats.editedCount} · {' '}
            {t('ciStatusPending')}: {stats.pendingCount} · {' '}
            {t('ciWidgetMissingDataLabel')}: {stats.missingDataCount}
          </p>
          {onOpenSection ? (
            <button type="button" className="ci-widget__open" onClick={onOpenSection}>
              {t('ciOpenSection')} →
            </button>
          ) : null}
        </div>
      )}
    </OverviewCardShell>
  )
}

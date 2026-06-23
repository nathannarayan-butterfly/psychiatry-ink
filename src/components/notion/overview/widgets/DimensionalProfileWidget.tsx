import { useTranslation } from '../../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../../hooks/useClinicalIntelligence'
import { summarizeDimensional } from '../../../../services/clinicalIntelligence/dimensionalIntegration'
import { getCiDimensionLabel } from '../../../../data/clinicalIntelligenceTranslations'
import { OverviewCardShell } from '../OverviewCard'
import { ClinicalEyebrow } from '../../../clinical/ClinicalEyebrow'
import { CiHypothesisBanner } from '../../../clinical/clinicalIntelligence/CiHypothesisBanner'
import { CiStatusCountRow } from '../../../clinical/clinicalIntelligence/CiStatusCountRow'
import { CiBarChart } from './CiBarChart'

interface DimensionalProfileWidgetProps {
  caseId: string
  onOpenSection?: () => void
}

export function DimensionalProfileWidget({
  caseId,
  onOpenSection,
}: DimensionalProfileWidgetProps) {
  const { t, language } = useTranslation()
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
            <CiBarChart
              ariaLabel={t('overviewWidgetCiDimensional')}
              items={stats.topDimensions.map((dim) => ({
                id: dim.dimensionId,
                label: getCiDimensionLabel(dim.dimensionId, language),
                valueLabel: `${dim.severity}/4`,
                fraction: dim.severity / 4,
                fillColor: `var(--ci-severity-${dim.severity})`,
              }))}
            />
          ) : (
            <p className="ci-widget__empty">{t('ciNoActiveDimensions')}</p>
          )}
          <CiStatusCountRow
            accepted={stats.acceptedCount + stats.editedCount}
            pending={stats.pendingCount}
            rejected={ci.state.rejectedDimensionIds.length}
          />
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

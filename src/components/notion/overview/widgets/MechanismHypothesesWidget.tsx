import { useTranslation } from '../../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../../hooks/useClinicalIntelligence'
import { summarizeMechanisms } from '../../../../services/clinicalIntelligence/mechanismInference'
import { summarizeDimensional } from '../../../../services/clinicalIntelligence/dimensionalIntegration'
import { getCiMechanismLabel } from '../../../../data/clinicalIntelligenceTranslations'
import { OverviewCardShell } from '../OverviewCard'
import { ClinicalEyebrow } from '../../../clinical/ClinicalEyebrow'
import { CiHypothesisBanner } from '../../../clinical/clinicalIntelligence/CiHypothesisBanner'
import { CiStatusCountRow } from '../../../clinical/clinicalIntelligence/CiStatusCountRow'
import { CiBarChart } from './CiBarChart'

/** Bar length per confidence tier — mirrors the full Mechanism graph. */
const CONFIDENCE_FRACTION: Record<'low' | 'moderate' | 'high', number> = {
  low: 1 / 3,
  moderate: 2 / 3,
  high: 1,
}

interface MechanismHypothesesWidgetProps {
  caseId: string
  onOpenSection?: () => void
}

export function MechanismHypothesesWidget({
  caseId,
  onOpenSection,
}: MechanismHypothesesWidgetProps) {
  const { t, language } = useTranslation()
  const ci = useClinicalIntelligence(caseId)
  const stats = summarizeMechanisms(
    ci.latestRun?.mechanism ?? null,
    ci.state.rejectedMechanismIds.length,
  )
  const dimStats = summarizeDimensional(ci.latestRun?.dimensional ?? null)
  const dominantIds = new Set(dimStats.topDimensions.map((d) => d.dimensionId))

  return (
    <OverviewCardShell>
      <ClinicalEyebrow inline>{t('overviewWidgetCiMechanism')}</ClinicalEyebrow>
      <CiHypothesisBanner compact />
      {!ci.latestRun ? (
        <p className="ci-widget__empty">{t('ciNoRunYet')}</p>
      ) : (
        <div className="ci-widget">
          <p className="ci-widget__meta">
            {t('ciWidgetActiveCount')}: <strong>{stats.activeCount}</strong> · {' '}
            {t('ciConfidenceHigh')}: <strong>{stats.confidenceCounts.high}</strong>
          </p>
          {stats.topMechanisms.length === 0 ? (
            <p className="ci-widget__empty">{t('ciNoActiveMechanisms')}</p>
          ) : (
            <CiBarChart
              ariaLabel={t('overviewWidgetCiMechanism')}
              items={stats.topMechanisms.map((m) => {
                const linkedDominant = m.linkedDimensions.filter((id) => dominantIds.has(id))
                const confidenceLabel =
                  m.confidence === 'low'
                    ? t('ciConfidenceLow')
                    : m.confidence === 'moderate'
                      ? t('ciConfidenceModerate')
                      : t('ciConfidenceHigh')
                return {
                  id: m.mechanismId,
                  label: getCiMechanismLabel(m.mechanismId, language),
                  valueLabel:
                    linkedDominant.length > 0
                      ? `${confidenceLabel} · ↳${linkedDominant.length}`
                      : confidenceLabel,
                  fraction: CONFIDENCE_FRACTION[m.confidence],
                  fillColor: `var(--ci-confidence-${m.confidence})`,
                }
              })}
            />
          )}
          {stats.hasOnlyExploratory ? (
            <p className="ci-widget__warning">{t('ciMechanismOnlyExploratoryWarning')}</p>
          ) : null}
          <CiStatusCountRow
            accepted={stats.acceptedCount + stats.editedCount}
            pending={stats.pendingCount}
            rejected={stats.rejectedCount}
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

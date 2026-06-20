import { useTranslation } from '../../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../../hooks/useClinicalIntelligence'
import { summarizeMechanisms } from '../../../../services/clinicalIntelligence/mechanismInference'
import { summarizeDimensional } from '../../../../services/clinicalIntelligence/dimensionalIntegration'
import { OverviewCardShell } from '../OverviewCard'
import { ClinicalEyebrow } from '../../../clinical/ClinicalEyebrow'
import { CiHypothesisBanner } from '../../../clinical/clinicalIntelligence/CiHypothesisBanner'
import { CiStatusCountRow } from '../../../clinical/clinicalIntelligence/CiStatusCountRow'

interface MechanismHypothesesWidgetProps {
  caseId: string
  onOpenSection?: () => void
}

export function MechanismHypothesesWidget({
  caseId,
  onOpenSection,
}: MechanismHypothesesWidgetProps) {
  const { t } = useTranslation()
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
          {stats.topMechanisms.length === 0 ? (
            <p className="ci-widget__empty">{t('ciNoActiveMechanisms')}</p>
          ) : (
            <ul className="ci-list ci-list--exploratory">
              {stats.topMechanisms.map((m) => {
                const linkedDominant = m.linkedDimensions.filter((id) => dominantIds.has(id))
                return (
                  <li key={m.mechanismId} className="ci-widget__row ci-widget__row--top">
                    <span>{m.label}</span>
                    <span className={`ci-widget__pill ci-widget__pill--${m.confidence}`}>
                      {m.confidence === 'low'
                        ? t('ciConfidenceLow')
                        : m.confidence === 'moderate'
                          ? t('ciConfidenceModerate')
                          : t('ciConfidenceHigh')}
                    </span>
                    {linkedDominant.length > 0 ? (
                      <span className="ci-widget__pill">
                        ↳ {linkedDominant.length}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
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

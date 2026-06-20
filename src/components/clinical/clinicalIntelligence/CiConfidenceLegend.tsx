/**
 * Compact inline confidence colour ramp for mechanism hypothesis bars.
 */
import { useTranslation } from '../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { CI_CONFIDENCE_LEGEND_VALUES } from '../../../utils/clinicalIntelligence/severityGraph'

const CONFIDENCE_LABEL_KEY: Record<
  (typeof CI_CONFIDENCE_LEGEND_VALUES)[number],
  UiTranslationKey
> = {
  low: 'ciConfidenceLowShort',
  moderate: 'ciConfidenceModerateShort',
  high: 'ciConfidenceHighShort',
}

export function CiConfidenceLegend() {
  const { t } = useTranslation()

  return (
    <div className="ci-graph__legend" aria-label={t('ciGraphConfidenceLegendAria')}>
      <span className="ci-graph__legend-label">{t('ciConfidenceLabel')}</span>
      <ol className="ci-graph__legend-scale">
        {CI_CONFIDENCE_LEGEND_VALUES.map((level) => (
          <li key={level} className="ci-graph__legend-item">
            <span
              className={`ci-graph__legend-swatch ci-graph__legend-swatch--conf-${level}`}
              aria-hidden
            />
            <span className="ci-graph__legend-num">{t(CONFIDENCE_LABEL_KEY[level])}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

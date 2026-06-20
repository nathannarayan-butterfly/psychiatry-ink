/**
 * Compact inline severity colour ramp for CI bar graphs (0–4).
 */
import { useTranslation } from '../../../context/TranslationContext'
import { CI_SEVERITY_LEGEND_VALUES } from '../../../utils/clinicalIntelligence/severityGraph'

export function CiSeverityLegend() {
  const { t } = useTranslation()

  return (
    <div className="ci-graph__legend" aria-label={t('ciGraphSeverityLegendAria')}>
      <span className="ci-graph__legend-label">{t('ciSeverityLabel')}</span>
      <ol className="ci-graph__legend-scale">
        {CI_SEVERITY_LEGEND_VALUES.map((level) => (
          <li key={level} className="ci-graph__legend-item">
            <span
              className={`ci-graph__legend-swatch ci-graph__legend-swatch--sev-${level}`}
              aria-hidden
            />
            <span className="ci-graph__legend-num">{level}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

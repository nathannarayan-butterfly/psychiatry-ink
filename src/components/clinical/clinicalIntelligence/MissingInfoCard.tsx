import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEmpty } from '../ClinicalSection'
import type {
  DimensionalIntegrationResult,
  MechanismInferenceResult,
} from '../../../types/clinicalIntelligence'

interface MissingInfoCardProps {
  dimensionalResult: DimensionalIntegrationResult
  mechanismResult: MechanismInferenceResult
}

interface MissingItem {
  key: string
  scope: string
  title: string
  detail: string
}

/**
 * Aggregates per-finding "missing data" and "uncertainty" fields into a flat
 * review list. Body-only — section chrome (header + collapse) is provided by
 * the parent panel.
 */
export function MissingInfoCard({ dimensionalResult, mechanismResult }: MissingInfoCardProps) {
  const { t } = useTranslation()

  const items: MissingItem[] = []

  for (const f of dimensionalResult.activeDimensions) {
    if (f.missingData.trim()) {
      items.push({
        key: `dim-md-${f.dimensionId}`,
        scope: f.dimensionName,
        title: t('ciMissingDataLabel'),
        detail: f.missingData,
      })
    }
    if (f.uncertainty.trim()) {
      items.push({
        key: `dim-un-${f.dimensionId}`,
        scope: f.dimensionName,
        title: t('ciUncertaintyLabel'),
        detail: f.uncertainty,
      })
    }
  }

  for (const m of mechanismResult.activeMechanisms) {
    if (m.uncertainty.trim()) {
      items.push({
        key: `mech-un-${m.mechanismId}`,
        scope: m.label,
        title: t('ciUncertaintyLabel'),
        detail: m.uncertainty,
      })
    }
  }

  if (items.length === 0) {
    return <ClinicalEmpty>{t('ciMissingEmpty')}</ClinicalEmpty>
  }

  return (
    <ul className="ci-list">
      {items.map((item) => (
        <li key={item.key} className="ci-row ci-row--missing">
          <p className="ci-row__title">{item.scope}</p>
          <p className="ci-row__meta">
            <span className="ci-row__meta-label">{item.title}:</span> {item.detail}
          </p>
        </li>
      ))}
    </ul>
  )
}

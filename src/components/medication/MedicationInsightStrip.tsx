import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationEntry } from '../../types/medicationPlan'
import { computeMedicationInsights } from '../../utils/medication/medicationInsights'

interface MedicationInsightStripProps {
  medications: MedicationEntry[]
}

const MAX_RECEPTORS = 6
const MAX_SIDE_EFFECTS = 5

/**
 * Intelligent clinical-analysis summary shown at the top of the Medikation
 * plan. Every figure is derived (see `computeMedicationInsights`) from the
 * patient's plan/history and the local psychopharmacology reference — no
 * fabricated clinical facts; unavailable insights degrade to an em dash.
 */
export function MedicationInsightStrip({ medications }: MedicationInsightStripProps) {
  const { language } = useTranslation()
  const insights = useMemo(
    () => computeMedicationInsights(medications, language),
    [medications, language],
  )

  const lastModified = useMemo(() => {
    if (!insights.lastModifiedAt) return '—'
    const locale = language === 'de' ? 'de-DE' : language
    return new Date(insights.lastModifiedAt).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [insights.lastModifiedAt, language])

  const classesLabel =
    insights.activeClasses.length > 0
      ? insights.activeClasses.map((c) => (c.count > 1 ? `${c.count}× ${c.label}` : c.label)).join(' · ')
      : '—'

  const receptors = insights.targetedReceptors.slice(0, MAX_RECEPTORS)
  const sideEffects = insights.keySideEffects.slice(0, MAX_SIDE_EFFECTS)

  return (
    <section
      className="medication-insights"
      aria-label={translateMedicationUi(language, 'medInsightsHeading')}
    >
      <div className="medication-insight medication-insight--metric">
        <span className="medication-insight__label">
          {translateMedicationUi(language, 'medInsightActive')}
        </span>
        <span className="medication-insight__value">{insights.activeCount}</span>
        <span className="medication-insight__detail" title={classesLabel}>
          {classesLabel}
        </span>
      </div>

      <div className="medication-insight medication-insight--metric">
        <span className="medication-insight__label">
          {translateMedicationUi(language, 'medInsightTried')}
        </span>
        <span className="medication-insight__value">{insights.triedAntipsychotics.length}</span>
        <span
          className="medication-insight__detail"
          title={insights.triedAntipsychotics.join(', ')}
        >
          {insights.triedAntipsychotics.length > 0
            ? insights.triedAntipsychotics.join(', ')
            : translateMedicationUi(language, 'medInsightNone')}
        </span>
      </div>

      <div className="medication-insight medication-insight--metric">
        <span className="medication-insight__label">
          {translateMedicationUi(language, 'medInsightLastModified')}
        </span>
        <span className="medication-insight__value medication-insight__value--date">
          {lastModified}
        </span>
        <span
          className="medication-insight__detail"
          title={insights.lastModifiedSubstances.join(', ')}
        >
          {insights.lastModifiedSubstances.length > 0
            ? insights.lastModifiedSubstances.join(', ')
            : '—'}
        </span>
      </div>

      <div className="medication-insight medication-insight--chips">
        <span className="medication-insight__label">
          {translateMedicationUi(language, 'medInsightReceptors')}
        </span>
        {receptors.length > 0 ? (
          <div className="medication-insight__chips">
            {receptors.map((receptor) => (
              <span
                key={receptor.key}
                className={`medication-insight__chip${receptor.maxScore >= 4 ? ' medication-insight__chip--strong' : ''}`}
                title={`${receptor.label} · ${receptor.count}`}
              >
                {receptor.label}
                {receptor.count > 1 ? <em> ×{receptor.count}</em> : null}
              </span>
            ))}
          </div>
        ) : (
          <span className="medication-insight__empty">—</span>
        )}
      </div>

      <div className="medication-insight medication-insight--chips">
        <span className="medication-insight__label">
          {translateMedicationUi(language, 'medInsightSideEffects')}
        </span>
        {sideEffects.length > 0 ? (
          <div className="medication-insight__chips">
            {sideEffects.map((effect) => (
              <span
                key={effect.label}
                className={`medication-insight__chip${effect.count > 1 ? ' medication-insight__chip--shared' : ''}`}
                title={effect.count > 1 ? `${effect.label} · ${effect.count}×` : effect.label}
              >
                {effect.label}
                {effect.count > 1 ? <em> ×{effect.count}</em> : null}
              </span>
            ))}
          </div>
        ) : (
          <span className="medication-insight__empty">—</span>
        )}
      </div>
    </section>
  )
}

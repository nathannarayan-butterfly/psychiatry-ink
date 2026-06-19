import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { DEFAULT_MEDICATIONS_COLLECTION_ID } from '../../types/knowledgeBase'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import type { MedicationEntry } from '../../types/medicationPlan'
import { computeMedicationInsights } from '../../utils/medication/medicationInsights'
import { activeMedications } from '../../utils/medication/planOps'
import {
  resolveReceptorProfiles,
  resolveZielrezeptorenDisplay,
} from '../../utils/medication/receptorBurden'

interface MedicationInsightStripProps {
  medications: MedicationEntry[]
  curatedTargetReceptors: string[] | undefined
}

const MAX_SIDE_EFFECTS = 5
const MAX_RECEPTOR_CHIPS = 8

/**
 * Intelligent clinical-analysis summary shown at the top of the Medikation
 * plan. Every figure is derived (see `computeMedicationInsights`) from the
 * patient's plan/history and the local psychopharmacology reference — no
 * fabricated clinical facts; unavailable insights degrade to an em dash.
 */
export function MedicationInsightStrip({
  medications,
  curatedTargetReceptors,
}: MedicationInsightStripProps) {
  const { language } = useTranslation()
  const { drugs: knowledgeBaseDrugs } = useKnowledgeBaseDrugs(DEFAULT_MEDICATIONS_COLLECTION_ID)
  const insights = useMemo(
    () => computeMedicationInsights(medications, language),
    [medications, language],
  )

  const targetedReceptors = useMemo(() => {
    const activeMeds = activeMedications(medications)
    const resolved = resolveReceptorProfiles(
      activeMeds.map((med) => ({ id: med.id, substance: med.substance })),
      knowledgeBaseDrugs,
    )
    return resolveZielrezeptorenDisplay(curatedTargetReceptors, resolved, language)
  }, [medications, knowledgeBaseDrugs, language, curatedTargetReceptors])

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

  const sideEffects = insights.keySideEffects.slice(0, MAX_SIDE_EFFECTS)
  const receptorChips = targetedReceptors.slice(0, MAX_RECEPTOR_CHIPS)

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
        {receptorChips.length > 0 ? (
          <div className="medication-insight__chips">
            {receptorChips.map((receptor) => (
              <span
                key={receptor.target}
                className={`medication-insight__chip${
                  receptor.maxPercent >= 75 ? ' medication-insight__chip--strong' : ''
                }`}
                title={
                  receptor.drugs.length > 0
                    ? `${receptor.label} · ${receptor.drugs.join(', ')}`
                    : receptor.label
                }
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

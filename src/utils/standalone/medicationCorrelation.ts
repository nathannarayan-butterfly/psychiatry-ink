import type { MedicationEntry } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'
import {
  computeMedicationInsights,
  type CombinationRiskKind,
} from '../medication/medicationInsights'
import { resolveCombinationRisksForDisplay } from '../combinationCheck/combinationRiskDisplay'
import { translateMedicationUi, type MedicationUiKey } from '../../data/medicationUiTranslations'

/**
 * Deterministic, reference-derived correlation summary for an ad-hoc set of
 * medications (no patient plan, no case writes). Reuses the same engine
 * (`computeMedicationInsights`) and grouping (`resolveCombinationRisksForDisplay`)
 * the patient Medikation dashboard uses, so the patient-less surfaces stay
 * clinically consistent. Returns a plain-text block ready to append to a note.
 */

const RISK_LABEL_KEY: Record<CombinationRiskKind, MedicationUiKey> = {
  duplicateClass: 'medRiskDuplicateClass',
  anticholinergic: 'medRiskAnticholinergic',
  sedation: 'medRiskSedation',
  orthostatic: 'medRiskOrthostatic',
  qtc: 'medRiskQtc',
  serotonergic: 'medRiskSerotonergic',
}

export interface MedicationCorrelationLabels {
  /** Block heading, e.g. "Medikation – Korrelation". */
  heading: string
  drugs: string
  risks: string
  interactions: string
  sideEffects: string
  monitoring: string
  /** Shown when no reference data resolves for the drug list. */
  none: string
  /** e.g. (n) => `${n} Präparate`. */
  sideEffectCount: (count: number) => string
}

export function buildMedicationCorrelationSummary(
  medications: MedicationEntry[],
  language: UiLanguage,
  labels: MedicationCorrelationLabels,
): string {
  const insights = computeMedicationInsights(medications, language)
  const drugNames = medications.map((m) => m.substance).filter(Boolean)

  const lines: string[] = [labels.heading]
  if (drugNames.length > 0) {
    lines.push(`${labels.drugs}: ${drugNames.join(', ')}`)
  }

  if (!insights.hasReferenceData) {
    lines.push('', labels.none)
    return lines.join('\n').trim()
  }

  const groupedRisks = resolveCombinationRisksForDisplay(insights.combinationRisks, undefined)
  if (groupedRisks.length > 0) {
    lines.push('', `${labels.risks}:`)
    for (const group of groupedRisks) {
      const riskLabels = group.risks
        .map((risk) => translateMedicationUi(language, RISK_LABEL_KEY[risk.kind]))
        .join(', ')
      const marker = group.level === 'high' ? ' ⚠' : ''
      lines.push(`- ${riskLabels}${marker} (${group.drugs.join(' + ')})`)
    }
  }

  if (insights.crossInteractions.length > 0) {
    lines.push('', `${labels.interactions}:`)
    for (const inter of insights.crossInteractions) {
      lines.push(`- ${inter.drugA} ↔ ${inter.drugB}: ${inter.note}`)
    }
  }

  if (insights.keySideEffects.length > 0) {
    lines.push('', `${labels.sideEffects}:`)
    for (const se of insights.keySideEffects.slice(0, 10)) {
      const suffix = se.count > 1 ? ` (${labels.sideEffectCount(se.count)})` : ''
      lines.push(`- ${se.label}${suffix}`)
    }
  }

  if (insights.monitoringBurden.length > 0) {
    lines.push('', `${labels.monitoring}:`)
    for (const item of insights.monitoringBurden) {
      lines.push(`- ${item.parameter}: ${item.drugs.join(', ')}`)
    }
  }

  return lines.join('\n').trim()
}

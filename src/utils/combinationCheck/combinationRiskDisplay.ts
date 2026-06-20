import type { CombinationRisk, RiskLevel } from '../medication/medicationInsights'
import { buildCombinationKeyFromNames } from './combinationKey'
import { loadCombinationCheckStore } from './storage'

function levelRank(level: RiskLevel): number {
  return level === 'high' ? 3 : level === 'moderate' ? 2 : 1
}

/** Stable key for a set of active substances (order-independent). */
export function drugSetKey(drugs: string[]): string {
  return drugs
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('::')
}

export interface GroupedCombinationRisk {
  drugSetKey: string
  drugs: string[]
  risks: CombinationRisk[]
  level: RiskLevel
}

/** Collapse multiple additive risks for the same drug set into one dashboard row. */
export function groupCombinationRisksByDrugSet(risks: CombinationRisk[]): GroupedCombinationRisk[] {
  const groups = new Map<string, GroupedCombinationRisk>()
  for (const risk of risks) {
    const key = drugSetKey(risk.drugs)
    const prev = groups.get(key)
    if (!prev) {
      groups.set(key, { drugSetKey: key, drugs: risk.drugs, risks: [risk], level: risk.level })
      continue
    }
    prev.risks.push(risk)
    if (levelRank(risk.level) > levelRank(prev.level)) prev.level = risk.level
  }
  return [...groups.values()].sort(
    (a, b) => levelRank(b.level) - levelRank(a.level) || a.drugSetKey.localeCompare(b.drugSetKey),
  )
}

/** Pairs the clinician marked not relevant / rejected in Kombinationscheck. */
export function loadClinicianDismissedPairKeys(caseId: string): Set<string> {
  const store = loadCombinationCheckStore(caseId)
  const dismissed = new Set<string>()
  for (const finding of store.findings) {
    if (finding.status !== 'not_relevant' && finding.status !== 'rejected') continue
    dismissed.add(finding.combinationKey)
    dismissed.add(buildCombinationKeyFromNames(finding.substanceAName, finding.substanceBName))
  }
  return dismissed
}

function pairKeysForDrugSet(drugs: string[]): string[] {
  if (drugs.length < 2) return []
  const keys: string[] = []
  for (let i = 0; i < drugs.length; i += 1) {
    for (let j = i + 1; j < drugs.length; j += 1) {
      keys.push(buildCombinationKeyFromNames(drugs[i]!, drugs[j]!))
    }
  }
  return keys
}

/**
 * Hide auto-derived Kombinationsanalyse rows when the clinician already resolved
 * that exact pair in Kombinationscheck.
 */
export function filterCombinationRisksByClinicianDecisions(
  risks: CombinationRisk[],
  caseId: string | undefined,
): CombinationRisk[] {
  if (!caseId) return risks
  const dismissed = loadClinicianDismissedPairKeys(caseId)
  if (dismissed.size === 0) return risks

  return risks.filter((risk) => {
    const pairKeys = pairKeysForDrugSet(risk.drugs)
    if (pairKeys.length === 0) return true
    // Drop only when every pair in this risk row was explicitly dismissed.
    return !pairKeys.every((key) => dismissed.has(key))
  })
}

export function resolveCombinationRisksForDisplay(
  risks: CombinationRisk[],
  caseId: string | undefined,
): GroupedCombinationRisk[] {
  return groupCombinationRisksByDrugSet(filterCombinationRisksByClinicianDecisions(risks, caseId))
}

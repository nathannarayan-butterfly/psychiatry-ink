import type { DrugReference } from './schema'
import antipsychoticsData from './drugs/antipsychotics.json'
import antidepressantsData from './drugs/antidepressants.json'
import moodStabilizersData from './drugs/moodStabilizers.json'
import anxiolyticsData from './drugs/anxiolytics.json'
import adhdOtherData from './drugs/adhdOther.json'

/**
 * A few substances appear in more than one category file (e.g. lithium,
 * pregabalin, benzodiazepines). Deduplicate by id, keeping the entry with
 * the most clinical detail, so lookups never return the same drug twice.
 */
function clinicalDetailScore(drug: DrugReference): number {
  return (
    drug.interactions.length +
    drug.monitoringRules.length +
    drug.labWarnings.length +
    drug.commonSideEffectsDe.length +
    drug.seriousSideEffectsDe.length
  )
}

function dedupeById(drugs: DrugReference[]): DrugReference[] {
  const byId = new Map<string, DrugReference>()
  for (const drug of drugs) {
    const existing = byId.get(drug.id)
    if (!existing || clinicalDetailScore(drug) > clinicalDetailScore(existing)) {
      byId.set(drug.id, drug)
    }
  }
  return [...byId.values()]
}

const ALL_DRUGS: DrugReference[] = dedupeById([
  ...(antipsychoticsData as DrugReference[]),
  ...(antidepressantsData as DrugReference[]),
  ...(moodStabilizersData as DrugReference[]),
  ...(anxiolyticsData as DrugReference[]),
  ...(adhdOtherData as DrugReference[]),
])

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]+/g, '')
}

/**
 * Find all reference entries for a given substance name.
 * Fuzzy match (case/accent-insensitive) across genericName and brandNamesDACH;
 * also matches when the drug's genericName contains the substance term or vice-versa.
 */
export function getDrugsForSubstance(substanceName: string): DrugReference[] {
  const q = normalise(substanceName.trim())
  if (q.length < 2) return []
  return ALL_DRUGS.filter((drug) => {
    const generic = normalise(drug.genericName)
    if (generic.includes(q) || q.includes(generic)) return true
    return drug.brandNamesDACH?.some((brand) => {
      const b = normalise(brand)
      return b.includes(q) || q.includes(b)
    }) ?? false
  })
}

export type { DrugReference }
export type { ReceptorProfile, MonitoringRule, InteractionEntry, LabWarningRule } from './schema'

import {
  getDrugColor,
  RECEPTOR_KEYS,
  RECEPTOR_SCORE_MAX,
  type BurdenTag,
  type ReceptorKey,
} from '../../data/receptorProfile'
import type { KnowledgeBaseDrug, ReceptorProfileDetail } from '../../types/knowledgeBase'
import { getReceptorConfig } from '../../data/receptorProfile'

/**
 * Receptor-burden utilities.
 *
 * These are deliberately framework-agnostic and language-agnostic so they can
 * be reused beyond the receptor-profile visualisations — e.g. to later derive
 * sedation burden, anticholinergic load, EPS/prolactin risk, QT overview, or to
 * feed AI medication comments and lab-monitoring suggestions. Components resolve
 * labels / clinical meanings / colours from `receptorProfile.ts`.
 */

/** Minimal medication shape needed to resolve a receptor profile. */
export interface ReceptorMedInput {
  id: string
  /** Substance / generic name as entered on the medication plan. */
  substance: string
}

export interface ResolvedDrugProfile {
  medId: string
  /** Name shown to the clinician (the medication's substance). */
  medName: string
  /** Matching Knowledge Base entry. */
  drug: KnowledgeBaseDrug
  /** receptor key → score 0..5 (non-zero entries). */
  profile: Record<string, number>
  details?: Record<string, ReceptorProfileDetail>
  /** Stable per-drug colour for matrix / radar legends. */
  color: string
  colorIndex: number
}

function normName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[®™]/g, '')
    .replace(/[-_\s]+/g, '')
}

function profileHasData(profile?: Record<string, number>): boolean {
  if (!profile) return false
  return Object.values(profile).some((score) => Number(score) > 0)
}

/** True when a medication's substance matches a KB drug's generic / brand names. */
function drugMatchesSubstance(drug: KnowledgeBaseDrug, substance: string): boolean {
  const q = normName(substance)
  if (q.length < 2) return false
  const generic = normName(drug.genericName)
  if (generic.length >= 2 && (generic.includes(q) || q.includes(generic))) return true
  return drug.brandNames.some((brand) => {
    const b = normName(brand)
    return b.length >= 2 && (b.includes(q) || q.includes(b))
  })
}

/**
 * Match each medication to a Knowledge Base pharma entry (case/accent
 * insensitive, generic or brand name) and keep only those that carry a
 * non-empty receptor profile. Colours are assigned by inclusion order.
 */
export function resolveReceptorProfiles(
  meds: ReceptorMedInput[],
  drugs: KnowledgeBaseDrug[],
): ResolvedDrugProfile[] {
  const resolved: ResolvedDrugProfile[] = []
  for (const med of meds) {
    const match = drugs.find(
      (drug) => profileHasData(drug.receptorProfile) && drugMatchesSubstance(drug, med.substance),
    )
    if (!match || !match.receptorProfile) continue
    const colorIndex = resolved.length
    resolved.push({
      medId: med.id,
      medName: med.substance,
      drug: match,
      profile: match.receptorProfile,
      details: match.receptorProfileDetails,
      color: getDrugColor(colorIndex),
      colorIndex,
    })
  }
  return resolved
}

export function getScore(resolved: ResolvedDrugProfile, key: string): number {
  const raw = resolved.profile[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

/**
 * Ordered receptor keys to display. By default returns only receptors that have
 * a non-zero value across the resolved drugs (clinically relevant rows). Pass
 * `includeAllConfigured` to always show the full configured set.
 */
export function getActiveReceptorKeys(
  resolved: ResolvedDrugProfile[],
  orderedKeys: ReceptorKey[] = RECEPTOR_KEYS,
  includeAllConfigured = false,
): ReceptorKey[] {
  if (includeAllConfigured) return orderedKeys
  return orderedKeys.filter((key) => resolved.some((r) => getScore(r, key) > 0))
}

export type BurdenLevel = 'none' | 'low' | 'moderate' | 'high'

export interface ReceptorBurden {
  key: ReceptorKey
  /** Sum of scores across drugs, capped at RECEPTOR_SCORE_MAX. */
  total: number
  /** Uncapped sum (useful for tooltips / future weighting). */
  rawTotal: number
  level: BurdenLevel
  contributors: { medId: string; medName: string; score: number; color: string }[]
}

export function burdenLevel(total: number): BurdenLevel {
  if (total >= 4) return 'high'
  if (total >= 2) return 'moderate'
  if (total > 0) return 'low'
  return 'none'
}

/**
 * Combined receptor burden = capped sum of scores across active medications.
 * A deliberately simplified clinical approximation (clearly labelled in UI).
 */
export function computeCombinedBurden(
  resolved: ResolvedDrugProfile[],
  keys: ReceptorKey[],
): ReceptorBurden[] {
  return keys.map((key) => {
    const contributors = resolved
      .map((r) => ({
        medId: r.medId,
        medName: r.medName,
        score: getScore(r, key),
        color: r.color,
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
    const rawTotal = contributors.reduce((sum, c) => sum + c.score, 0)
    const total = Math.min(RECEPTOR_SCORE_MAX, rawTotal)
    return { key, rawTotal, total, level: burdenLevel(total), contributors }
  })
}

/**
 * Future-compat: aggregate receptor scores into a higher-level clinical burden
 * (e.g. sedation, anticholinergic). Returns the capped combined score across
 * all receptors tagged with the requested burden category. Not surfaced in the
 * UI yet — provided so sedation/anticholinergic/EPS/QT views can build on it.
 */
export function computeTaggedBurden(
  resolved: ResolvedDrugProfile[],
  tag: BurdenTag,
): { total: number; rawTotal: number; level: BurdenLevel } {
  const keys = RECEPTOR_KEYS.filter((key) => getReceptorConfig(key)?.burdenTags.includes(tag))
  let rawTotal = 0
  for (const r of resolved) {
    for (const key of keys) rawTotal += getScore(r, key)
  }
  const total = Math.min(RECEPTOR_SCORE_MAX, rawTotal)
  return { total, rawTotal, level: burdenLevel(total) }
}

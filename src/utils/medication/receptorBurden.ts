import {
  DEFAULT_RECEPTOR_AXES,
  getDrugColor,
  normalizeReceptorTarget,
} from '../../data/receptorProfile'
import type { KnowledgeBaseDrug, ReceptorAffinityEntry } from '../../types/knowledgeBase'
import { getDisplayReceptorProfile } from './receptorAffinity'

/**
 * Receptor-affinity resolution utilities (v2 relative-affinity model).
 *
 * Values are a *relative receptor affinity index (%)* (0–100), NOT receptor
 * occupancy or clinical blockade. All medication → profile resolution flows
 * through {@link getDisplayReceptorProfile} so legacy (1–5) and v2 entries are
 * handled uniformly. Components resolve labels / colours from `receptorProfile.ts`.
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
  /** v2 (or legacy-converted) affinity entries. */
  entries: ReceptorAffinityEntry[]
  /** normalized target → entry (for fast axis lookup). */
  byTarget: Map<string, ReceptorAffinityEntry>
  /** True when entries were converted from a legacy 1–5 profile (display only). */
  isLegacy: boolean
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

function indexByTarget(entries: ReceptorAffinityEntry[]): Map<string, ReceptorAffinityEntry> {
  const map = new Map<string, ReceptorAffinityEntry>()
  for (const entry of entries) {
    map.set(normalizeReceptorTarget(entry.target), entry)
  }
  return map
}

/**
 * Match each medication to a Knowledge Base pharma entry (case/accent
 * insensitive, generic or brand name) and resolve its display receptor profile
 * (v2 or legacy-converted). Only medications with at least one affinity entry
 * are returned. Colours are assigned by inclusion order.
 */
export function resolveReceptorProfiles(
  meds: ReceptorMedInput[],
  drugs: KnowledgeBaseDrug[],
): ResolvedDrugProfile[] {
  const resolved: ResolvedDrugProfile[] = []
  for (const med of meds) {
    const match = drugs.find((drug) => {
      if (!drugMatchesSubstance(drug, med.substance)) return false
      return !getDisplayReceptorProfile(drug).isEmpty
    })
    if (!match) continue
    const display = getDisplayReceptorProfile(match)
    const colorIndex = resolved.length
    resolved.push({
      medId: med.id,
      medName: med.substance,
      drug: match,
      entries: display.entries,
      byTarget: indexByTarget(display.entries),
      isLegacy: display.isLegacy,
      color: getDrugColor(colorIndex),
      colorIndex,
    })
  }
  return resolved
}

/** Entry for a normalized receptor target on a resolved drug (if present). */
export function getEntry(resolved: ResolvedDrugProfile, target: string): ReceptorAffinityEntry | undefined {
  return resolved.byTarget.get(normalizeReceptorTarget(target))
}

/**
 * Relative affinity index (0–100) for a target, or null when the target is not
 * present or its value is unknown.
 */
export function getAffinityPercent(resolved: ResolvedDrugProfile, target: string): number | null {
  const entry = getEntry(resolved, target)
  if (!entry) return null
  return entry.affinityPercent
}

/**
 * Ordered receptor targets to display. Starts from {@link DEFAULT_RECEPTOR_AXES}
 * (keeping only axes for which some drug has data), then appends any extra
 * targets present on the resolved drugs that are not part of the default set.
 */
export function getActiveReceptorTargets(
  resolved: ResolvedDrugProfile[],
  axes: readonly string[] = DEFAULT_RECEPTOR_AXES,
  includeAllAxes = false,
): string[] {
  const hasData = (target: string): boolean =>
    resolved.some((r) => {
      const entry = r.byTarget.get(normalizeReceptorTarget(target))
      return entry != null && (entry.affinityPercent ?? 0) > 0
    })

  const ordered: string[] = []
  const seen = new Set<string>()
  for (const axis of axes) {
    const norm = normalizeReceptorTarget(axis)
    if (seen.has(norm)) continue
    if (includeAllAxes || hasData(axis)) {
      ordered.push(axis)
      seen.add(norm)
    }
  }
  // Append drug-specific targets not covered by the default axes.
  for (const r of resolved) {
    for (const entry of r.entries) {
      const norm = normalizeReceptorTarget(entry.target)
      if (seen.has(norm)) continue
      if ((entry.affinityPercent ?? 0) > 0) {
        ordered.push(entry.target)
        seen.add(norm)
      }
    }
  }
  return ordered
}

// ── Combined receptor "burden" (relative-affinity approximation) ──────────────

export const AFFINITY_MAX = 100

export type BurdenLevel = 'none' | 'low' | 'moderate' | 'high'

export interface ReceptorBurden {
  target: string
  /** Combined relative-affinity index across drugs, capped at 100. */
  total: number
  /** Uncapped sum (useful for tooltips / future weighting). */
  rawTotal: number
  level: BurdenLevel
  contributors: { medId: string; medName: string; percent: number; color: string }[]
}

export function burdenLevel(total: number): BurdenLevel {
  if (total >= 66) return 'high'
  if (total >= 33) return 'moderate'
  if (total > 0) return 'low'
  return 'none'
}

/**
 * Combined receptor affinity = capped sum of relative-affinity indices across
 * active medications for each target. A deliberately simplified clinical
 * approximation (clearly labelled in the UI) — NOT receptor occupancy.
 */
export function computeCombinedBurden(
  resolved: ResolvedDrugProfile[],
  targets: string[],
): ReceptorBurden[] {
  return targets.map((target) => {
    const contributors = resolved
      .map((r) => ({
        medId: r.medId,
        medName: r.medName,
        percent: getAffinityPercent(r, target) ?? 0,
        color: r.color,
      }))
      .filter((c) => c.percent > 0)
      .sort((a, b) => b.percent - a.percent)
    const rawTotal = contributors.reduce((sum, c) => sum + c.percent, 0)
    const total = Math.min(AFFINITY_MAX, rawTotal)
    return { target, rawTotal, total, level: burdenLevel(total), contributors }
  })
}

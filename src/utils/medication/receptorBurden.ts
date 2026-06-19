import {
  DEFAULT_RECEPTOR_AXES,
  getDrugColor,
  getReceptorDisplayLabel,
  normalizeReceptorTarget,
} from '../../data/receptorProfile'
import type { KnowledgeBaseDrug, ReceptorAffinityEntry } from '../../types/knowledgeBase'
import { getDisplayReceptorProfile } from './receptorAffinity'

export { normalizeReceptorTarget }

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

/** Per-axis max relative affinity (0–100) across active drugs — dashboard combined radar. */
export interface CombinedReceptorFingerprint {
  targets: { target: string; percent: number }[]
  contributorCount: number
}

/**
 * Relative affinity index (0–100) at/above which a receptor counts as a clinical
 * "target". Matches legacy qualitative score ≥ 3 (moderate+) via
 * {@link legacyScoreToAffinityPercent}.
 */
export const TARGET_AFFINITY_PERCENT = 55

/** Receptor meaningfully engaged (≥ moderate affinity) across the active regimen. */
export interface TargetedReceptor {
  /** Normalized receptor symbol (e.g. "D2", "5-HT2A"). */
  target: string
  label: string
  /** How many active medications meaningfully engage this receptor. */
  count: number
  /** Strongest relative affinity index across the active regimen (0–100). */
  maxPercent: number
  /** Active substances meaningfully engaging this receptor. */
  drugs: string[]
}

/**
 * Combined receptor fingerprint for the active regimen: per target, the strongest
 * relative-affinity index across resolved drugs. Uses the same v2 KB resolution
 * path as {@link ReceptorProfileSection} so the dashboard radar matches detail view.
 */
export function computeCombinedReceptorFingerprint(
  resolved: ResolvedDrugProfile[],
): CombinedReceptorFingerprint | null {
  if (resolved.length === 0) return null
  const activeTargets = getActiveReceptorTargets(resolved)
  const targets = activeTargets
    .map((target) => {
      let max = 0
      for (const drug of resolved) {
        const pct = getAffinityPercent(drug, target) ?? 0
        if (pct > max) max = pct
      }
      return { target, percent: max }
    })
    .filter((entry) => entry.percent > 0)
  if (targets.length === 0) return null
  return { targets, contributorCount: resolved.length }
}

/**
 * Regimen-level targeted receptors: axes where ≥ one active drug has relative
 * affinity ≥ {@link TARGET_AFFINITY_PERCENT}. Uses the same v2 KB resolution
 * path as {@link computeCombinedReceptorFingerprint} so dashboard chips / bars
 * match the combined radar.
 */
export function computeTargetedReceptors(
  resolved: ResolvedDrugProfile[],
  language: string,
): TargetedReceptor[] {
  if (resolved.length === 0) return []

  const agg = new Map<string, { count: number; maxPercent: number; drugs: string[] }>()
  for (const drug of resolved) {
    const seenForDrug = new Set<string>()
    for (const entry of drug.entries) {
      const pct = entry.affinityPercent ?? 0
      if (pct < TARGET_AFFINITY_PERCENT) continue
      const norm = normalizeReceptorTarget(entry.target)
      if (seenForDrug.has(norm)) continue
      seenForDrug.add(norm)
      const prev = agg.get(norm) ?? { count: 0, maxPercent: 0, drugs: [] }
      prev.count += 1
      prev.maxPercent = Math.max(prev.maxPercent, pct)
      prev.drugs.push(drug.medName)
      agg.set(norm, prev)
    }
  }

  return [...agg.entries()]
    .map(([target, data]) => ({
      target,
      label: getReceptorDisplayLabel(target),
      count: data.count,
      maxPercent: data.maxPercent,
      drugs: data.drugs,
    }))
    .sort((a, b) => b.count - a.count || b.maxPercent - a.maxPercent || a.label.localeCompare(b.label, language))
}

/** Enrich a single receptor target with regimen affinity data for display. */
export function enrichTargetReceptor(
  target: string,
  resolved: ResolvedDrugProfile[],
): TargetedReceptor {
  const norm = normalizeReceptorTarget(target)
  const drugs: string[] = []
  let maxPercent = 0
  let count = 0
  for (const drug of resolved) {
    const pct = getAffinityPercent(drug, norm) ?? 0
    if (pct <= 0) continue
    drugs.push(drug.medName)
    maxPercent = Math.max(maxPercent, pct)
    if (pct >= TARGET_AFFINITY_PERCENT) count += 1
  }
  return {
    target: norm,
    label: getReceptorDisplayLabel(norm),
    count,
    maxPercent,
    drugs: [...new Set(drugs)],
  }
}

/**
 * Enrich an explicit list of receptor targets with regimen affinity data.
 * Used once the clinician has customized the Zielrezeptoren whitelist.
 */
export function resolveCuratedTargetReceptors(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
): TargetedReceptor[] {
  if (!curatedTargets?.length) return []
  const seen = new Set<string>()
  const result: TargetedReceptor[] = []
  for (const raw of curatedTargets) {
    const norm = normalizeReceptorTarget(raw)
    if (seen.has(norm)) continue
    seen.add(norm)
    result.push(enrichTargetReceptor(norm, resolved))
  }
  return result
}

/**
 * Baseline Zielrezeptoren whitelist: KB-derived moderate+ targets until the
 * clinician customizes; thereafter the persisted list (which may be empty).
 */
export function resolveZielrezeptorenBaseline(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
  language: string,
): string[] {
  if (curatedTargets !== undefined) {
    return curatedTargets.map((t) => normalizeReceptorTarget(t))
  }
  return computeTargetedReceptors(resolved, language).map((r) =>
    normalizeReceptorTarget(r.target),
  )
}

/**
 * Zielrezeptoren shown in the dashboard panel above Nebenwirkungen.
 * Auto-populates from {@link computeTargetedReceptors} until customized.
 */
export function resolveZielrezeptorenDisplay(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
  language: string,
): TargetedReceptor[] {
  if (curatedTargets !== undefined) {
    return resolveCuratedTargetReceptors(curatedTargets, resolved)
  }
  return computeTargetedReceptors(resolved, language)
}

/**
 * Regimen receptors not currently shown in Zielrezeptoren — used for the add picker.
 */
export function computeZielrezeptorPickable(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
  language: string,
): TargetedReceptor[] {
  const visible = new Set(
    resolveZielrezeptorenBaseline(curatedTargets, resolved, language),
  )
  return getActiveReceptorTargets(resolved)
    .filter((target) => !visible.has(normalizeReceptorTarget(target)))
    .map((target) => enrichTargetReceptor(target, resolved))
    .sort(
      (a, b) =>
        b.maxPercent - a.maxPercent ||
        b.count - a.count ||
        a.label.localeCompare(b.label, language),
    )
}

/** @deprecated Use {@link computeZielrezeptorPickable} for the Zielrezeptoren panel. */
export function computePickableReceptorTargets(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
  language: string,
): TargetedReceptor[] {
  return computeZielrezeptorPickable(curatedTargets, resolved, language)
}

/** @deprecated Suggestions are no longer shown once Zielrezeptoren auto-populate. */
export function computeSuggestedTargetReceptors(
  curatedTargets: string[] | undefined,
  resolved: ResolvedDrugProfile[],
  language: string,
): TargetedReceptor[] {
  const visible = new Set(
    resolveZielrezeptorenBaseline(curatedTargets, resolved, language),
  )
  return computeTargetedReceptors(resolved, language).filter(
    (r) => !visible.has(normalizeReceptorTarget(r.target)),
  )
}

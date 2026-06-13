import type {
  AffinityScale,
  EvidenceQuality,
  KnowledgeBaseDrug,
  LegacyReceptorAction,
  ReceptorAction,
  ReceptorAffinityEntry,
  ReceptorClinicalRelevance,
  ReceptorProfileDetail,
} from '../../types/knowledgeBase'
import { normalizeReceptorTarget } from '../../data/receptorProfile'

/**
 * v2 relative receptor-affinity utilities.
 *
 * CORE PRINCIPLE: `affinityPercent` is a *relative receptor affinity index (%)*
 * — NOT receptor occupancy, NOT clinical blockade, NOT dose-dependent effect
 * strength. These helpers normalize raw scientific binding data (Ki / IC50 /
 * pKi) or qualitative/legacy inputs into a 0–100 display index, and validate /
 * adapt profiles for the UI.
 */

export const AFFINITY_SCALE: AffinityScale = 'relative_log_ki_percent'

/** Reference Ki bounds (nM) for the log-normalization window. */
const STRONG_KI_NM = 0.1
const WEAK_KI_NM = 10000

const LOG_STRONG = Math.log10(STRONG_KI_NM) // -1
const LOG_WEAK = Math.log10(WEAK_KI_NM) //  4
const LOG_RANGE = LOG_WEAK - LOG_STRONG //  5

/**
 * Convert a raw inhibition constant (Ki, in nM) to a relative affinity index
 * (0–100) on a log scale. Lower Ki → higher affinity. Guards non-finite / ≤ 0
 * values to 0; clamps and rounds the result.
 *
 * Reference points: Ki 0.1→~100%, 1→~80%, 10→~60%, 100→~40%, 1000→~20%, 10000→~0%.
 */
export function kiToAffinityPercent(rawKiNm: number | null | undefined): number {
  if (rawKiNm == null || !Number.isFinite(rawKiNm) || rawKiNm <= 0) return 0
  const pct = ((LOG_WEAK - Math.log10(rawKiNm)) / LOG_RANGE) * 100
  return clampPercent(pct)
}

/** Map a qualitative affinity label to a relative affinity index (0–100). */
export function categoricalAffinityToPercent(label: string | null | undefined): number | null {
  if (!label) return null
  const key = label.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const map: Record<string, number> = {
    very_high: 90,
    high: 75,
    moderate: 55,
    low: 30,
    minimal: 10,
    negligible: 5,
  }
  return key in map ? map[key]! : null
}

/**
 * Convert a legacy 1–5 receptor score to a relative affinity index (0–100).
 *
 * DISPLAY-ONLY: the result must never be persisted as an upgraded scientific
 * profile unless the entry was explicitly regenerated / confirmed via the v2
 * generation pipeline.
 */
export function legacyScoreToAffinityPercent(score: number | null | undefined): number {
  const map: Record<number, number> = { 1: 15, 2: 35, 3: 55, 4: 75, 5: 90 }
  const rounded = Math.round(Number(score))
  return map[rounded] ?? 0
}

/** pKi (−log10 Ki[M]) → Ki in nM. */
export function pKiToKiNm(pKi: number | null | undefined): number | null {
  if (pKi == null || !Number.isFinite(pKi)) return null
  return Math.pow(10, -pKi) * 1e9
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, Math.min(100, value)))
}

// ── Validation / sanitization ────────────────────────────────────────────────

const VALID_ACTIONS: ReadonlySet<ReceptorAction> = new Set<ReceptorAction>([
  'antagonist',
  'partial_agonist',
  'agonist',
  'inverse_agonist',
  'reuptake_inhibitor',
  'enzyme_inhibitor',
  'mixed',
  'unknown',
])

const VALID_EVIDENCE: ReadonlySet<EvidenceQuality> = new Set<EvidenceQuality>([
  'high',
  'moderate',
  'low',
  'estimated',
  'unknown',
])

const VALID_RELEVANCE: ReadonlySet<ReceptorClinicalRelevance> = new Set<ReceptorClinicalRelevance>([
  'high',
  'moderate',
  'low',
  'uncertain',
])

function sanitizePercent(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return null
  return Math.round(Math.max(0, Math.min(100, num)))
}

function sanitizePositive(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return num
}

function sanitizeFiniteNumber(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * Validate + sanitize a single raw entry into a {@link ReceptorAffinityEntry}.
 * Returns null when the entry is structurally invalid (e.g. empty target) so
 * malformed data is never persisted. Out-of-range numerics are coerced to null.
 */
export function sanitizeAffinityEntry(raw: unknown): ReceptorAffinityEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const target = typeof r.target === 'string' ? r.target.trim() : ''
  if (!target) return null

  const action = (typeof r.action === 'string' && VALID_ACTIONS.has(r.action as ReceptorAction)
    ? (r.action as ReceptorAction)
    : 'unknown') as ReceptorAction

  const evidenceQuality = (typeof r.evidenceQuality === 'string' &&
  VALID_EVIDENCE.has(r.evidenceQuality as EvidenceQuality)
    ? (r.evidenceQuality as EvidenceQuality)
    : 'unknown') as EvidenceQuality

  const rawKiNm = sanitizePositive(r.rawKiNm)
  const rawIc50Nm = sanitizePositive(r.rawIc50Nm)
  const pKi = sanitizeFiniteNumber(r.pKi)

  let affinityPercent = sanitizePercent(r.affinityPercent)
  // Derive from raw data when a percent was not supplied but Ki is known.
  if (affinityPercent == null && rawKiNm != null) {
    affinityPercent = kiToAffinityPercent(rawKiNm)
  }

  const isEstimated =
    typeof r.isEstimated === 'boolean'
      ? r.isEstimated
      : evidenceQuality === 'estimated' || (rawKiNm == null && rawIc50Nm == null && pKi == null)

  const entry: ReceptorAffinityEntry = {
    target,
    affinityPercent,
    action,
    evidenceQuality,
    isEstimated,
  }
  if (rawKiNm != null) entry.rawKiNm = rawKiNm
  if (rawIc50Nm != null) entry.rawIc50Nm = rawIc50Nm
  if (pKi != null) entry.pKi = pKi
  if (typeof r.sourceNote === 'string' && r.sourceNote.trim()) {
    entry.sourceNote = r.sourceNote.trim()
  }
  if (typeof r.clinicalRelevance === 'string' && VALID_RELEVANCE.has(r.clinicalRelevance as ReceptorClinicalRelevance)) {
    entry.clinicalRelevance = r.clinicalRelevance as ReceptorClinicalRelevance
  }
  return entry
}

/**
 * Validate + sanitize a raw v2 receptor-affinity array. Invalid entries are
 * dropped (and reported to the dev console). Returns a clean array (possibly
 * empty); malformed payloads never reach persistence.
 */
export function sanitizeAffinityProfile(raw: unknown): ReceptorAffinityEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ReceptorAffinityEntry[] = []
  for (const item of raw) {
    const entry = sanitizeAffinityEntry(item)
    if (entry) out.push(entry)
    else if (import.meta.env?.DEV) {
      console.error('[receptorAffinity] dropped invalid affinity entry', item)
    }
  }
  return out
}

// ── Legacy → v2 display adapter ───────────────────────────────────────────────

const LEGACY_ACTION_TO_V2: Record<LegacyReceptorAction, ReceptorAction> = {
  antagonist: 'antagonist',
  'partial-agonist': 'partial_agonist',
  agonist: 'agonist',
  'reuptake-inhibition': 'reuptake_inhibitor',
  unknown: 'unknown',
}

/**
 * Convert a legacy (1–5 score) profile to v2 affinity entries for DISPLAY ONLY.
 * Percentages are derived via {@link legacyScoreToAffinityPercent} and every
 * entry is flagged `isEstimated` with `evidenceQuality: 'low'`. The result must
 * not be written back as a scientific profile.
 */
export function convertLegacyProfileForDisplayOnly(
  profile?: Record<string, number>,
  details?: Record<string, ReceptorProfileDetail>,
): ReceptorAffinityEntry[] {
  if (!profile) return []
  const out: ReceptorAffinityEntry[] = []
  for (const [key, score] of Object.entries(profile)) {
    if (!Number.isFinite(score) || score <= 0) continue
    const detail = details?.[key]
    const action = detail?.action ? LEGACY_ACTION_TO_V2[detail.action] : 'unknown'
    out.push({
      target: normalizeReceptorTarget(key),
      affinityPercent: legacyScoreToAffinityPercent(score),
      action,
      evidenceQuality: 'low',
      isEstimated: true,
      sourceNote: detail?.clinicalMeaning,
    })
  }
  return out
}

export interface DisplayReceptorProfile {
  entries: ReceptorAffinityEntry[]
  /** True when the entries were converted from a legacy 1–5 score profile. */
  isLegacy: boolean
  /** True when there is no receptor data at all. */
  isEmpty: boolean
}

/**
 * Backward-compatible display adapter. ALL UI components must resolve a drug's
 * receptor data through this function rather than reading raw DB fields.
 *
 * - v2 entries (`receptorProfileVersion === 2` with `receptorAffinityProfile`)
 *   are returned as-is.
 * - otherwise a legacy 1–5 profile (preserved snapshot or live legacy fields)
 *   is converted for display only and flagged `isLegacy`.
 */
export function getDisplayReceptorProfile(drug: KnowledgeBaseDrug): DisplayReceptorProfile {
  if (drug.receptorProfileVersion === 2 && Array.isArray(drug.receptorAffinityProfile)) {
    const entries = drug.receptorAffinityProfile
    return { entries, isLegacy: false, isEmpty: entries.length === 0 }
  }
  const legacyProfile = drug.legacyReceptorProfile?.profile ?? drug.receptorProfile
  const legacyDetails = drug.legacyReceptorProfile?.details ?? drug.receptorProfileDetails
  const entries = convertLegacyProfileForDisplayOnly(legacyProfile, legacyDetails)
  return { entries, isLegacy: entries.length > 0, isEmpty: entries.length === 0 }
}

/** True when a drug carries any usable receptor data (v2 or legacy). */
export function hasAnyReceptorData(drug: KnowledgeBaseDrug): boolean {
  return !getDisplayReceptorProfile(drug).isEmpty
}

/**
 * Non-destructively flag pre-v2 entries by stamping `receptorProfileVersion: 1`
 * on drugs that carry legacy 1–5 data but no explicit version. Old receptor data
 * is never deleted — only annotated — so the upgrade path stays reversible.
 * Returns the same array reference when nothing changed.
 */
export function flagLegacyReceptorProfiles(drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  let changed = false
  const next = drugs.map((drug) => {
    if (drug.receptorProfileVersion != null) return drug
    const hasLegacy =
      (drug.receptorProfile && Object.keys(drug.receptorProfile).length > 0) ||
      (drug.receptorProfileDetails && Object.keys(drug.receptorProfileDetails).length > 0)
    if (!hasLegacy) return drug
    changed = true
    return { ...drug, receptorProfileVersion: 1 as const }
  })
  return changed ? next : drugs
}

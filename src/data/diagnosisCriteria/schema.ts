/**
 * Butterfly criteria schema — 3-tier, licensing-safe, clinician-reviewable.
 *
 * LICENSING NOTE
 * --------------
 * This dataset does NOT reproduce ICD-11 CDDR or DSM-5 criterion *text*.
 * Clinical facts (symptom counts, durations, the existence of a feature) are
 * not copyrightable; only the specific wording is. Every `text_de` below is an
 * ORIGINAL operational paraphrase authored for this app, and every record
 * carries a `sourceRef` pointing at the standard it was operationalized from
 * (e.g. "operationalisiert nach ICD-10 F10.2 / ICD-11 6C40.2"). DSM is kept as
 * a code/label crosswalk only — no DSM criteria are encoded.
 *
 * Every disorder ships with `status: 'draft'` until a clinician reviews it.
 */

import type { DisorderEvaluationContext } from '../../utils/diagnosisCriteria/context'

/** Where a criterion's auto-evaluation reads its evidence from, for UI/deep-links. */
export type MappingHintKind =
  | 'isdm_domain'
  | 'checklist'
  | 'medication'
  | 'lab'
  | 'course'
  | 'diagnosis'

export interface MappingHint {
  kind: MappingHintKind
  /** Domain id / checklist item id / lab analyte key / etc. */
  ref: string
  /** Optional Notion documentation page id to deep-link the clinician to. */
  deepLinkPageId?: string
}

/** Auto-evaluation outcome for a single criterion (before clinician attestation). */
export type CriterionStatus = 'met' | 'partially_met' | 'not_met' | 'unknown'

export interface CriterionSignal {
  status: CriterionStatus
  /** Short supporting evidence / quote / reference, when available. */
  evidence?: string
}

/** Predicate that derives a criterion signal from structured app data. */
export type OperationalRule = (ctx: DisorderEvaluationContext) => CriterionSignal

/**
 * Structured, language-neutral source citation for a single criterion.
 *
 * This records WHERE the operationalized (original-wording) criterion was
 * derived from — the classification system + exact code, and (ideally) the
 * criterion identifier within that source. It does NOT contain any copyrighted
 * criterion *text*; it is pure coding metadata, which is why it lives in the
 * criteria data (not in the i18n layer).
 */
export interface CriterionSource {
  /** Classification system the criterion is anchored to. */
  classification: DisorderClassification
  /** Exact code in that system (e.g. "F10.2", "6C40.2"). */
  code: string
  /**
   * Identifier of this criterion within the cited source document, when it is
   * unambiguous (e.g. "a"–"f" for ICD-10 F10.2, "B1"/"C3"/"G2" for ICD-10 F32).
   * Omitted where the app's operationalization unions multiple sub-criteria or
   * where the source does not enumerate criteria with stable identifiers.
   */
  ref?: string
}

export interface Criterion {
  /** Globally-unique id, prefixed with the disorder code (e.g. "f10_2.craving"). */
  id: string
  /** OUR original operational paraphrase (German). Never copied criterion text. */
  text_de: string
  /** Deterministic auto-rule; omit when the criterion is attestation-only. */
  operationalRule?: OperationalRule
  /** Where the rule reads its evidence from (for UI / deep-linking). */
  mappingHints: MappingHint[]
  /** When true, an `unknown` outcome becomes a clinician checkbox. */
  allowClinicianAttest: boolean
  /** Optional citation override at criterion level. */
  sourceRef?: string
  /**
   * Structured, language-neutral source citation(s) for this criterion. Anchored
   * to the classification whose criterion *structure* the app follows (ICD-10 for
   * the Phase-1 set). The disorder header still surfaces the ICD-11/DSM crosswalk.
   */
  citation?: CriterionSource[]
}

export type CriterionGroupLogic = 'all_of' | 'any_of' | 'at_least_n_of' | 'none_of'

export type CriterionGroupType = 'inclusion' | 'exclusion' | 'severity'

export interface CriterionTimeWindow {
  /** Minimum symptom duration in days (coarse, matched against course pattern). */
  minDurationDays?: number
  /** Symptoms must co-occur within this rolling window in days (e.g. 365 for F10.2). */
  withinDays?: number
}

export interface CriterionGroup {
  id: string
  label_de: string
  logic: CriterionGroupLogic
  /** Required count for `at_least_n_of`. */
  threshold?: number
  timeWindow?: CriterionTimeWindow
  groupType: CriterionGroupType
  criteria: Criterion[]
}

export type DisorderClassification = 'icd10' | 'icd11'

export type DisorderStatus = 'draft' | 'clinician_reviewed'

export interface DisorderCodingRef {
  code: string
  label_de: string
}

/**
 * Optional, DISTINCT ICD-11 criteria tree for a disorder.
 *
 * ADDITIVE & BACKWARD-COMPATIBLE: when a disorder omits this field, ICD-11 mode
 * deliberately falls back to the disorder's ICD-10 `groups` (see
 * `resolveDisorderForCodingSystem` in `./version`). When present, it carries an
 * INDEPENDENT set of `CriterionGroup`s authored against the ICD-11 CDDR — with
 * its own thresholds, time windows, operational rules and exclusions — so the
 * Butterfly engine evaluates a genuinely different criteria structure when the
 * clinician toggles to ICD-11.
 *
 * INVARIANTS (so the i18n layer composes without a resolver change):
 *  - Every group/criterion `id` here MUST be globally unique AND distinct from
 *    the disorder's ICD-10 group/criterion ids (prefix ICD-11 ids, e.g.
 *    `6c40_2.impaired_control`). The flat i18n `groups`/`criteria` maps then
 *    carry both versions side-by-side, keyed by id.
 *  - The disorder's display `name_de` and `differentials_de` are SHARED across
 *    versions (ICD-11 mode reuses them), so their index-aligned translations
 *    stay valid. Only the criteria tree differs per version.
 */
export interface Icd11CriteriaSet {
  /** ICD-11 criterion groups (DISTINCT ids from the ICD-10 `groups`). */
  groups: CriterionGroup[]
  /** Optional ICD-11-specific citation string; falls back to `Disorder.sourceRef`. */
  sourceRef?: string
}

export interface Disorder {
  /** Stable id, e.g. "depressive_episode". */
  id: string
  /** Primary classification system the operationalization is anchored to. */
  classification: DisorderClassification
  /** Primary code in the anchor system (e.g. "F32" or "6A70"). */
  code: string
  /** OUR display name (German). */
  name_de: string
  /** Crosswalk key linking to the app's diagnosis catalog (ICD-10 code). */
  crosswalkKey: string
  /** Citation: which standard this was operationalized from. */
  sourceRef: string
  /** Dataset version for this disorder record. */
  version: number
  /** Review state — `draft` until a clinician signs off. */
  status: DisorderStatus
  /** Code/label crosswalk (DSM kept as label only — no DSM criteria). */
  codingSystems: {
    icd10?: DisorderCodingRef
    icd11?: DisorderCodingRef
    dsm5tr?: DisorderCodingRef
  }
  /** Differential considerations (OUR wording) surfaced as advice, not assertions. */
  differentials_de: string[]
  /** ICD-10-structured criteria tree (the Phase-1 anchor; always present). */
  groups: CriterionGroup[]
  /**
   * Optional DISTINCT ICD-11 criteria tree. Absent → ICD-11 mode falls back to
   * `groups` (the ICD-10 tree). See {@link Icd11CriteriaSet}.
   */
  icd11?: Icd11CriteriaSet
}

/** Convenience signal constructors for predicate authoring. */
export const MET: CriterionSignal = { status: 'met' }
export const NOT_MET: CriterionSignal = { status: 'not_met' }
export const UNKNOWN: CriterionSignal = { status: 'unknown' }

export function met(evidence?: string): CriterionSignal {
  return { status: 'met', evidence }
}
export function notMet(evidence?: string): CriterionSignal {
  return { status: 'not_met', evidence }
}
export function partiallyMet(evidence?: string): CriterionSignal {
  return { status: 'partially_met', evidence }
}

/** Human-readable label per classification system (language-neutral). */
const CLASSIFICATION_LABEL: Record<DisorderClassification, string> = {
  icd10: 'ICD-10',
  icd11: 'ICD-11',
}

/**
 * Render a criterion's structured citation as a compact, language-neutral string,
 * e.g. `ICD-10 F32 (B1)` or `ICD-10 F10.2 (a) · ICD-11 6C40.2`. Returns an empty
 * string when no citation is present.
 */
export function formatCriterionCitation(citation: CriterionSource[] | undefined): string {
  if (!citation || citation.length === 0) return ''
  return citation
    .map((source) => {
      const head = `${CLASSIFICATION_LABEL[source.classification]} ${source.code}`
      return source.ref ? `${head} (${source.ref})` : head
    })
    .join(' · ')
}

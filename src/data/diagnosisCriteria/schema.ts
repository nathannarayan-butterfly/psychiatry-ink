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
  groups: CriterionGroup[]
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

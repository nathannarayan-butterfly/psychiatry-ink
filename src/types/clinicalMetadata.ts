/**
 * Canonical Clinical Metadata model — the shared output of the Clinical Metadata
 * Extraction Agent (CMEA). "Compute once, reuse many": the hybrid regex+LLM
 * extractor writes a versioned, provenance-tagged `facts[]` array onto each
 * ClinicalImprint record, and every consumer READS those facts through the
 * typed accessor (`src/utils/clinicalMetadata/accessor.ts`) instead of calling
 * the LLM itself.
 *
 * Hard rules encoded by these types:
 *  - Every fact carries provenance (where it came from, who extracted it, how
 *    confident, and a literal evidence quote) — nothing is ever fabricated.
 *  - LLM facts are advisory suggestions; deterministic/ISDM data stays the
 *    source of truth. A fact is only promoted to truth via clinician acceptance
 *    (`extractor: 'clinician'`).
 */

import type {
  ClinicalSourceType,
  CourseDirection,
  EvidenceStrength,
  StructuredClinicalMetadata,
} from './clinicalImprint'
import type { CourseOnset, IsdmPhenomenologyDomain } from './isdm'
import type { PriorTherapyEvent, PriorTherapyTimeframe } from './priorTherapies'

/** Canonical schema version for the `facts[]` model. Bump on breaking changes. */
export const CMEA_SCHEMA_VERSION = 1

/**
 * Extractor logic version. Bump whenever the regex/LLM extraction logic changes
 * in a way that should invalidate previously-cached facts (drives freshness
 * gating + bulk reindex of stale records).
 */
export const CMEA_EXTRACTOR_VERSION = 1

/** Who/what produced a fact. */
export type FactExtractor = 'regex' | 'llm' | 'clinician'

/** Provenance attached to every clinical fact — the anti-fabrication contract. */
export interface FactProvenance {
  sourceType: ClinicalSourceType
  sourceId: string
  sourceDate: string
  evidenceStrength: EvidenceStrength
  /** Literal supporting quote from the (de-identified) source text; null if none. */
  evidenceQuote: string | null
  /** 0..1 — deterministic signals carry higher confidence than inferences. */
  confidence: number
  extractor: FactExtractor
  extractorVersion: number
}

export type ClinicalFactKind =
  | 'symptom'
  | 'course'
  | 'risk'
  | 'substance'
  | 'lifestyle'
  | 'medication_trial'
  | 'lab_signal'
  | 'diagnosis_hint'
  | 'functioning'

interface ClinicalFactBase {
  /** Stable id: `${sourceId}:${kind}:${slug}` — deterministic per source. */
  id: string
  kind: ClinicalFactKind
  caseId: string
  provenance: FactProvenance
}

export type SymptomSeverity = 'mild' | 'moderate' | 'severe'

export interface SymptomFact extends ClinicalFactBase {
  kind: 'symptom'
  label: string
  domain: IsdmPhenomenologyDomain | null
  severity: SymptomSeverity | null
  onset: CourseOnset | null
  durationDays: number | null
  /** True when the text documents the ABSENCE of the symptom. */
  negated: boolean
}

export interface CourseFact extends ClinicalFactBase {
  kind: 'course'
  direction: CourseDirection
  summary: string | null
}

export type RiskAxis =
  | 'suicide'
  | 'self_harm'
  | 'harm_others'
  | 'aggression'
  | 'self_neglect'

export type RiskStatus = 'present' | 'absent' | 'unclear'
export type RiskAcuity = 'acute' | 'subacute' | 'chronic' | 'unclear'

export interface RiskFact extends ClinicalFactBase {
  kind: 'risk'
  axis: RiskAxis
  status: RiskStatus
  acuity: RiskAcuity | null
}

export type SubstanceUse = 'current' | 'past' | 'denied' | 'unclear'

export interface SubstanceFact extends ClinicalFactBase {
  kind: 'substance'
  substance: string
  use: SubstanceUse
  pattern: string | null
}

export type LifestyleFactor =
  | 'smoking'
  | 'alcohol'
  | 'caffeine'
  | 'exercise'
  | 'diet'
  | 'other'

export interface LifestyleFact extends ClinicalFactBase {
  kind: 'lifestyle'
  factor: LifestyleFactor
  status: 'present' | 'absent' | 'unclear'
  detail: string | null
}

export type DoseAdequacy = 'adequate' | 'subtherapeutic' | 'unclear'
export type AdherenceSignal = 'good' | 'poor' | 'unclear'
export type SerumLevelInterpretation =
  | 'subtherapeutic'
  | 'therapeutic'
  | 'supratherapeutic'
  | 'unclear'

export interface SerumLevelSignal {
  value: number
  unit: string
  interpretation: SerumLevelInterpretation
}

export interface MedicationTrialFact extends ClinicalFactBase {
  kind: 'medication_trial'
  substance: string
  doseText: string | null
  doseAdequacy: DoseAdequacy | null
  durationText: string | null
  serumLevel: SerumLevelSignal | null
  outcome: PriorTherapyEvent | null
  reasonStopped: string | null
  adherenceSignal: AdherenceSignal | null
  /** True when this is a CYP1A2 substrate + smoker (possible level reduction). */
  smokingInteractionFlag: boolean
  timeframe: PriorTherapyTimeframe
}

export type LabInterpretation = 'low' | 'normal' | 'high' | 'critical' | 'unclear'

export interface LabSignalFact extends ClinicalFactBase {
  kind: 'lab_signal'
  parameter: string
  value: number | null
  unit: string | null
  interpretation: LabInterpretation | null
  refRange: { min?: number; max?: number } | null
}

export type DiagnosisHintStatus =
  | 'suspected'
  | 'confirmed'
  | 'differential'
  | 'ruled_out'
  | 'unclear'

export interface DiagnosisHintFact extends ClinicalFactBase {
  kind: 'diagnosis_hint'
  label: string
  /** ICD/DSM code if explicitly documented; null otherwise. */
  code: string | null
  status: DiagnosisHintStatus
}

export type FunctioningDomain =
  | 'social'
  | 'occupational'
  | 'self_care'
  | 'global'
  | 'other'
export type FunctioningImpairment = 'none' | 'mild' | 'moderate' | 'severe' | 'unclear'

export interface FunctioningFact extends ClinicalFactBase {
  kind: 'functioning'
  domain: FunctioningDomain
  impairment: FunctioningImpairment
  detail: string | null
}

/** Discriminated union of every clinical fact the CMEA can produce. */
export type ClinicalFact =
  | SymptomFact
  | CourseFact
  | RiskFact
  | SubstanceFact
  | LifestyleFact
  | MedicationTrialFact
  | LabSignalFact
  | DiagnosisHintFact
  | FunctioningFact

/**
 * The full canonical metadata for one source — the legacy flat
 * {@link StructuredClinicalMetadata} fields (kept for back-compat + the
 * deterministic ISDM path) PLUS the versioned, provenance-tagged facts array.
 */
export interface CanonicalClinicalMetadata extends StructuredClinicalMetadata {
  schemaVersion: number
  extractorVersion: number
  /** Stable hash of the normalized source text — drives freshness gating. */
  contentHash: string
  facts: ClinicalFact[]
}

/** Narrowing helper used by the accessor + consumers. */
export function isFactKind<K extends ClinicalFactKind>(
  fact: ClinicalFact,
  kind: K,
): fact is Extract<ClinicalFact, { kind: K }> {
  return fact.kind === kind
}

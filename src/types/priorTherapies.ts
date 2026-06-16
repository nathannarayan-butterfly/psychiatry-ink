import type { UiLanguage } from './settings'

/**
 * Shared types for the "Bisher versuchte Medikamente" (Vortherapien) feature.
 * Kept dependency-light so both the server extraction route and the client can
 * import them without pulling in heavy client-only modules.
 */

export type PriorTherapyEvent =
  | 'discontinued'
  | 'no_response'
  | 'partial_response'
  | 'switched'
  | 'side_effect'
  | 'mentioned'

export type PriorTherapySource = 'plan' | 'aufnahme' | 'verlauf'

export type PriorTherapyTimeframe = 'current_admission' | 'history' | null

/** Raw item as produced by the server LLM extraction (free-text sources). */
export interface PriorTherapyExtractionItem {
  substance: string
  event: PriorTherapyEvent
  reason?: string | null
  timeframe: PriorTherapyTimeframe
  source: Exclude<PriorTherapySource, 'plan'>
  evidenceQuote: string
}

/**
 * Why a previously-tried medication likely FAILED (no response / partial /
 * discontinued for inefficacy). Designed to fold cleanly into the future unified
 * Clinical Metadata Extraction Agent (CMEA) — the cause taxonomy and signal
 * shapes are deliberately structured and source-agnostic.
 */
export type FailureCause =
  | 'subtherapeutic_level'
  | 'cyp_induction_smoking'
  | 'receptor_mismatch'
  | 'adherence'
  | 'inadequate_dose_duration'
  | 'insufficient_data'
  | 'other'

export interface FailureCauseHypothesis {
  cause: FailureCause
  /** Short, clinician-facing German explanation (advisory, never prescriptive). */
  explanation_de: string
  /** Concrete evidence backing the hypothesis (value, quote, status …). */
  evidence?: string
  /** 0–1 confidence; deterministic signals carry higher confidence than guesses. */
  confidence: number
}

export interface FailureAnalysis {
  likelyCauses: FailureCauseHypothesis[]
}

/** Documented serum level that sits below the therapeutic reference range. */
export interface SubtherapeuticLevelSignal {
  parameter: string
  value: number
  unit: string
  refMin?: number
  refMax?: number
  date?: string
}

/**
 * Deterministic signals computed client-side from structured data, fed to the
 * LLM synthesis (and used directly as the offline/mock result). Booleans/values
 * only — never raw patient identifiers or copyrighted criteria text.
 */
export interface DeterministicFailureSignals {
  substance: string
  /** Below-range documented level, if any was measured. */
  subtherapeuticLevel: SubtherapeuticLevelSignal | null
  /** True when any serum level for the substance was measured at all. */
  levelMeasured: boolean
  /** Patient smokes AND the substance is CYP1A2-dependent. */
  cyp1a2Smoking: boolean
  /** Raw smoking status (null = undocumented). */
  smoking: boolean | null
  /** Documented poor adherence with the supporting note. */
  poorAdherence: { note: string } | null
  /** Sub-therapeutic dose or too-short trial with the supporting detail. */
  inadequateDoseDuration: { detail: string } | null
  /** Dominant receptor axes (qualitative), for the LLM's pharmacodynamic reasoning. */
  receptorProfileSummary: string | null
}

/** Fully-resolved prior-therapy item used by the UI (plan or inferred). */
export interface PriorTherapyItem {
  substance: string
  event: PriorTherapyEvent
  reason: string | null
  timeframe: PriorTherapyTimeframe
  source: PriorTherapySource
  evidenceQuote: string | null
  /** True for LLM-derived (advisory) items; false for deterministic plan data. */
  inferred: boolean
  /** "Mögliche Ursache" for failed agents (no response / partial / inefficacy). */
  failureAnalysis?: FailureAnalysis
}

export interface PriorTherapiesRunRequest {
  caseId: string
  aufnahmeText: string
  verlaufText: string
  patientName?: string
  language?: UiLanguage
}

export interface PriorTherapiesRunResponse {
  items: PriorTherapyExtractionItem[]
  /** True when the result came from the mock provider (no API key configured). */
  mock: boolean
  deidentified: true
}

/** One failed drug + its deterministic signals, sent to the synthesis route. */
export interface PriorTherapyFailureDrugInput {
  substance: string
  event: PriorTherapyEvent
  reason?: string | null
  signals: DeterministicFailureSignals
}

export interface PriorTherapyFailureAnalysisRequest {
  caseId: string
  aufnahmeText: string
  verlaufText: string
  patientName?: string
  drugs: PriorTherapyFailureDrugInput[]
  language?: UiLanguage
}

export interface PriorTherapyFailureAnalysisResult {
  substance: string
  likelyCauses: FailureCauseHypothesis[]
}

export interface PriorTherapyFailureAnalysisResponse {
  analyses: PriorTherapyFailureAnalysisResult[]
  /** True when synthesised from signals only (mock provider / no API key). */
  mock: boolean
  deidentified: true
}

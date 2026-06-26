/**
 * ADR (adverse drug reaction) causality + management AI workflow.
 *
 * After a clinician reports a side effect ("Nebenwirkung melden"), this feature
 * assesses the reported symptom against the patient's CURRENT medication list,
 * suggests the likely causative drug(s) with a brief rationale (causality
 * assessment), and proposes ordered, actionable management steps.
 *
 * The likelihood scale is a paraphrased, licensing-safe adaptation of
 * established pharmacovigilance causality concepts (WHO-UMC system / Naranjo
 * algorithm) — no verbatim copyrighted criteria text. The source concept is
 * cited in `sources`.
 *
 * AI output is a SUPPORT tool only. Every assessment carries a clinical-judgment
 * disclaimer and is editable + savable by the clinician before it enters the
 * patient record. No automatic prescribing.
 */
import type { UiLanguage } from './settings'

/**
 * Causality likelihood per suspected drug. Stable identifiers; localized labels
 * are resolved in the UI layer. Paraphrased from WHO-UMC / Naranjo concepts.
 */
export type AdrCausalityLikelihood =
  | 'unlikely'
  | 'possible'
  | 'probable'
  | 'highly_probable'
  | 'unknown'

export const ADR_CAUSALITY_LIKELIHOODS: AdrCausalityLikelihood[] = [
  'unlikely',
  'possible',
  'probable',
  'highly_probable',
  'unknown',
]

/** A single suspected drug, ranked by causal plausibility for the reported symptom. */
export interface AdrSuspectedDrugAssessment {
  /** Links back to MedicationEntry.id when the AI suggestion matched a plan drug. */
  medicationId?: string
  /** Substance name as assessed (matches a current medication where possible). */
  substance: string
  likelihood: AdrCausalityLikelihood
  /** Brief paraphrased clinical rationale (mechanism / temporal fit / known profile). */
  rationale: string
}

/** One ordered, actionable management step. */
export interface AdrManagementStep {
  /** 1-based ordering for display. */
  order: number
  /** The concrete action to consider (e.g. "Dosisreduktion erwägen", "Pirenzepin erwägen"). */
  recommendation: string
  /** Optional short rationale for this step. */
  rationale?: string
  /** Optional escalation: what to consider if this step is ineffective. */
  ifIneffective?: string
}

/**
 * The complete, editable AI causality + management assessment. Stored on the
 * side-effect report once a clinician saves it into the record.
 */
export interface AdrCausalityAssessment {
  /** The reported symptom this assessment addresses. */
  symptom: string
  /** Suspected causative drugs, ordered by plausibility (most likely first). */
  suspectedDrugs: AdrSuspectedDrugAssessment[]
  /** Ordered, stepwise management options. */
  managementSteps: AdrManagementStep[]
  /** Clinical-judgment disclaimer (AI suggestion, not a prescription). */
  disclaimer: string
  /** Cited source concept for the causality scale (licensing-safe paraphrase). */
  sources?: string
  /** ISO timestamp the assessment was generated. */
  generatedAt: string
  /** Provenance label of the model that produced the suggestion. */
  model?: string
  /** True once a clinician edited the AI output. */
  edited?: boolean
  /** ISO timestamp the assessment was saved into the record. */
  savedAt?: string
}

/** Minimal medication context sent to the AI (no PHI beyond drug regimen facts). */
export interface AdrCausalityMedicationInput {
  id: string
  substance: string
  doseLineGerman?: string
  strength?: string
  startDate?: string
  status: string
  indication?: string
  lastChangeAt?: string
}

export interface AdrCausalityRequest {
  caseId: string
  /** Reported side-effect symptom (the "Nebenwirkung"). */
  symptom: string
  onsetDate?: string
  severity?: string
  temporalRelation?: string
  /** Free-text clinician note — de-identified server-side before egress. */
  note?: string
  /** Clinician's pre-flagged suspected medication id, if any. */
  suspectedMedicationId?: string
  /** The patient's CURRENT (active) medication list. */
  medications: AdrCausalityMedicationInput[]
  /** UI language for AI output (from Settings). */
  language?: UiLanguage
}

export interface AdrCausalityResponse {
  assessment: AdrCausalityAssessment
  model: { provider: string; modelId: string; label: string }
  /** Set when the AI returned no usable assessment. */
  aiWarning?: string
}

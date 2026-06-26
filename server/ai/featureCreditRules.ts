/**
 * Per-feature credit rules.
 *
 * baseCredits      — flat credits per call (before mode multiplier).
 * maxIncludedTokens — tokens included in baseCredits; overflow triggers per-block billing.
 * overflowTokenBlockSize — how many additional tokens = 1 overflow block.
 * overflowCreditsPerBlock — credits per overflow block (before mode multiplier).
 * allowedModes     — which modes are permitted for this feature.
 * defaultMode      — the mode used when the caller does not specify one.
 */

import type { AiMode } from '../../src/types/aiUsage'

export interface FeatureCreditRule {
  baseCredits: number
  maxIncludedTokens: number
  overflowTokenBlockSize: number
  overflowCreditsPerBlock: number
  allowedModes: AiMode[]
  defaultMode: AiMode
}

const ALL_MODES: AiMode[] = ['economic', 'standard', 'gruendlich']

/** Fallback rule for unrecognised feature keys. */
export const DEFAULT_RULE: FeatureCreditRule = {
  baseCredits: 2,
  maxIncludedTokens: 4000,
  overflowTokenBlockSize: 1000,
  overflowCreditsPerBlock: 1,
  allowedModes: ALL_MODES,
  defaultMode: 'standard',
}

/**
 * Credit rules indexed by AiFeatureKey (or any string feature key).
 * Keys include both legacy route-level keys and the new credit-system granular keys.
 */
export const FEATURE_CREDIT_RULES: Record<string, FeatureCreditRule> = {
  // ─── Credit-system granular keys ────────────────────────────────────────
  simple_rewrite: {
    baseCredits: 1,
    maxIncludedTokens: 2000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'economic',
  },
  short_verlauf: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  psychopathological_befund: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  somatic_befund: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  lab_formatting: {
    baseCredits: 1,
    maxIncludedTokens: 2000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'economic',
  },
  anamnesis_structuring: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  diagnosis_formulation: {
    baseCredits: 4,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  medication_summary: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  therapy_plan: {
    baseCredits: 4,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  arztbrief_section: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  discharge_summary_section: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  medication_education_single_section: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ['standard', 'gruendlich'],
    defaultMode: 'standard',
  },
  medication_education_combination_section: {
    baseCredits: 4,
    maxIncludedTokens: 6000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ['standard', 'gruendlich'],
    defaultMode: 'gruendlich',
  },
  full_arztbrief: {
    baseCredits: 8,
    maxIncludedTokens: 10000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  full_case_summary: {
    baseCredits: 10,
    maxIncludedTokens: 12000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'gruendlich',
  },
  forensic_risk_formulation: {
    baseCredits: 8,
    maxIncludedTokens: 8000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ['standard', 'gruendlich'],
    defaultMode: 'gruendlich',
  },
  medication_interaction_check: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  lab_medication_correlation_check: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  full_patient_build: {
    baseCredits: 15,
    maxIncludedTokens: 20000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 3,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  document_import_mapping: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  psychopathology_extraction: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  // Legacy alias of clinical_intelligence_discuss (not routed by any current
  // featureKey). Kept in sync with the live key for internal consistency.
  clinical_intelligence_discussion: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  template_ai_generate: {
    baseCredits: 4,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  template_block_fill: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  // Analyse an uploaded document and map it to a clinical template. Larger
  // context window than template_ai_generate (the whole document is sent),
  // billed like a generation with token overflow for long documents.
  template_from_document: {
    baseCredits: 4,
    maxIncludedTokens: 8000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  // Standalone, generic patient-education generation in the knowledge base.
  // Per-section call, billed like a single medication-education section.
  patient_education_generic: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ['standard', 'gruendlich'],
    defaultMode: 'standard',
  },

  // ─── Legacy route-level keys (mapped to closest credit rule equivalent) ─
  inline_text_edit: {
    baseCredits: 1,
    maxIncludedTokens: 2000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'economic',
  },
  anamnesis_generation: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  verlauf_generation: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  arztbrief_generation: {
    baseCredits: 8,
    maxIncludedTokens: 10000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  psychopathologischer_befund: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  document_generation: {
    baseCredits: 4,
    maxIncludedTokens: 6000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  pharma_ask: {
    baseCredits: 1,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'economic',
  },
  pharma_generate: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  discuss_case_ai: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  ask_butterfly: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  butterfly: {
    baseCredits: 4,
    maxIncludedTokens: 6000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  medication_combination_check: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  lab_medication_correlation: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  // ADR causality + stepwise management assessment. Richer two-part output
  // (per-drug causality ranking + ordered management plan) than a single
  // correlation check, billed one tier above lab/interaction checks, in line
  // with therapy_plan / diagnosis_formulation.
  adr_causality_assessment: {
    baseCredits: 4,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  prep_ai_check: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  prior_therapies: {
    baseCredits: 3,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  clinical_metadata_extraction: {
    baseCredits: 2,
    maxIncludedTokens: 3000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'economic',
  },
  // Each CI layer is a single structured-reasoning call over compact,
  // de-identified evidence — directly comparable to psychopathology_extraction
  // and the OpenAI second-opinion lab_medication_correlation_check. Priced at
  // baseCredits 3 / overflow 1 per block to match that mid-weight reasoning
  // band, rather than the heavier 4/2 generation tier.
  clinical_intelligence_dimensional: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  clinical_intelligence_mechanism: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  // A CI discussion turn mirrors the existing case-discussion chat feature
  // (discuss_case_ai): same 3 / 5000 / 1000 / 1 shape.
  clinical_intelligence_discuss: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  kb_seed: {
    baseCredits: 5,
    maxIncludedTokens: 8000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'gruendlich',
  },
  kb_pharmacokinetics: {
    baseCredits: 3,
    maxIncludedTokens: 5000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  kb_translation_de: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
  criteria_draft_generate: {
    baseCredits: 5,
    maxIncludedTokens: 8000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 2,
    allowedModes: ALL_MODES,
    defaultMode: 'gruendlich',
  },
  transcription: {
    baseCredits: 1,
    maxIncludedTokens: 1000,
    overflowTokenBlockSize: 500,
    overflowCreditsPerBlock: 1,
    allowedModes: ['economic'],
    defaultMode: 'economic',
  },
  unknown: {
    baseCredits: 2,
    maxIncludedTokens: 4000,
    overflowTokenBlockSize: 1000,
    overflowCreditsPerBlock: 1,
    allowedModes: ALL_MODES,
    defaultMode: 'standard',
  },
}

export function getFeatureCreditRule(featureKey: string): FeatureCreditRule {
  return FEATURE_CREDIT_RULES[featureKey] ?? DEFAULT_RULE
}

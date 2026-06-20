/**
 * Clinical Intelligence V1 — typed contracts.
 *
 * Clinical Intelligence (CI) is a NEW production-facing module that produces
 * clinician-reviewable hypotheses on top of the DE-IDENTIFIED compact evidence
 * base (the same `DiscussPackageContent` shape Butterfly already consumes).
 *
 * V1 has two layers:
 *   1. Dimensional Integration → 27 psychopathological dimensions
 *   2. Mechanism Inference     → 15 transdiagnostic mechanisms
 *
 * Everything CI produces is an **AI-generated clinical hypothesis** and must
 * be reviewed by the treating clinician before being acted on. No CI output
 * is ever auto-accepted into the patient record.
 *
 * Privacy guarantee: Only compact, de-identified evidence (no raw clinical
 * documents) is ever sent to CI APIs — enforced both server-side and via the
 * client-side `assertCompactEvidenceOnly` filter.
 */

import { z } from 'zod'
import type { DiscussPackageContent, DiscussPackageSection } from './discussCase'

// ─── Dimension catalog ─────────────────────────────────────────────────────

export const CLINICAL_INTELLIGENCE_DIMENSION_IDS = [
  'neurodevelopmental-architecture',
  'attention-executive-control',
  'cognitive-decline-neurocognitive-integrity',
  'aberrant-salience-psychotic-meaning',
  'perceptual-dysregulation',
  'self-disturbance-agency-dysfunction',
  'formal-thought-language-disorganization',
  'negative-deficit-dimension',
  'catatonic-motor-regulation',
  'depressive-inhibition',
  'reward-motivation-deficit',
  'mania-activation',
  'affective-instability-emotion-regulation',
  'anxiety-threat-anticipation',
  'trauma-stress-response',
  'dissociation-compartmentalization',
  'obsessive-compulsive-control-loop',
  'somatic-bodily-experience',
  'eating-weight-appetite-regulation',
  'impulsivity-disinhibition',
  'aggression-threat-reactivity',
  'personality-organization',
  'social-cognition-attachment',
  'sleep-circadian-regulation',
  'substance-addictive-contribution',
  'neurobiological-burden-medical-modifiers',
  'functional-longitudinal-adaptation',
] as const

export type ClinicalIntelligenceDimensionId =
  (typeof CLINICAL_INTELLIGENCE_DIMENSION_IDS)[number]

// ─── Mechanism catalog ─────────────────────────────────────────────────────

export const CLINICAL_INTELLIGENCE_MECHANISM_IDS = [
  'dopamine-aberrant-salience-dysregulation',
  'glutamate-gaba-dysconnectivity',
  'predictive-processing-bayesian-inference-dysfunction',
  'self-monitoring-agency-dysfunction',
  'trauma-limbic-hyperreactivity',
  'reward-processing-dysfunction',
  'executive-control-network-dysfunction',
  'social-cognition-mentalization-dysfunction',
  'neurodevelopmental-dysmaturation',
  'neurodegenerative-neurocognitive-decline',
  'circadian-sleep-wake-dysregulation',
  'stress-system-hpa-axis-dysregulation',
  'inflammatory-immunopsychiatric-dysregulation',
  'large-scale-network-connectivity-dysregulation',
  'habit-compulsion-loop-dysfunction',
] as const

export type ClinicalIntelligenceMechanismId =
  (typeof CLINICAL_INTELLIGENCE_MECHANISM_IDS)[number]

// ─── Shared enums ──────────────────────────────────────────────────────────

export const CI_REVIEW_STATUSES = ['pending', 'accepted', 'edited', 'rejected'] as const
export type CiReviewStatus = (typeof CI_REVIEW_STATUSES)[number]

export const CI_CONFIDENCES = ['low', 'moderate', 'high'] as const
export type CiConfidence = (typeof CI_CONFIDENCES)[number]

export const CI_SOURCES = ['evidence_based', 'exploratory'] as const
export type CiSource = (typeof CI_SOURCES)[number]

/** Severity is a 0–4 ordinal scale per dimension. */
export const CI_SEVERITY_VALUES = [0, 1, 2, 3, 4] as const
export type CiSeverity = (typeof CI_SEVERITY_VALUES)[number]

// ─── Zod schemas ───────────────────────────────────────────────────────────

const DimensionIdSchema = z.enum(CLINICAL_INTELLIGENCE_DIMENSION_IDS)
const MechanismIdSchema = z.enum(CLINICAL_INTELLIGENCE_MECHANISM_IDS)
const ReviewStatusSchema = z.enum(CI_REVIEW_STATUSES)
const ConfidenceSchema = z.enum(CI_CONFIDENCES)
const SourceSchema = z.enum(CI_SOURCES)
const SeveritySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

/** Compact evidence item ID — references a `DiscussPackageSection.id`. */
const EvidenceIdSchema = z.string().min(1).max(120)

const ShortStringSchema = z.string().min(1).max(600)
const LongStringSchema = z.string().min(1).max(1_400)

export const DimensionalFindingSchema = z.object({
  dimensionId: DimensionIdSchema,
  dimensionName: z.string().min(1).max(120),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  longitudinalPattern: z.string().max(400).default(''),
  supportingEvidenceIds: z.array(EvidenceIdSchema).max(30).default([]),
  contradictingEvidenceIds: z.array(EvidenceIdSchema).max(30).default([]),
  clinicalSummary: ShortStringSchema,
  uncertainty: z.string().max(400).default(''),
  missingData: z.string().max(400).default(''),
  reviewStatus: ReviewStatusSchema.default('pending'),
  source: SourceSchema,
})

export type DimensionalFinding = z.infer<typeof DimensionalFindingSchema>

export const MechanismHypothesisSchema = z.object({
  mechanismId: MechanismIdSchema,
  label: z.string().min(1).max(160),
  confidence: ConfidenceSchema,
  linkedDimensions: z.array(DimensionIdSchema).max(27).default([]),
  supportingEvidenceIds: z.array(EvidenceIdSchema).max(30).default([]),
  contradictingEvidenceIds: z.array(EvidenceIdSchema).max(30).default([]),
  clinicalImplication: ShortStringSchema,
  treatmentRelevance: LongStringSchema,
  uncertainty: z.string().max(400).default(''),
  reviewStatus: ReviewStatusSchema.default('pending'),
  source: SourceSchema,
})

export type MechanismHypothesis = z.infer<typeof MechanismHypothesisSchema>

export const QuarantineEntrySchema = z.object({
  kind: z.enum(['dimension', 'mechanism']),
  rawId: z.string().max(120).default(''),
  reason: z.string().min(1).max(400),
})

export type QuarantineEntry = z.infer<typeof QuarantineEntrySchema>

export const ExploratoryNoteSchema = z.object({
  topic: z.string().min(1).max(160),
  rationale: z.string().min(1).max(600),
})

export type ExploratoryNote = z.infer<typeof ExploratoryNoteSchema>

export const DimensionalIntegrationResultSchema = z.object({
  activeDimensions: z.array(DimensionalFindingSchema).max(27).default([]),
  exploratoryInsufficientEvidence: z.array(ExploratoryNoteSchema).max(27).default([]),
  quarantined: z.array(QuarantineEntrySchema).default([]),
  warning: z.string().max(400).optional(),
})

export type DimensionalIntegrationResult = z.infer<typeof DimensionalIntegrationResultSchema>

export const MechanismInferenceResultSchema = z.object({
  activeMechanisms: z.array(MechanismHypothesisSchema).max(15).default([]),
  exploratoryInsufficientEvidence: z.array(ExploratoryNoteSchema).max(15).default([]),
  quarantined: z.array(QuarantineEntrySchema).default([]),
  warning: z.string().max(400).optional(),
})

export type MechanismInferenceResult = z.infer<typeof MechanismInferenceResultSchema>

// ─── Compact evidence payload (CI-side mirror of DiscussPackage) ───────────

/**
 * Compact evidence item — one section of the de-identified package.
 *
 * `id` MUST be stable so cards can reference back into the chart. We keep the
 * field set intentionally small (no PHI fields) to make accidental leakage
 * obvious in a code review.
 */
export const CompactEvidenceItemSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().max(160).default(''),
  category: z.string().max(80).default(''),
  /** De-identified text body. Server re-applies redaction defensively. */
  text: z.string().max(15_000),
})

export type CompactEvidenceItem = z.infer<typeof CompactEvidenceItemSchema>

export const CompactEvidencePayloadSchema = z.object({
  /** Stable case identifier (already de-identified upstream). */
  caseId: z.string().min(1).max(160),
  builtAt: z.string().min(8).max(40),
  isDeidentified: z.literal(true),
  patientLabel: z.string().max(80).default('Patient'),
  items: z.array(CompactEvidenceItemSchema).max(40),
})

export type CompactEvidencePayload = z.infer<typeof CompactEvidencePayloadSchema>

// ─── API request / response shapes ─────────────────────────────────────────

export const CLINICAL_INTELLIGENCE_LAYERS = ['dimensional', 'mechanism'] as const
export type ClinicalIntelligenceLayer = (typeof CLINICAL_INTELLIGENCE_LAYERS)[number]

export const ClinicalIntelligenceLayerModelSchema = z.object({
  provider: z.string().min(1).max(40),
  modelId: z.string().min(1).max(80),
})

export const ClinicalIntelligenceLayerCallSchema = z.object({
  tier: z.enum(['fast', 'standard', 'thorough']).optional(),
  model: ClinicalIntelligenceLayerModelSchema.optional(),
})

export type ClinicalIntelligenceLayerCall = z.infer<typeof ClinicalIntelligenceLayerCallSchema>

export const ClinicalIntelligenceRunRequestSchema = z.object({
  language: z.enum(['de', 'en', 'fr', 'es']),
  evidence: CompactEvidencePayloadSchema,
  /**
   * IDs of dimensions/mechanisms that were previously rejected by a clinician.
   * These MUST be excluded from this run unless explicitly regenerated.
   */
  rejectedDimensionIds: z.array(DimensionIdSchema).max(27).default([]),
  rejectedMechanismIds: z.array(MechanismIdSchema).max(15).default([]),
  /** Optional per-layer model overrides — selected by the user in Settings → KI. */
  dimensionalCall: ClinicalIntelligenceLayerCallSchema.optional(),
  mechanismCall: ClinicalIntelligenceLayerCallSchema.optional(),
  /** Skip the mechanism layer (caller already has accepted dimensions only). */
  layers: z.array(z.enum(CLINICAL_INTELLIGENCE_LAYERS)).min(1).default(['dimensional', 'mechanism']),
})

export type ClinicalIntelligenceRunRequest = z.infer<typeof ClinicalIntelligenceRunRequestSchema>

export const ClinicalIntelligenceLayerDiagnosticsSchema = z.object({
  provider: z.string().min(1).max(40),
  modelId: z.string().min(1).max(80),
  tier: z.string().min(1).max(40),
  mock: z.boolean(),
  promptCharCount: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  latencyMs: z.number().int().nonnegative(),
  truncated: z.boolean(),
  validation: z.object({
    salvagedCount: z.number().int().nonnegative(),
    quarantinedCount: z.number().int().nonnegative(),
    issues: z.array(z.string()).default([]),
  }),
  rawResponseSnippet: z.string().max(4_000),
  error: z.string().max(600).nullable(),
})

export type ClinicalIntelligenceLayerDiagnostics = z.infer<
  typeof ClinicalIntelligenceLayerDiagnosticsSchema
>

export const ClinicalIntelligenceRunResponseSchema = z.object({
  builtAt: z.string().min(8).max(40),
  language: z.enum(['de', 'en', 'fr', 'es']),
  dimensional: DimensionalIntegrationResultSchema,
  mechanism: MechanismInferenceResultSchema,
  evidenceItemCount: z.number().int().nonnegative(),
  diagnostics: z.object({
    dimensional: ClinicalIntelligenceLayerDiagnosticsSchema.nullable(),
    mechanism: ClinicalIntelligenceLayerDiagnosticsSchema.nullable(),
  }),
})

export type ClinicalIntelligenceRunResponse = z.infer<
  typeof ClinicalIntelligenceRunResponseSchema
>

// ─── Audit trail ───────────────────────────────────────────────────────────

export const CiAuditActionSchema = z.enum([
  'run-started',
  'run-completed',
  'run-failed',
  'dimension-accepted',
  'dimension-edited',
  'dimension-rejected',
  'dimension-bulk-accepted',
  'mechanism-accepted',
  'mechanism-edited',
  'mechanism-rejected',
  'mechanism-bulk-accepted',
  'evidence-base-missing',
  'clinician-comment-saved',
  'accepted-findings-saved',
])

export type CiAuditAction = z.infer<typeof CiAuditActionSchema>

export const CiAuditEntrySchema = z.object({
  id: z.string().min(1).max(80),
  timestamp: z.string().min(8).max(40),
  action: CiAuditActionSchema,
  actor: z.string().max(120).default('clinician'),
  targetKind: z.enum(['dimension', 'mechanism', 'run']),
  targetId: z.string().max(120).default(''),
  notes: z.string().max(600).default(''),
})

export type CiAuditEntry = z.infer<typeof CiAuditEntrySchema>

// ─── CI discuss chat ───────────────────────────────────────────────────────

export const CiDiscussMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4_000),
})

export type CiDiscussMessage = z.infer<typeof CiDiscussMessageSchema>

/** Compact finding sent to the discuss endpoint — no raw chart text. */
export const CiDiscussDimensionSchema = z.object({
  dimensionId: DimensionIdSchema,
  dimensionName: z.string().max(120),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  reviewStatus: ReviewStatusSchema,
  clinicalSummary: z.string().max(600),
  supportingEvidenceIds: z.array(EvidenceIdSchema).max(30),
})

export const CiDiscussMechanismSchema = z.object({
  mechanismId: MechanismIdSchema,
  label: z.string().max(160),
  confidence: ConfidenceSchema,
  reviewStatus: ReviewStatusSchema,
  clinicalImplication: z.string().max(600),
  linkedDimensions: z.array(DimensionIdSchema).max(27),
  supportingEvidenceIds: z.array(EvidenceIdSchema).max(30),
})

export const CiDiscussEvidenceItemSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().max(160),
  category: z.string().max(80),
  /** Truncated de-identified summary — never full chart sections. */
  summary: z.string().max(400),
})

export const ClinicalIntelligenceDiscussContextSchema = z.object({
  caseId: z.string().min(1).max(160),
  language: z.enum(['de', 'en', 'fr', 'es']),
  builtAt: z.string().min(8).max(40),
  clinicianComment: z.string().max(2_000).default(''),
  dimensions: z.array(CiDiscussDimensionSchema).max(27),
  mechanisms: z.array(CiDiscussMechanismSchema).max(15),
  evidenceItems: z.array(CiDiscussEvidenceItemSchema).max(40),
})

export type ClinicalIntelligenceDiscussContext = z.infer<
  typeof ClinicalIntelligenceDiscussContextSchema
>

export const ClinicalIntelligenceDiscussRequestSchema = z.object({
  messages: z.array(CiDiscussMessageSchema).min(1).max(40),
  context: ClinicalIntelligenceDiscussContextSchema,
  tier: z.enum(['fast', 'standard', 'thorough']).optional(),
  model: ClinicalIntelligenceLayerModelSchema.optional(),
  language: z.enum(['de', 'en', 'fr', 'es']).optional(),
})

export type ClinicalIntelligenceDiscussRequest = z.infer<
  typeof ClinicalIntelligenceDiscussRequestSchema
>

// ─── Persisted CI state per case ───────────────────────────────────────────

export const CLINICAL_INTELLIGENCE_STATE_VERSION = 1 as const

export const ClinicalIntelligenceCaseStateSchema = z.object({
  version: z.literal(CLINICAL_INTELLIGENCE_STATE_VERSION),
  caseId: z.string().min(1).max(160),
  latestRun: ClinicalIntelligenceRunResponseSchema.nullable(),
  rejectedDimensionIds: z.array(DimensionIdSchema).default([]),
  rejectedMechanismIds: z.array(MechanismIdSchema).default([]),
  audit: z.array(CiAuditEntrySchema).max(500).default([]),
  clinicianComment: z.string().max(2_000).default(''),
  discussMessages: z.array(CiDiscussMessageSchema).max(80).default([]),
  savedAcceptedAt: z.string().max(40).nullable().default(null),
})

export type ClinicalIntelligenceCaseState = z.infer<
  typeof ClinicalIntelligenceCaseStateSchema
>

export function emptyClinicalIntelligenceCaseState(
  caseId: string,
): ClinicalIntelligenceCaseState {
  return {
    version: CLINICAL_INTELLIGENCE_STATE_VERSION,
    caseId,
    latestRun: null,
    rejectedDimensionIds: [],
    rejectedMechanismIds: [],
    audit: [],
    clinicianComment: '',
    discussMessages: [],
    savedAcceptedAt: null,
  }
}

// ─── Helpers used across client + server ───────────────────────────────────

/**
 * Convert a (de-identified) DiscussPackageContent into the CI-internal
 * compact evidence payload. CI only ever consumes this shape — never the
 * raw clinical chart, and never an identified package.
 */
export function compactEvidenceFromDiscussPackage(
  pkg: DiscussPackageContent,
): CompactEvidencePayload {
  return {
    caseId: pkg.caseId,
    builtAt: pkg.builtAt,
    isDeidentified: true,
    patientLabel: pkg.patientLabel?.trim() || 'Patient',
    items: pkg.sections.map((section: DiscussPackageSection) => ({
      id: section.id,
      label: section.label ?? '',
      category: section.key,
      text: section.content ?? '',
    })),
  }
}

export function hasUsableCompactEvidence(payload: CompactEvidencePayload): boolean {
  const totalChars = payload.items.reduce((sum, item) => sum + item.text.trim().length, 0)
  return totalChars >= 40 && payload.items.some((item) => item.text.trim().length > 0)
}

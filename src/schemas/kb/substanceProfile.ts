import { z } from 'zod'

export const ReceptorAffinityDraftSchema = z.object({
  receptor: z.string().min(1),
  affinityPercent: z.number().min(0).max(100).nullable().optional(),
  effectType: z.string().optional(),
  confidence: z.string().optional(),
  explanation: z.string().optional(),
  rawKiNm: z.number().positive().nullable().optional(),
  pKi: z.number().nullable().optional(),
  isEstimated: z.boolean().optional(),
})

export const SideEffectDraftSchema = z.object({
  effect: z.string().min(1),
  system: z.string().optional(),
  frequency: z.string().optional(),
  severity: z.string().optional(),
  note: z.string().optional(),
})

export const MonitoringDraftSchema = z.object({
  parameter: z.string().min(1),
  interval: z.string().optional(),
  rationale: z.string().optional(),
  priority: z.string().optional(),
})

export const DosageGuidanceDraftSchema = z.object({
  population: z.string().optional(),
  startDose: z.string().optional(),
  targetDose: z.string().optional(),
  maxDose: z.string().optional(),
  titrationNotes: z.string().optional(),
  administrationNotes: z.string().optional(),
})

export const InteractionDraftSchema = z.object({
  interactsWith: z.string().min(1),
  severity: z.string().optional(),
  mechanism: z.string().optional(),
  clinicalManagement: z.string().optional(),
})

export const CountryPreparationDraftSchema = z.object({
  countryCode: z.string().min(2).max(3),
  dosageForm: z.string().min(1),
  strengthValue: z.string().min(1),
  strengthUnit: z.string().min(1),
  route: z.string().min(1),
  tradeName: z.string().optional(),
  notes: z.string().optional(),
})

export const PharmacokineticTdmDraftSchema = z.object({
  lowNgMl: z.number().positive().nullable().optional(),
  highNgMl: z.number().positive().nullable().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
})

export const PharmacokineticDraftSchema = z.object({
  /** German narrative (primary display in Psychiatry.Ink). */
  summaryDe: z.string().min(1),
  /** Optional English source narrative. */
  summary: z.string().optional(),
  halfLifeHours: z.number().positive().nullable().optional(),
  halfLifeNote: z.string().optional(),
  halfLifeNoteDe: z.string().optional(),
  tmaxHours: z.number().positive().nullable().optional(),
  timeToSteadyStateDays: z.number().positive().nullable().optional(),
  bioavailabilityPercent: z.number().min(0).max(100).nullable().optional(),
  proteinBindingPercent: z.number().min(0).max(100).nullable().optional(),
  tdm: PharmacokineticTdmDraftSchema.nullish(),
  isEstimated: z.boolean().optional(),
  sourceNote: z.string().optional(),
})

export const SubstanceProfileDraftSchema = z.object({
  genericName: z.string().min(1),
  normalizedGenericName: z.string().min(1),
  commonTradeNames: z.array(z.string()).default([]),
  substanceClass: z.string().optional(),
  primaryPsychiatricUses: z.array(z.string()).default([]),
  mechanismSummary: z.string().optional(),
  receptorAffinityProfile: z.array(ReceptorAffinityDraftSchema).default([]),
  pharmacodynamicProfile: z.string().optional(),
  pharmacokinetics: PharmacokineticDraftSchema.optional(),
  commonDosageGuidance: z.array(DosageGuidanceDraftSchema).default([]),
  importantSideEffects: z.array(SideEffectDraftSchema).default([]),
  severeRisks: z.array(z.string()).default([]),
  monitoringRecommendations: z.array(MonitoringDraftSchema).default([]),
  contraindications: z.array(z.string()).default([]),
  importantInteractions: z.array(InteractionDraftSchema).default([]),
  pregnancyLactationCaution: z.string().optional(),
  geriatricCaution: z.string().optional(),
  hepaticRenalCaution: z.string().optional(),
  clinicalPearls: z.string().optional(),
  uncertaintyNotes: z.string().optional(),
  sourceHints: z.array(z.string()).default([]),
  countryPreparations: z.array(CountryPreparationDraftSchema).optional(),
})

export const AiGenerationRecordSchema = z.object({
  genericName: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().default('v1'),
  status: z.enum(['success', 'failed_validation', 'failed_api', 'dry_run']),
  rawResponse: z.unknown().optional(),
  validatedPayload: z.unknown().optional(),
  validationErrors: z.unknown().optional(),
  tokenCount: z.number().int().optional(),
  durationMs: z.number().int().optional(),
})

export type ReceptorAffinityDraft = z.infer<typeof ReceptorAffinityDraftSchema>
export type SideEffectDraft = z.infer<typeof SideEffectDraftSchema>
export type MonitoringDraft = z.infer<typeof MonitoringDraftSchema>
export type DosageGuidanceDraft = z.infer<typeof DosageGuidanceDraftSchema>
export type InteractionDraft = z.infer<typeof InteractionDraftSchema>
export type PharmacokineticDraft = z.infer<typeof PharmacokineticDraftSchema>
export type SubstanceProfileDraft = z.infer<typeof SubstanceProfileDraftSchema>
export type AiGenerationRecord = z.infer<typeof AiGenerationRecordSchema>

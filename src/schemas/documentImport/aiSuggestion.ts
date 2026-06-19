/**
 * Schemas for the (flag-gated) AI mapping suggestion exchange.
 *
 * AI only ever proposes a *module mapping* for an already-parsed candidate. It
 * never returns clinical content, and the client only ever sends de-identified
 * text. Suggestions are advisory — they are applied as `aiSuggested` candidates
 * that still require explicit clinician acceptance.
 */
import { z } from 'zod'
import { CandidateModuleSchema } from './envelope'

export const ImportMappingRequestItemSchema = z.object({
  candidateId: z.string().min(1),
  /** De-identified snippet (see `deidentifyText`). */
  deidentifiedText: z.string().min(1),
  currentModule: CandidateModuleSchema,
})
export type ImportMappingRequestItem = z.infer<typeof ImportMappingRequestItemSchema>

export const ImportMappingRequestSchema = z.object({
  language: z.enum(['de', 'en', 'fr', 'es']).default('de'),
  items: z.array(ImportMappingRequestItemSchema).min(1).max(50),
})
export type ImportMappingRequest = z.infer<typeof ImportMappingRequestSchema>

export const ImportMappingSuggestionSchema = z.object({
  candidateId: z.string().min(1),
  suggestedModule: CandidateModuleSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  rationale: z.string().default(''),
})
export type ImportMappingSuggestion = z.infer<typeof ImportMappingSuggestionSchema>

export const ImportMappingResponseSchema = z.object({
  suggestions: z.array(ImportMappingSuggestionSchema),
  mock: z.boolean().optional(),
})
export type ImportMappingResponse = z.infer<typeof ImportMappingResponseSchema>

// ---------------------------------------------------------------------------
// Post-parse analyze — mapping + Übersicht widget suggestions (de-identified)
// ---------------------------------------------------------------------------

export const ImportAnalyzeCandidateSummarySchema = z.object({
  candidateId: z.string().min(1),
  module: CandidateModuleSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  /** Structural hint only — headings, section labels, column names; no narrative. */
  structuralHint: z.string().min(1),
  needsMappingAssist: z.boolean(),
})
export type ImportAnalyzeCandidateSummary = z.infer<typeof ImportAnalyzeCandidateSummarySchema>

export const ImportAnalyzeMetadataSchema = z.object({
  detectedFormat: z.string().min(1),
  parsingMode: z.enum(['structured', 'stored_only']),
  /** De-identified column / sheet labels when tabular. */
  columns: z.array(z.string()).optional(),
  sheetNames: z.array(z.string()).optional(),
  moduleCounts: z.record(z.string(), z.number().int().nonnegative()),
  noticeCodes: z.array(z.string()),
  candidates: z.array(ImportAnalyzeCandidateSummarySchema).max(100),
})
export type ImportAnalyzeMetadata = z.infer<typeof ImportAnalyzeMetadataSchema>

export const ComplianceOverviewSuggestionSchema = z.object({
  widget: z.literal('compliance'),
  itemLabel: z.string().min(1),
  itemGroup: z.enum(['medication', 'therapy']),
  status: z.enum(['yes', 'partial', 'no']),
  rationale: z.string().default(''),
})
export type ComplianceOverviewSuggestion = z.infer<typeof ComplianceOverviewSuggestionSchema>

export const RegisteredTherapyOverviewSuggestionSchema = z.object({
  widget: z.literal('angemeldete-therapien'),
  kind: z.string().min(1),
  label: z.string().min(1),
  goalSummary: z.string().optional(),
  rationale: z.string().default(''),
})
export type RegisteredTherapyOverviewSuggestion = z.infer<
  typeof RegisteredTherapyOverviewSuggestionSchema
>

export const PsychotherapyOverviewSuggestionSchema = z.object({
  widget: z.literal('psychotherapy'),
  method: z.string().optional(),
  mainGoal: z.string().optional(),
  rationale: z.string().default(''),
})
export type PsychotherapyOverviewSuggestion = z.infer<typeof PsychotherapyOverviewSuggestionSchema>

export const VerlaufstendenzOverviewSuggestionSchema = z.object({
  widget: z.literal('verlaufstendenz'),
  courseDirection: z.enum([
    'improved',
    'stable',
    'worsened',
    'fluctuating',
    'resolved',
    'unclear',
  ]),
  rationale: z.string().default(''),
})
export type VerlaufstendenzOverviewSuggestion = z.infer<
  typeof VerlaufstendenzOverviewSuggestionSchema
>

export const SafetyOverviewSuggestionSchema = z.object({
  widget: z.literal('safety'),
  category: z.enum(['risk', 'allergy', 'interaction', 'monitoring']),
  title: z.string().min(1),
  detail: z.string().optional(),
  rationale: z.string().default(''),
})
export type SafetyOverviewSuggestion = z.infer<typeof SafetyOverviewSuggestionSchema>

export const OverviewWidgetSuggestionSchema = z.discriminatedUnion('widget', [
  ComplianceOverviewSuggestionSchema,
  RegisteredTherapyOverviewSuggestionSchema,
  PsychotherapyOverviewSuggestionSchema,
  VerlaufstendenzOverviewSuggestionSchema,
  SafetyOverviewSuggestionSchema,
])
export type OverviewWidgetSuggestion = z.infer<typeof OverviewWidgetSuggestionSchema>

export const ImportAnalyzeRequestSchema = z.object({
  language: z.enum(['de', 'en', 'fr', 'es']).default('de'),
  metadata: ImportAnalyzeMetadataSchema,
  /** De-identified mapping items for uncertain candidates (may be empty). */
  mappingItems: z.array(ImportMappingRequestItemSchema).max(50).default([]),
  /** Standard vs enterprise — compliance widget shape differs. */
  edition: z.enum(['standard', 'enterprise']).default('standard'),
})
export type ImportAnalyzeRequest = z.infer<typeof ImportAnalyzeRequestSchema>

export const ImportAnalyzeResponseSchema = z.object({
  mappingSuggestions: z.array(ImportMappingSuggestionSchema).default([]),
  overviewWidgetSuggestions: z.array(OverviewWidgetSuggestionSchema).default([]),
  /** One-sentence de-identified clinical context for the patient hero subheading. */
  patientSubheading: z.string().min(10).max(280).optional(),
  mock: z.boolean().optional(),
})
export type ImportAnalyzeResponse = z.infer<typeof ImportAnalyzeResponseSchema>

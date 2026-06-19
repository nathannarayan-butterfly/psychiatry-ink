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

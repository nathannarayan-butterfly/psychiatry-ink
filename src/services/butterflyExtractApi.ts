import { clinicalApiFetch, getClinicalApiLanguage, parseClinicalApiError } from './clinicalApiFetch'
import type { DiscussPackageContent } from '../types/discussCase'

export type ButterflyCriterionStatus = 'met' | 'not_met' | 'unclear'

export interface ButterflyCriterionQuery {
  id: string
  /** OUR original operational paraphrase — never copyrighted criterion text. */
  text: string
}

export interface ButterflyExtractionResult {
  id: string
  status: ButterflyCriterionStatus
  evidenceQuote: string | null
  confidence: number
  provenance: 'pending_clinician_review'
  evidenceStrength: 'inferred'
}

export interface ButterflyExtractionResponse {
  disorderName: string
  model: { provider: string; modelId: string }
  mock: boolean
  results: ButterflyExtractionResult[]
  disclaimer: string
}

export interface ButterflyExtractInput {
  caseId: string
  disorderId: string
  disorderName: string
  criteria: ButterflyCriterionQuery[]
  /** De-identified Aufnahme + Verlauf package. */
  packageContent: DiscussPackageContent
  tier?: 'fast' | 'standard' | 'thorough'
  language?: string
}

/**
 * Ask the server to resolve unresolved criteria from de-identified documentation.
 * Returns AI-SUGGESTED, pending-review results — never auto-accepted.
 */
export async function extractButterflyCriteria(
  input: ButterflyExtractInput,
): Promise<ButterflyExtractionResponse> {
  const response = await clinicalApiFetch('/api/butterfly/extract', {
    method: 'POST',
    body: JSON.stringify({
      caseId: input.caseId,
      disorderId: input.disorderId,
      disorderName: input.disorderName,
      criteria: input.criteria,
      package: input.packageContent,
      tier: input.tier ?? 'fast',
      language: input.language ?? getClinicalApiLanguage(),
    }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Butterfly-Prüfung fehlgeschlagen')
  return (await response.json()) as ButterflyExtractionResponse
}

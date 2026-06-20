import { clinicalApiFetch, getClinicalApiLanguage, parseClinicalApiError } from './clinicalApiFetch'
import { resolveLlmRequestForTask } from '../utils/resolveAiModel'
import type { ClinicalFact } from '../types/clinicalMetadata'
import type { ClinicalSourceType } from '../types/clinicalImprint'

/** One changed source sent to the central CMEA extraction route. */
export interface CmeaSectionRequest {
  sourceId: string
  sourceType: ClinicalSourceType
  sourceDate: string
  /** Identified text — the server de-identifies it before the LLM (authoritative). */
  text: string
}

export interface CmeaExtractInput {
  caseId: string
  sections: CmeaSectionRequest[]
  patientName?: string
  tier?: 'fast' | 'standard' | 'thorough'
  language?: string
}

export interface CmeaExtractResponse {
  caseId: string
  model: { provider: string; modelId: string }
  mock: boolean
  facts: ClinicalFact[]
  deidentified: true
  disclaimer: string
}

/**
 * Run the ONE central, de-identified LLM extraction for a case's changed
 * sources. Returns provenance-tagged facts (extractor 'llm'). The server
 * de-identifies, meters credits, and returns empty facts in mock mode so the
 * deterministic regex pass always stands.
 */
export async function extractClinicalMetadata(
  input: CmeaExtractInput,
): Promise<CmeaExtractResponse> {
  const llm = resolveLlmRequestForTask('clinical_metadata')
  const response = await clinicalApiFetch('/api/clinical-metadata/extract', {
    method: 'POST',
    body: JSON.stringify({
      caseId: input.caseId,
      sections: input.sections,
      patientName: input.patientName,
      tier: input.tier ?? llm.tier,
      model: llm.model,
      language: input.language ?? getClinicalApiLanguage(),
    }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Klinische Faktenextraktion fehlgeschlagen')
  return (await response.json()) as CmeaExtractResponse
}

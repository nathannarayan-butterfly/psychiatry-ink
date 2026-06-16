import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import type {
  PriorTherapiesRunRequest,
  PriorTherapiesRunResponse,
  PriorTherapyFailureAnalysisRequest,
  PriorTherapyFailureAnalysisResponse,
} from '../types/priorTherapies'

/**
 * Run the server-side LLM extraction of previously-tried medications over the
 * (identified) Aufnahme + Verlauf text. The server de-identifies the text before
 * the LLM sees it, meters credits, and honours mock mode when no key is set.
 */
export async function runPriorTherapyExtraction(
  input: PriorTherapiesRunRequest,
): Promise<PriorTherapiesRunResponse> {
  const response = await clinicalApiFetch('/api/medication/prior-therapies/run', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Vortherapien-Analyse fehlgeschlagen')
  return (await response.json()) as PriorTherapiesRunResponse
}

/**
 * Synthesise the likely-cause ("mögliche Ursache") hypotheses for failed prior
 * therapies. Sends the deterministic signals + the (identified) narrative; the
 * server de-identifies the narrative before the LLM, meters credits, and falls
 * back to deterministic synthesis in mock mode.
 */
export async function runPriorTherapyFailureAnalysis(
  input: PriorTherapyFailureAnalysisRequest,
): Promise<PriorTherapyFailureAnalysisResponse> {
  const response = await clinicalApiFetch('/api/medication/prior-therapies/failure-analysis', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Ursachenanalyse fehlgeschlagen')
  return (await response.json()) as PriorTherapyFailureAnalysisResponse
}

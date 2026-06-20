/**
 * Clinical Intelligence — single-request API client.
 *
 * One server call runs both layers (dimensional + mechanism). The client
 * guards the outbound payload via `assertCompactEvidenceOnly` so the route
 * never sees raw documents even if the caller wires it up incorrectly.
 */

import { clinicalApiFetch } from '../clinicalApiFetch'
import { parseCiApiError } from './parseCiApiError'
import { resolveLlmRequestForTask } from '../../utils/resolveAiModel'
import {
  ClinicalIntelligenceRunRequestSchema,
  ClinicalIntelligenceRunResponseSchema,
  type ClinicalIntelligenceRunRequest,
  type ClinicalIntelligenceRunResponse,
} from '../../types/clinicalIntelligence'
import { assertCompactEvidenceOnly } from '../../utils/clinicalIntelligence/evidenceFilter'

/** Standard endpoint path for the CI run. */
export const CLINICAL_INTELLIGENCE_RUN_ENDPOINT = '/api/clinical-intelligence/run'

export interface RunClinicalIntelligenceOptions {
  signal?: AbortSignal
}

export async function runClinicalIntelligence(
  request: ClinicalIntelligenceRunRequest,
  options: RunClinicalIntelligenceOptions = {},
): Promise<ClinicalIntelligenceRunResponse> {
  // Defensive: re-assert the evidence payload shape before we leave the client.
  assertCompactEvidenceOnly(request.evidence)

  // Per-task model resolution from Settings → KI.
  const dimensionalCall =
    request.dimensionalCall ?? resolveLlmRequestForTask('clinical_intelligence_dimensional')
  const mechanismCall =
    request.mechanismCall ?? resolveLlmRequestForTask('clinical_intelligence_mechanism')

  const fullRequest: ClinicalIntelligenceRunRequest = {
    ...request,
    dimensionalCall,
    mechanismCall,
  }

  const parsedRequest = ClinicalIntelligenceRunRequestSchema.safeParse(fullRequest)
  if (!parsedRequest.success) {
    throw new Error('Clinical Intelligence request failed local validation')
  }

  const response = await clinicalApiFetch(CLINICAL_INTELLIGENCE_RUN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(parsedRequest.data),
    signal: options.signal,
  })

  if (!response.ok) {
    throw await parseCiApiError(response, 'Clinical Intelligence run failed')
  }

  const json = (await response.json().catch(() => null)) as unknown
  const parsedResponse = ClinicalIntelligenceRunResponseSchema.safeParse(json)
  if (!parsedResponse.success) {
    throw new Error('Clinical Intelligence response failed schema validation')
  }
  return parsedResponse.data
}

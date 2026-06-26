import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import type { AdrCausalityRequest, AdrCausalityResponse } from '../types/adrCausality'

export async function runAdrCausalityAssessment(
  input: AdrCausalityRequest,
): Promise<AdrCausalityResponse> {
  const response = await clinicalApiFetch('/api/medication/adr-causality', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Kausalitätszuordnung fehlgeschlagen')
  return (await response.json()) as AdrCausalityResponse
}

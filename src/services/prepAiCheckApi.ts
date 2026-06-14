import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import type { PrepAiCheckRequest, PrepAiCheckResponse } from '../types/prepAiCheck'

export async function runPrepAiCheck(input: PrepAiCheckRequest): Promise<PrepAiCheckResponse> {
  const response = await clinicalApiFetch('/api/medication/prep-ai-check', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Verfügbarkeitsprüfung fehlgeschlagen')
  return (await response.json()) as PrepAiCheckResponse
}

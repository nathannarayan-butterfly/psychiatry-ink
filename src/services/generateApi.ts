import type { AiModelTier } from '../types'
import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'

export interface GenerateApiRequest {
  tier: AiModelTier
  systemPrompt: string
  userPrompt: string
  caseId?: string
}

/** Authenticated proxy to POST /api/generate (auth + org headers via clinicalApiFetch). */
export async function callGenerateApi(request: GenerateApiRequest): Promise<string> {
  const response = await clinicalApiFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      tier: request.tier,
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      ...(request.caseId?.trim() ? { caseId: request.caseId.trim() } : {}),
    }),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'KI-Anfrage fehlgeschlagen')
  }

  const data = (await response.json()) as { text: string }
  return data.text
}

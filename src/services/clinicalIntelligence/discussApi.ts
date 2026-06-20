import { clinicalApiFetch } from '../clinicalApiFetch'
import { parseCiApiError } from './parseCiApiError'
import type {
  CiDiscussMessage,
  ClinicalIntelligenceDiscussContext,
} from '../../types/clinicalIntelligence'
import { resolveLlmRequestForTask, type AiLlmRequestPayload } from '../../utils/resolveAiModel'

export interface CiDiscussResult {
  answer: string
  model?: { provider: string; modelId: string; label: string }
  mock?: boolean
}

export async function clinicalIntelligenceDiscussChat(
  messages: CiDiscussMessage[],
  context: ClinicalIntelligenceDiscussContext,
  llm?: AiLlmRequestPayload,
): Promise<CiDiscussResult> {
  const payload = llm ?? resolveLlmRequestForTask('clinical_intelligence_discuss')
  const response = await clinicalApiFetch('/api/clinical-intelligence/discuss', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      context,
      language: context.language,
      ...payload,
    }),
  })

  if (!response.ok) {
    await parseCiApiError(response, 'Clinical Intelligence discuss failed')
  }

  const data = (await response.json()) as CiDiscussResult
  return { answer: data.answer ?? '', model: data.model, mock: data.mock }
}

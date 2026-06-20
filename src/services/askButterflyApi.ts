import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import { resolveLlmRequestForTask, type AiLlmRequestPayload } from '../utils/resolveAiModel'

export interface AskButterflyChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AskButterflyResult {
  answer: string
  model?: { provider: string; modelId: string; label: string }
  mock?: boolean
}

export async function askButterflyChat(
  messages: AskButterflyChatMessage[],
  llm?: AiLlmRequestPayload,
): Promise<AskButterflyResult> {
  const payload = llm ?? resolveLlmRequestForTask('ask_butterfly')
  const response = await clinicalApiFetch('/api/ask-butterfly', {
    method: 'POST',
    body: JSON.stringify({ messages, ...payload }),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'Ask Butterfly failed')
  }

  const data = (await response.json()) as AskButterflyResult
  return { answer: data.answer ?? '', model: data.model, mock: data.mock }
}

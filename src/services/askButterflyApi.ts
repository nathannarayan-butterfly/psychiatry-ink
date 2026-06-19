import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'

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
  tier: 'fast' | 'standard' | 'thorough' = 'fast',
): Promise<AskButterflyResult> {
  const response = await clinicalApiFetch('/api/ask-butterfly', {
    method: 'POST',
    body: JSON.stringify({ messages, tier }),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'Ask Butterfly failed')
  }

  const data = (await response.json()) as AskButterflyResult
  return { answer: data.answer ?? '', model: data.model, mock: data.mock }
}

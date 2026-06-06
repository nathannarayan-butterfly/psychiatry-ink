import {
  missingApiKeyMessage,
  resolveModelWithFallback,
  type AiModelSpec,
  type AiModelTier,
} from '../modelTierMapping'

function mockSuffix(tier: AiModelTier): string {
  return `[AI draft — ${missingApiKeyMessage(tier)}]`
}

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`LLM request failed (${response.status}): ${detail.slice(0, 240)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('LLM returned empty response')
  return text
}

function mockCompletion(userPrompt: string, tier: AiModelTier): string {
  const source = userPrompt.includes('---')
    ? userPrompt.split('---').pop()?.trim() ?? userPrompt.trim()
    : userPrompt.trim()
  const suffix = mockSuffix(tier)

  return source ? `${source}\n\n${suffix}` : suffix
}

function providerApiKey(provider: AiModelSpec['provider']): string | undefined {
  if (provider === 'openai') return process.env.OPENAI_API_KEY
  if (provider === 'deepseek') return process.env.DEEPSEEK_API_KEY
  return undefined
}

function providerBaseUrl(provider: AiModelSpec['provider']): string {
  if (provider === 'deepseek') return 'https://api.deepseek.com/v1'
  return 'https://api.openai.com/v1'
}

export async function callLlm(params: {
  tier: AiModelTier
  systemPrompt: string
  userPrompt: string
}): Promise<{ text: string; model: AiModelSpec }> {
  const model = resolveModelWithFallback(params.tier)
  const apiKey = providerApiKey(model.provider)

  if (!apiKey) {
    console.warn(`[generate] mock mode (${params.tier}): ${missingApiKeyMessage(params.tier)}`)
    await new Promise((resolve) => setTimeout(resolve, 400))
    return { text: mockCompletion(params.userPrompt, params.tier), model }
  }

  const text = await callChatCompletions(
    providerBaseUrl(model.provider),
    apiKey,
    model.modelId,
    [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
  )

  return { text, model }
}

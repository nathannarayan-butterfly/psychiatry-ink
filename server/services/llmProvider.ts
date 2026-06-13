import {
  maxOutputTokensFor,
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

interface ChatCompletionResult {
  text: string
  /** OpenAI/DeepSeek finish reason; `length` signals max_tokens truncation. */
  finishReason: string | null
}

/**
 * One ChatCompletions call against an OpenAI-compatible endpoint (OpenAI or
 * DeepSeek). Returns the content plus the finish reason so callers can detect
 * truncation. Throws on transport / HTTP errors and on empty content.
 *
 * DeepSeek compatibility notes:
 *  - We only send OpenAI-standard params (model, messages, temperature,
 *    max_tokens, response_format). `frequency_penalty`/`presence_penalty` are
 *    deprecated on DeepSeek and intentionally NOT sent.
 *  - JSON mode (`response_format: {type:'json_object'}`) is supported, but the
 *    prompt must contain the word "json" + an example (it does) and `max_tokens`
 *    must be high enough to avoid mid-stream truncation.
 */
async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  options: { maxTokens?: number; jsonResponse?: boolean } = {},
): Promise<ChatCompletionResult> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.3,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch (cause) {
    throw new Error(
      `LLM request to ${modelId} failed (network/transport): ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    )
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`LLM request failed (${response.status}) for ${modelId}: ${detail.slice(0, 280)}`)
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  } | null
  const choice = data?.choices?.[0]
  const text = choice?.message?.content?.trim()
  const finishReason = choice?.finish_reason ?? null
  if (!text) {
    // DeepSeek JSON mode occasionally returns empty content; surface clearly.
    throw new Error(
      `LLM returned empty response for ${modelId}${finishReason ? ` (finish_reason=${finishReason})` : ''}`,
    )
  }
  return { text, finishReason }
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
  // DeepSeek's OpenAI-compatible base. `/v1` is accepted for OpenAI parity and
  // is unaffected by the 2026-07-24 model-name migration.
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'
  }
  return process.env.OPENAI_BASE_URL?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
}

export async function callLlm(params: {
  tier: AiModelTier
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  jsonResponse?: boolean
}): Promise<{ text: string; model: AiModelSpec; truncated: boolean }> {
  const model = resolveModelWithFallback(params.tier)
  const apiKey = providerApiKey(model.provider)

  if (!apiKey) {
    console.warn(`[generate] mock mode (${params.tier}): ${missingApiKeyMessage(params.tier)}`)
    await new Promise((resolve) => setTimeout(resolve, 400))
    return { text: mockCompletion(params.userPrompt, params.tier), model, truncated: false }
  }

  // Clamp the requested budget to what the resolved model can emit. Legacy
  // DeepSeek models cap at 8K; `deepseek-v4-*` and OpenAI allow far more, so the
  // previous unconditional 8K clamp (which silently truncated whole-drug JSON
  // and broke DeepSeek generation) no longer applies.
  const modelCap = maxOutputTokensFor(model)
  const maxTokens = params.maxTokens ? Math.min(params.maxTokens, modelCap) : undefined

  const messages: ChatMessage[] = [
    { role: 'system', content: params.systemPrompt },
    { role: 'user', content: params.userPrompt },
  ]

  let result: ChatCompletionResult
  try {
    result = await callChatCompletions(providerBaseUrl(model.provider), apiKey, model.modelId, messages, {
      maxTokens,
      jsonResponse: params.jsonResponse,
    })
  } catch (error) {
    // DeepSeek JSON mode can intermittently return empty content; one retry
    // (with a slightly larger budget) recovers most of these cases.
    const message = error instanceof Error ? error.message : String(error)
    if (params.jsonResponse && /empty response/.test(message)) {
      console.warn(`[llm] retrying ${model.modelId} after empty JSON response`)
      result = await callChatCompletions(providerBaseUrl(model.provider), apiKey, model.modelId, messages, {
        maxTokens: maxTokens ? Math.min(maxTokens + 2_000, modelCap) : undefined,
        jsonResponse: params.jsonResponse,
      })
    } else {
      throw error
    }
  }

  const truncated = result.finishReason === 'length'
  if (truncated) {
    console.warn(
      `[llm] ${model.modelId} response truncated (finish_reason=length, max_tokens=${maxTokens ?? 'default'})`,
    )
  }

  return { text: result.text, model, truncated }
}

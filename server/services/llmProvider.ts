import { resolveLlmCallModel } from '../ai/resolveLlmCallModel'
import { fetchWithTimeout, withRetry, GatewayTimeoutError } from '../utils/httpTimeout'
import {
  maxOutputTokensFor,
  missingApiKeyMessage,
  type AiModelSpec,
  type AiModelTier,
} from '../modelTierMapping'
import type { AiUsageContext, LlmCallResult } from '../ai/types'
import { normalizeAiUsage } from '../ai/usage/normalizeUsage'
import { recordAiUsageLog } from '../ai/usage/recordAiUsageLog'

function mockSuffix(tier: AiModelTier): string {
  return `[AI draft — ${missingApiKeyMessage(tier)}]`
}

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

interface ChatCompletionResult {
  text: string
  finishReason: string | null
  rawUsage: unknown
  requestId: string | null
}

/**
 * One ChatCompletions call against an OpenAI-compatible endpoint (OpenAI or
 * DeepSeek). Returns the content plus the finish reason so callers can detect
 * truncation. Throws on transport / HTTP errors and on empty content.
 */
async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  options: { maxTokens?: number; jsonResponse?: boolean } = {},
): Promise<ChatCompletionResult> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 60_000)
  const body = JSON.stringify({
    model: modelId,
    messages,
    temperature: 0.3,
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    ...(options.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
  })

  // Chat completions with the same deterministic temperature/body are safe to
  // replay, so one bounded retry on a timeout/transport blip is acceptable.
  let response: Response
  try {
    response = await withRetry(() =>
      fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        timeoutMs,
        label: `LLM request to ${modelId}`,
      }),
    )
  } catch (cause) {
    if (cause instanceof GatewayTimeoutError) throw cause
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
    id?: string
    usage?: unknown
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  } | null
  const choice = data?.choices?.[0]
  const text = choice?.message?.content?.trim()
  const finishReason = choice?.finish_reason ?? null
  if (!text) {
    throw new Error(
      `LLM returned empty response for ${modelId}${finishReason ? ` (finish_reason=${finishReason})` : ''}`,
    )
  }
  return {
    text,
    finishReason,
    rawUsage: data?.usage ?? null,
    requestId: data?.id ?? null,
  }
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
  if (provider === 'google') return process.env.GOOGLE_API_KEY
  if (provider === 'mistral') return process.env.MISTRAL_API_KEY
  return undefined
}

function providerBaseUrl(provider: AiModelSpec['provider']): string {
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'
  }
  if (provider === 'google') {
    return (
      process.env.GOOGLE_BASE_URL?.replace(/\/$/, '') ??
      'https://generativelanguage.googleapis.com/v1beta/openai'
    )
  }
  // Mistral la Plateforme — OpenAI-compatible chat/completions endpoint (EU).
  if (provider === 'mistral') {
    return process.env.MISTRAL_BASE_URL?.replace(/\/$/, '') ?? 'https://api.mistral.ai/v1'
  }
  return process.env.OPENAI_BASE_URL?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
}

function buildInputText(systemPrompt: string, userPrompt: string): string {
  return `${systemPrompt}\n${userPrompt}`
}

async function logUsage(params: {
  model: AiModelSpec
  systemPrompt: string
  userPrompt: string
  result: ChatCompletionResult
  latencyMs: number
  usageContext?: AiUsageContext
  success: boolean
  errorCode?: string | null
}): Promise<void> {
  if (!params.usageContext) return
  void recordAiUsageLog({
    userId: params.usageContext.userId,
    organisationId: params.usageContext.organisationId,
    caseId: params.usageContext.caseId,
    featureKey: params.usageContext.featureKey,
    provider: params.model.provider,
    model: params.model.modelId,
    requestKind: params.usageContext.requestKind ?? 'chat',
    rawUsage: params.result.rawUsage,
    inputText: buildInputText(params.systemPrompt, params.userPrompt),
    outputText: params.result.text,
    requestId: params.result.requestId,
    latencyMs: params.latencyMs,
    success: params.success,
    errorCode: params.errorCode,
    metadata: params.usageContext.metadata,
  })
}

export async function callLlm(params: {
  tier?: AiModelTier
  model?: { provider: string; modelId: string }
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  jsonResponse?: boolean
  usageContext?: AiUsageContext
}): Promise<LlmCallResult> {
  const tier = params.tier ?? 'standard'
  const model = resolveLlmCallModel({ tier: params.tier, model: params.model })
  const apiKey = providerApiKey(model.provider)
  const started = Date.now()

  if (!apiKey) {
    console.warn(`[generate] mock mode (${tier}): ${missingApiKeyMessage(tier)}`)
    await new Promise((resolve) => setTimeout(resolve, 400))
    const text = mockCompletion(params.userPrompt, tier)
    const usage = normalizeAiUsage({
      provider: model.provider,
      model: model.modelId,
      inputText: buildInputText(params.systemPrompt, params.userPrompt),
      outputText: text,
    })
    const latencyMs = Date.now() - started
    if (params.usageContext) {
      void recordAiUsageLog({
        ...params.usageContext,
        provider: model.provider,
        model: model.modelId,
        requestKind: params.usageContext.requestKind ?? 'chat',
        inputText: buildInputText(params.systemPrompt, params.userPrompt),
        outputText: text,
        latencyMs,
        metadata: { ...params.usageContext.metadata, mock: true },
      })
    }
    return {
      text,
      provider: model.provider,
      model: model.modelId,
      usage,
      requestId: null,
      latencyMs,
      truncated: false,
    }
  }

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
    const message = error instanceof Error ? error.message : String(error)
    if (params.jsonResponse && /empty response/.test(message)) {
      console.warn(`[llm] retrying ${model.modelId} after empty JSON response`)
      result = await callChatCompletions(providerBaseUrl(model.provider), apiKey, model.modelId, messages, {
        maxTokens: maxTokens ? Math.min(maxTokens + 2_000, modelCap) : undefined,
        jsonResponse: params.jsonResponse,
      })
    } else {
      const latencyMs = Date.now() - started
      void logUsage({
        model,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        result: { text: '', finishReason: null, rawUsage: null, requestId: null },
        latencyMs,
        usageContext: params.usageContext,
        success: false,
        errorCode: 'llm_error',
      })
      throw error
    }
  }

  const truncated = result.finishReason === 'length'
  if (truncated) {
    console.warn(
      `[llm] ${model.modelId} response truncated (finish_reason=length, max_tokens=${maxTokens ?? 'default'})`,
    )
  }

  const latencyMs = Date.now() - started
  const usage = normalizeAiUsage({
    provider: model.provider,
    model: model.modelId,
    rawUsage: result.rawUsage,
    inputText: buildInputText(params.systemPrompt, params.userPrompt),
    outputText: result.text,
  })

  void logUsage({
    model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    result,
    latencyMs,
    usageContext: params.usageContext,
    success: true,
  })

  return {
    text: result.text,
    provider: model.provider,
    model: model.modelId,
    usage,
    requestId: result.requestId,
    latencyMs,
    truncated,
  }
}

/** @deprecated Use LlmCallResult fields directly */
export function llmResultModel(result: LlmCallResult): AiModelSpec {
  return {
    provider: result.provider as AiModelSpec['provider'],
    modelId: result.model,
    label: `${result.provider} (${result.model})`,
  }
}

import type { AiUsageSource } from '../../../src/types/aiUsage'
import type { NormalizedAiUsage } from '../types'

const CHARS_PER_TOKEN = 4

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function readInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value))
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10)
    return Number.isFinite(n) ? Math.max(0, n) : null
  }
  return null
}

function pickUsageObject(rawUsage: unknown): Record<string, unknown> | null {
  const root = asRecord(rawUsage)
  if (!root) return null

  const nested = asRecord(root.usage) ?? asRecord(root.token_usage) ?? asRecord(root.tokens)
  return nested ?? root
}

function extractProviderTokens(rawUsage: unknown): {
  inputTokens: number
  cachedInputTokens: number
  cacheMissInputTokens: number
  outputTokens: number
  totalTokens: number
} | null {
  const usage = pickUsageObject(rawUsage)
  if (!usage) return null

  const inputTokens =
    readInt(usage.input_tokens) ??
    readInt(usage.prompt_tokens) ??
    readInt(usage.inputTokens) ??
    readInt(usage.promptTokens)

  const outputTokens =
    readInt(usage.output_tokens) ??
    readInt(usage.completion_tokens) ??
    readInt(usage.outputTokens) ??
    readInt(usage.completionTokens)

  const totalTokens =
    readInt(usage.total_tokens) ??
    readInt(usage.totalTokens) ??
    (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null)

  if (inputTokens == null && outputTokens == null && totalTokens == null) return null

  const detailsCached = asRecord(usage.prompt_tokens_details)?.cached_tokens
  const cachedInputTokens =
    readInt(usage.cached_tokens) ??
    readInt(usage.prompt_cache_hit_tokens) ??
    readInt(usage.cache_read_input_tokens) ??
    readInt(detailsCached) ??
    0

  const cacheMissInputTokens =
    readInt(usage.prompt_cache_miss_tokens) ??
    readInt(usage.cache_creation_input_tokens) ??
    (inputTokens != null ? Math.max(0, inputTokens - (cachedInputTokens ?? 0)) : 0)

  const resolvedInput = inputTokens ?? Math.max(0, (totalTokens ?? 0) - (outputTokens ?? 0))
  const resolvedOutput = outputTokens ?? Math.max(0, (totalTokens ?? 0) - resolvedInput)
  const resolvedTotal = totalTokens ?? resolvedInput + resolvedOutput

  return {
    inputTokens: resolvedInput,
    cachedInputTokens: cachedInputTokens ?? 0,
    cacheMissInputTokens: cacheMissInputTokens ?? Math.max(0, resolvedInput - (cachedInputTokens ?? 0)),
    outputTokens: resolvedOutput,
    totalTokens: resolvedTotal,
  }
}

function estimateTokensFromChars(inputText?: string, outputText?: string): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  const inputChars = inputText?.length ?? 0
  const outputChars = outputText?.length ?? 0
  const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN)
  const outputTokens = Math.ceil(outputChars / CHARS_PER_TOKEN)
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens }
}

function sanitizeRawUsage(rawUsage: unknown): Record<string, unknown> | null {
  const usage = pickUsageObject(rawUsage)
  if (!usage) return null
  const safe: Record<string, unknown> = {}
  for (const key of [
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'input_tokens',
    'output_tokens',
    'cached_tokens',
    'prompt_cache_hit_tokens',
    'prompt_cache_miss_tokens',
    'cache_read_input_tokens',
    'cache_creation_input_tokens',
  ]) {
    if (key in usage) safe[key] = usage[key]
  }
  const details = asRecord(usage.prompt_tokens_details)
  if (details?.cached_tokens != null) {
    safe.prompt_tokens_details = { cached_tokens: details.cached_tokens }
  }
  return Object.keys(safe).length > 0 ? safe : null
}

export function normalizeAiUsage(params: {
  provider: string
  model: string
  rawUsage?: unknown
  inputText?: string
  outputText?: string
  audioSeconds?: number
}): NormalizedAiUsage {
  void params.provider
  void params.model

  if (params.audioSeconds != null && params.audioSeconds > 0) {
    const audioMinutes = params.audioSeconds / 60
    return {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheMissInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      audioMinutes,
      usageSource: 'provider_reported',
      rawUsageJson: { audio_seconds: params.audioSeconds },
    }
  }

  const providerTokens = extractProviderTokens(params.rawUsage)
  if (providerTokens) {
    return {
      ...providerTokens,
      audioMinutes: null,
      usageSource: 'provider_reported',
      rawUsageJson: sanitizeRawUsage(params.rawUsage),
    }
  }

  const estimated = estimateTokensFromChars(params.inputText, params.outputText)
  return {
    inputTokens: estimated.inputTokens,
    cachedInputTokens: 0,
    cacheMissInputTokens: estimated.inputTokens,
    outputTokens: estimated.outputTokens,
    totalTokens: estimated.totalTokens,
    audioMinutes: null,
    usageSource: 'estimated_from_chars' as AiUsageSource,
    rawUsageJson: null,
  }
}

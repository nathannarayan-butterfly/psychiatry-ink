import type { AiFeatureKey, AiRequestKind, AiUsageSource } from '../../src/types/aiUsage'

export interface NormalizedAiUsage {
  inputTokens: number
  cachedInputTokens: number
  cacheMissInputTokens: number
  outputTokens: number
  totalTokens: number
  audioMinutes: number | null
  usageSource: AiUsageSource
  rawUsageJson: Record<string, unknown> | null
}

export interface LlmCallResult {
  text: string
  provider: string
  model: string
  usage: NormalizedAiUsage
  requestId: string | null
  latencyMs: number
  truncated?: boolean
}

export interface AiUsageContext {
  userId?: string | null
  organisationId?: string | null
  caseId?: string | null
  featureKey: AiFeatureKey
  requestKind?: AiRequestKind
  metadata?: Record<string, unknown>
}

export interface CostEstimate {
  estimatedCostUsd: number | null
  estimatedCostEur: number | null
  currencyRateUsed: number | null
  pricingMatched: boolean
  pricingVersion: string
  pricingMissing: boolean
}

import { PRICING_VERSION, resolveModelPricing, usdToEurRate } from '../pricing/modelPricing'
import type { CostEstimate } from '../types'
import type { NormalizedAiUsage } from '../types'

function roundUsd(value: number): number {
  return Math.round(value * 1e8) / 1e8
}

export function estimateCost(params: {
  provider: string
  model: string
  usage: Pick<
    NormalizedAiUsage,
    'inputTokens' | 'cachedInputTokens' | 'cacheMissInputTokens' | 'outputTokens' | 'audioMinutes'
  >
}): CostEstimate {
  const pricing = resolveModelPricing(params.model)
  if (!pricing) {
    return {
      estimatedCostUsd: null,
      estimatedCostEur: null,
      currencyRateUsed: null,
      pricingMatched: false,
      pricingVersion: PRICING_VERSION,
      pricingMissing: true,
    }
  }

  let usd = 0
  if (pricing.unit === 'per_minute') {
    const minutes = params.usage.audioMinutes ?? 0
    usd = (minutes * pricing.inputUsdPerUnit) / 1
  } else {
    const cachedRate = pricing.cachedInputUsdPerUnit ?? pricing.inputUsdPerUnit
    const missRate = pricing.inputUsdPerUnit
    const cached = params.usage.cachedInputTokens
    const miss =
      params.usage.cacheMissInputTokens > 0
        ? params.usage.cacheMissInputTokens
        : Math.max(0, params.usage.inputTokens - cached)
    usd +=
      (cached / 1_000_000) * cachedRate +
      (miss / 1_000_000) * missRate +
      (params.usage.outputTokens / 1_000_000) * pricing.outputUsdPerUnit
  }

  const rate = usdToEurRate()
  const usdRounded = roundUsd(usd)
  return {
    estimatedCostUsd: usdRounded,
    estimatedCostEur: roundUsd(usdRounded * rate),
    currencyRateUsed: rate,
    pricingMatched: true,
    pricingVersion: PRICING_VERSION,
    pricingMissing: false,
  }
}

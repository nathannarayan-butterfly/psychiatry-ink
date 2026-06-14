/** Static model pricing config — edit when provider rates change. */
export const PRICING_VERSION = '2026-06-14'

export type PricingUnit = 'per_1m_tokens' | 'per_minute'

export interface ModelPricing {
  provider: string
  unit: PricingUnit
  inputUsdPerUnit: number
  outputUsdPerUnit: number
  cachedInputUsdPerUnit?: number
}

/** USD per 1M tokens unless unit is per_minute. */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'deepseek-v4-flash': {
    provider: 'deepseek',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 0.07,
    outputUsdPerUnit: 0.28,
    cachedInputUsdPerUnit: 0.014,
  },
  'deepseek-chat': {
    provider: 'deepseek',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 0.27,
    outputUsdPerUnit: 1.1,
    cachedInputUsdPerUnit: 0.07,
  },
  'deepseek-reasoner': {
    provider: 'deepseek',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 0.55,
    outputUsdPerUnit: 2.19,
    cachedInputUsdPerUnit: 0.14,
  },
  'gpt-4.1': {
    provider: 'openai',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 2.0,
    outputUsdPerUnit: 8.0,
    cachedInputUsdPerUnit: 0.5,
  },
  'gpt-4o': {
    provider: 'openai',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 2.5,
    outputUsdPerUnit: 10.0,
    cachedInputUsdPerUnit: 1.25,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    unit: 'per_1m_tokens',
    inputUsdPerUnit: 0.15,
    outputUsdPerUnit: 0.6,
    cachedInputUsdPerUnit: 0.075,
  },
  'gpt-4o-transcribe': {
    provider: 'openai',
    unit: 'per_minute',
    inputUsdPerUnit: 0.006,
    outputUsdPerUnit: 0,
  },
}

export function listModelsWithMissingPricing(usedModels: string[]): string[] {
  return usedModels.filter((model) => !MODEL_PRICING[model])
}

export function resolveModelPricing(model: string): ModelPricing | null {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model]
  const lower = model.toLowerCase()
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (key.toLowerCase() === lower) return pricing
  }
  return null
}

/** Default USD→EUR rate when env not set. */
export function usdToEurRate(): number {
  const raw = process.env.AI_USD_EUR_RATE?.trim()
  if (raw) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0.92
}

import type { AiModelTier } from '../modelTierMapping'
import type { LlmModelRequest } from './resolveLlmCallModel'

const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']
const KNOWN_PROVIDERS = new Set(['openai', 'deepseek', 'google', 'mistral'])

export function parseLlmModelRequest(
  body: Record<string, unknown>,
  defaultTier: AiModelTier = 'standard',
): LlmModelRequest {
  const tier = VALID_TIERS.includes(body.tier as AiModelTier)
    ? (body.tier as AiModelTier)
    : defaultTier

  const rawModel = body.model
  if (rawModel && typeof rawModel === 'object') {
    const provider =
      typeof (rawModel as { provider?: unknown }).provider === 'string'
        ? (rawModel as { provider: string }).provider
        : ''
    const modelId =
      typeof (rawModel as { modelId?: unknown }).modelId === 'string'
        ? (rawModel as { modelId: string }).modelId
        : ''
    if (KNOWN_PROVIDERS.has(provider) && modelId.trim()) {
      return { tier, model: { provider, modelId: modelId.trim() } }
    }
  }

  return { tier }
}

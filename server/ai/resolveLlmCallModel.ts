import type { AiModelSpec, AiModelTier } from '../modelTierMapping'
import { resolveModelWithFallback } from '../modelTierMapping'

export interface LlmModelRequest {
  tier?: AiModelTier
  model?: { provider: string; modelId: string }
}

const KNOWN_PROVIDERS = new Set(['openai', 'deepseek', 'google'])

function explicitModelSpec(model: { provider: string; modelId: string }): AiModelSpec | null {
  if (!KNOWN_PROVIDERS.has(model.provider) || !model.modelId.trim()) return null
  return {
    provider: model.provider as AiModelSpec['provider'],
    modelId: model.modelId.trim(),
    label: `${model.provider} (${model.modelId.trim()})`,
  }
}

/** Resolve tier and/or explicit provider model for `callLlm`. */
export function resolveLlmCallModel(request: LlmModelRequest): AiModelSpec {
  const explicit = request.model ? explicitModelSpec(request.model) : null
  if (explicit) return explicit
  return resolveModelWithFallback(request.tier ?? 'standard')
}

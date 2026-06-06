import type { AiModelSpec } from '../types/aiGeneration'
import type { AiModelTier } from '../types'

/** Display-only tier labels — authoritative mapping lives on the server. */
export const MODEL_TIER_SPECS: Record<AiModelTier, AiModelSpec> = {
  fast: {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    label: 'DeepSeek (schnell)',
  },
  standard: {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    label: 'DeepSeek (standard)',
  },
  thorough: {
    provider: 'openai',
    modelId: 'gpt-4.1',
    label: 'OpenAI latest (gründlich)',
  },
}

export function resolveModelForTier(tier: AiModelTier): AiModelSpec {
  return MODEL_TIER_SPECS[tier]
}

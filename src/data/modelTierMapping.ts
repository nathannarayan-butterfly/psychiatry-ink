import type { AiModelSpec } from '../types/aiGeneration'
import type { AiModelTier } from '../types'

/**
 * Display-only tier labels — the authoritative model mapping lives on the server
 * (server/modelTierMapping.ts). Kept in sync for the "model used" label/telemetry:
 *   fast → DeepSeek (EU fallback: Mistral Small), standard → Google Gemini 2.5
 *   Flash, thorough → OpenAI gpt-5.4 (Maximum opt-in: gpt-5.5).
 */
export const MODEL_TIER_SPECS: Record<AiModelTier, AiModelSpec> = {
  fast: {
    provider: 'deepseek',
    modelId: 'deepseek-v4-flash',
    label: 'DeepSeek (Economical)',
  },
  standard: {
    provider: 'google',
    modelId: 'gemini-2.5-flash',
    label: 'Google Gemini (Standard)',
  },
  thorough: {
    provider: 'openai',
    modelId: 'gpt-5.4',
    label: 'OpenAI latest (Gründlich)',
  },
}

export function resolveModelForTier(tier: AiModelTier): AiModelSpec {
  return MODEL_TIER_SPECS[tier]
}

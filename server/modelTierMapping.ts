export type AiModelTier = 'fast' | 'standard' | 'thorough'
export type AiProviderId = 'openai' | 'deepseek'

export interface AiModelSpec {
  provider: AiProviderId
  modelId: string
  label: string
}

const OPENAI_FAST = process.env.OPENAI_FAST_MODEL ?? 'gpt-4o-mini'
const OPENAI_STANDARD = process.env.OPENAI_STANDARD_MODEL ?? 'gpt-4o-mini'
const OPENAI_THOROUGH = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1'
const DEEPSEEK_FAST = process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-chat'

export const MODEL_TIER_SPECS: Record<AiModelTier, AiModelSpec> = {
  fast: {
    provider: 'deepseek',
    modelId: DEEPSEEK_FAST,
    label: `DeepSeek (${DEEPSEEK_FAST})`,
  },
  standard: {
    provider: 'deepseek',
    modelId: DEEPSEEK_FAST,
    label: `DeepSeek (${DEEPSEEK_FAST})`,
  },
  thorough: {
    provider: 'openai',
    modelId: OPENAI_THOROUGH,
    label: `OpenAI latest (${OPENAI_THOROUGH})`,
  },
}

export const MODEL_TIER_FALLBACK: Partial<Record<AiModelTier, AiModelSpec>> = {
  fast: {
    provider: 'openai',
    modelId: OPENAI_FAST,
    label: `OpenAI (${OPENAI_FAST})`,
  },
  standard: {
    provider: 'openai',
    modelId: OPENAI_STANDARD,
    label: `OpenAI (${OPENAI_STANDARD})`,
  },
  thorough: {
    provider: 'deepseek',
    modelId: DEEPSEEK_FAST,
    label: `DeepSeek (${DEEPSEEK_FAST})`,
  },
}

function hasProviderKey(provider: AiProviderId): boolean {
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim())
  if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  return false
}

export function resolveModelForTier(tier: AiModelTier): AiModelSpec {
  return MODEL_TIER_SPECS[tier]
}

/** Pick tier model, or fallback provider when only the other vendor's key is set. */
export function resolveModelWithFallback(tier: AiModelTier): AiModelSpec {
  const primary = resolveModelForTier(tier)
  if (hasProviderKey(primary.provider)) return primary

  const fallback = MODEL_TIER_FALLBACK[tier]
  if (fallback && hasProviderKey(fallback.provider)) return fallback

  return primary
}

export function missingApiKeyMessage(tier: AiModelTier): string {
  const model = resolveModelForTier(tier)
  const envName = model.provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'
  const alt =
    model.provider === 'openai'
      ? 'DEEPSEEK_API_KEY (auto-fallback when set)'
      : 'OPENAI_API_KEY (auto-fallback when set)'
  return `Set ${envName} in .env (or ${alt}). Restart dev:server after changes.`
}

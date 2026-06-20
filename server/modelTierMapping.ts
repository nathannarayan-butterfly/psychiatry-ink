export type AiModelTier = 'fast' | 'standard' | 'thorough'
export type AiProviderId = 'openai' | 'deepseek' | 'google'

export interface AiModelSpec {
  provider: AiProviderId
  modelId: string
  label: string
}

const OPENAI_FAST = process.env.OPENAI_FAST_MODEL ?? 'gpt-4o-mini'
const OPENAI_STANDARD = process.env.OPENAI_STANDARD_MODEL ?? 'gpt-4o-mini'
const OPENAI_THOROUGH = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-4.1'

/**
 * DeepSeek model id.
 *
 * IMPORTANT (forward-compat): DeepSeek announced (2026-04-24 change log) that
 * the legacy aliases `deepseek-chat` and `deepseek-reasoner` are deprecated and
 * will be **fully retired on 2026-07-24**. They currently route to
 * `deepseek-v4-flash` (non-thinking / thinking). The base URL and the
 * OpenAI-compatible ChatCompletions request shape are unchanged — only the
 * `model` value needs to migrate. We therefore default to `deepseek-v4-flash`
 * (available now, survives the cutover) and keep it overridable via env.
 *
 * `deepseek-v4-flash` supports up to 384K output tokens, so the old hard 8K
 * `max_tokens` clamp is no longer required (see `llmProvider.ts`).
 */
const DEEPSEEK_FAST = process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-v4-flash'

/** Legacy DeepSeek models capped at 8K output tokens (retired 2026-07-24). */
const DEEPSEEK_LEGACY_8K_MODELS = new Set(['deepseek-chat', 'deepseek-reasoner'])

/**
 * Max output tokens a given model can safely emit. Legacy DeepSeek models are
 * limited to 8K; `deepseek-v4-*` and OpenAI models allow far more, so we just
 * return a generous cap and let the caller's requested budget apply.
 */
export function maxOutputTokensFor(model: AiModelSpec): number {
  if (model.provider === 'deepseek' && DEEPSEEK_LEGACY_8K_MODELS.has(model.modelId)) {
    return 8_000
  }
  return 64_000
}

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
  if (provider === 'google') return Boolean(process.env.GOOGLE_API_KEY?.trim())
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
  const envName =
    model.provider === 'openai'
      ? 'OPENAI_API_KEY'
      : model.provider === 'google'
        ? 'GOOGLE_API_KEY'
        : 'DEEPSEEK_API_KEY'
  return `Set ${envName} in .env (or another provider key). Restart dev:server after changes.`
}

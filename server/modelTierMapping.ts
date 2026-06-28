export type AiModelTier = 'fast' | 'standard' | 'thorough'
export type AiProviderId = 'openai' | 'deepseek' | 'google' | 'mistral'

export interface AiModelSpec {
  provider: AiProviderId
  modelId: string
  label: string
}

/**
 * Gründlich (thorough) tier default model.
 *
 * Defaults to `gpt-5.4` (a GPT-5-series reasoning model). gpt-5.4 is matched by
 * `isGpt5ReasoningModel()` in `llmProvider.ts` (regex `/^gpt-5/i`), so the call
 * path still sends `max_completion_tokens` and omits a custom `temperature`.
 * Overridable via env (Cloud Run sets `OPENAI_THOROUGH_MODEL=gpt-5.4`).
 */
const OPENAI_THOROUGH = process.env.OPENAI_THOROUGH_MODEL ?? 'gpt-5.4'

/**
 * "Maximum" opt-in model — the most capable (highest-cost) model, used ONLY when
 * a clinician explicitly opts into Maximum for a single generation. It is NOT a
 * tier default: it is applied as an explicit model override (see
 * {@link resolveMaximumModelSpec} and `server/routes/generate.ts`). Defaults to
 * `gpt-5.5` and is overridable via env. Like gpt-5.4 it is a GPT-5-series
 * reasoning model (covered by `isGpt5ReasoningModel()`), and as an OpenAI (US)
 * provider it is permitted under `LLM_RESIDENCY=eu` (SCC/DPF); under strict mode
 * the residency resolver degrades it to the thorough-tier EU fallback.
 */
const OPENAI_MAXIMUM = process.env.OPENAI_MAXIMUM_MODEL ?? 'gpt-5.5'

/**
 * Google Gemini model id for the STANDARD tier.
 *
 * The standard tier routes to Google Gemini via the OpenAI-compatible endpoint
 * (`generativelanguage.googleapis.com/v1beta/openai`, see `llmProvider.ts`).
 * Google processes in the US, which is permitted under `LLM_RESIDENCY=eu`
 * (SCC/DPF), so the standard tier stays Gemini even under EU residency.
 * Overridable via env.
 */
const GOOGLE_STANDARD_MODEL = process.env.GOOGLE_STANDARD_MODEL ?? 'gemini-2.5-flash'

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

/**
 * Mistral AI (la Plateforme, https://api.mistral.ai/v1) is a French/EU provider
 * exposing an OpenAI-compatible ChatCompletions API, so it reuses the same call
 * path as OpenAI/DeepSeek. It counts as an EU-residency provider (see
 * `providerResidency.ts`), making it a compliant fallback under `LLM_RESIDENCY=eu`.
 * `mistral-small-latest` covers the fast/standard tiers; `mistral-large-latest`
 * the thorough tier. Both are overridable via env.
 */
const MISTRAL_SMALL = process.env.MISTRAL_SMALL_MODEL ?? 'mistral-small-latest'
const MISTRAL_LARGE = process.env.MISTRAL_LARGE_MODEL ?? 'mistral-large-latest'

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

/** Human-readable label for a provider+model pair (matches per-tier wording). */
function providerLabel(provider: AiProviderId, modelId: string): string {
  if (provider === 'openai') return `OpenAI latest (${modelId})`
  if (provider === 'google') return `Google Gemini (${modelId})`
  if (provider === 'mistral') return `Mistral AI (${modelId})`
  return `DeepSeek (${modelId})`
}

/**
 * STANDARD tier provider + model are env-overridable so the tier can be
 * rerouted to a different provider WITHOUT any code change. Set both
 * `STANDARD_PROVIDER` (one of: openai | deepseek | google | mistral) and
 * `STANDARD_MODEL`; unset BOTH to restore the Google Gemini default. When the
 * provider stays `google`, `GOOGLE_STANDARD_MODEL` still overrides just the
 * Gemini model id.
 *
 * This exists so an operational reroute (e.g. while a provider's project-level
 * access is temporarily denied) is a pure Cloud Run env-var change that is
 * reverted by simply removing the env vars — no commit/redeploy of code needed.
 */
export function resolveStandardTierSpec(): AiModelSpec {
  const known = new Set<string>(['openai', 'deepseek', 'google', 'mistral'])
  const providerRaw = process.env.STANDARD_PROVIDER?.trim().toLowerCase()
  const provider: AiProviderId =
    providerRaw && known.has(providerRaw) ? (providerRaw as AiProviderId) : 'google'

  const defaultModelByProvider: Record<AiProviderId, string> = {
    google: GOOGLE_STANDARD_MODEL,
    mistral: MISTRAL_LARGE,
    openai: OPENAI_THOROUGH,
    deepseek: DEEPSEEK_FAST,
  }
  const modelId = process.env.STANDARD_MODEL?.trim() || defaultModelByProvider[provider]

  return { provider, modelId, label: providerLabel(provider, modelId) }
}

/**
 * Distinct model per user-selectable tier (Economical / Standard / Gründlich):
 *   fast     → DeepSeek deepseek-v4-flash (cheapest; the non-EU economical primary)
 *   standard → Google Gemini (balanced; US residency, allowed under EU) — env-overridable
 *   thorough → OpenAI gpt-5.4 reasoning model (most capable default; gpt-5.5 is
 *              available as the explicit "Maximum" opt-in override only)
 *
 * The fallbacks are residency-aware: the fast tier falls back to Mistral small
 * (EU) so that under `LLM_RESIDENCY=eu` the economical tier reroutes to an
 * EU-residency provider rather than to a US one; the standard tier falls back to
 * Mistral small for the strict-EU case where Google might be unavailable.
 */
export const MODEL_TIER_SPECS: Record<AiModelTier, AiModelSpec> = {
  fast: {
    provider: 'deepseek',
    modelId: DEEPSEEK_FAST,
    label: `DeepSeek (${DEEPSEEK_FAST})`,
  },
  standard: resolveStandardTierSpec(),
  thorough: {
    provider: 'openai',
    modelId: OPENAI_THOROUGH,
    label: `OpenAI latest (${OPENAI_THOROUGH})`,
  },
}

export const MODEL_TIER_FALLBACK: Partial<Record<AiModelTier, AiModelSpec>> = {
  // EU-residency-sane economical fallback: Mistral small (EU), so that when
  // DeepSeek is blocked under `LLM_RESIDENCY=eu` the Economical tier reroutes to
  // an EU provider rather than to OpenAI (US).
  fast: mistralSpecForTier('fast'),
  // Residency-sane standard fallback: Mistral small (EU) for the strict-EU case
  // where Google might be unavailable.
  standard: mistralSpecForTier('standard'),
  thorough: {
    provider: 'deepseek',
    modelId: DEEPSEEK_FAST,
    label: `DeepSeek (${DEEPSEEK_FAST})`,
  },
}

/**
 * EU-residency Mistral spec for a tier. Used as a residency-compliant fallback
 * (see `resolveLlmCallModel.ts`) and for explicit user selection.
 */
export function mistralSpecForTier(tier: AiModelTier): AiModelSpec {
  const modelId = tier === 'thorough' ? MISTRAL_LARGE : MISTRAL_SMALL
  return {
    provider: 'mistral',
    modelId,
    label: `Mistral AI (${modelId})`,
  }
}

/**
 * Explicit "Maximum" model spec — the top model (gpt-5.5) a clinician can opt
 * into for a single generation. Resolved as a model override (not a tier
 * default). Env-overridable via `OPENAI_MAXIMUM_MODEL`. Routed through the same
 * residency gate as any other OpenAI call (allowed under EU SCC/DPF; degrades to
 * the thorough-tier EU fallback under strict mode).
 */
export function resolveMaximumModelSpec(): AiModelSpec {
  return {
    provider: 'openai',
    modelId: OPENAI_MAXIMUM,
    label: `OpenAI latest (${OPENAI_MAXIMUM})`,
  }
}

export function hasProviderKey(provider: AiProviderId): boolean {
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim())
  if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
  if (provider === 'google') return Boolean(process.env.GOOGLE_API_KEY?.trim())
  if (provider === 'mistral') return Boolean(process.env.MISTRAL_API_KEY?.trim())
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
        : model.provider === 'mistral'
          ? 'MISTRAL_API_KEY'
          : 'DEEPSEEK_API_KEY'
  return `Set ${envName} in .env (or another provider key). Restart dev:server after changes.`
}

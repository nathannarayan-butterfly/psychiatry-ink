import type { AiModelSpec, AiModelTier, AiProviderId } from '../modelTierMapping'
import {
  MODEL_TIER_FALLBACK,
  MODEL_TIER_SPECS,
  hasProviderKey,
  mistralSpecForTier,
  resolveModelWithFallback,
} from '../modelTierMapping'
import { LlmResidencyError, isProviderAllowed } from './providerResidency'

export interface LlmModelRequest {
  tier?: AiModelTier
  model?: { provider: string; modelId: string }
}

const KNOWN_PROVIDERS = new Set(['openai', 'deepseek', 'google', 'mistral'])

function explicitModelSpec(model: { provider: string; modelId: string }): AiModelSpec | null {
  if (!KNOWN_PROVIDERS.has(model.provider) || !model.modelId.trim()) return null
  return {
    provider: model.provider as AiModelSpec['provider'],
    modelId: model.modelId.trim(),
    label: `${model.provider} (${model.modelId.trim()})`,
  }
}

/**
 * Enforce data-residency: if the resolved provider is blocked (e.g. DeepSeek
 * under `LLM_RESIDENCY=eu`), fall back to a residency-compliant provider that
 * has a key configured. Throws {@link LlmResidencyError} when none qualifies, so
 * EU patient-derived data is never routed to a disallowed jurisdiction.
 */
function enforceResidency(spec: AiModelSpec, tier: AiModelTier): AiModelSpec {
  if (isProviderAllowed(spec.provider)) return spec

  // Mistral (EU) is always an eligible residency-compliant fallback: it is the
  // EU-residency provider that remains valid even when both the tier model and
  // its fallback are blocked (e.g. DeepSeek=cn and a tightened US blocklist).
  const candidates: AiModelSpec[] = [
    MODEL_TIER_SPECS[tier],
    MODEL_TIER_FALLBACK[tier],
    mistralSpecForTier(tier),
  ].filter((candidate): candidate is AiModelSpec => Boolean(candidate))
  for (const candidate of candidates) {
    if (isProviderAllowed(candidate.provider) && hasProviderKey(candidate.provider)) {
      return candidate
    }
  }
  // Last resort: any allowed provider that has a key.
  const allProviders: AiProviderId[] = ['openai', 'google', 'mistral', 'deepseek']
  for (const provider of allProviders) {
    if (provider !== spec.provider && isProviderAllowed(provider) && hasProviderKey(provider)) {
      const fromTier = candidates.find((candidate) => candidate?.provider === provider)
      if (fromTier) return fromTier
    }
  }
  throw new LlmResidencyError(
    `No data-residency-compliant LLM provider is configured (blocked: ${spec.provider}). ` +
      'Configure an allowed provider key (e.g. OPENAI_API_KEY) or relax LLM_RESIDENCY/LLM_BLOCKED_PROVIDERS.',
  )
}

/** Resolve tier and/or explicit provider model for `callLlm`. */
export function resolveLlmCallModel(request: LlmModelRequest): AiModelSpec {
  const tier = request.tier ?? 'standard'
  const explicit = request.model ? explicitModelSpec(request.model) : null
  const base = explicit ?? resolveModelWithFallback(tier)
  return enforceResidency(base, tier)
}

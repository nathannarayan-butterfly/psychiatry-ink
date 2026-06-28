/**
 * Maps the user-visible AI mode to the internal model tier.
 *
 * Mode → Tier mapping (intentionally opaque to callers — provider names are
 * never exposed in the user-facing API):
 *   economic   → fast    (DeepSeek Flash — cheapest, fastest; Mistral small under EU)
 *   standard   → standard (Google Gemini — balanced)
 *   gruendlich → thorough (OpenAI gpt-5.4 — most capable default; gpt-5.5 only via
 *                          the explicit "Maximum" opt-in model override)
 */

import type { AiMode } from '../../src/types/aiUsage'
import type { AiModelTier } from '../modelTierMapping'

export function modeToTier(mode: AiMode): AiModelTier {
  switch (mode) {
    case 'economic':
      return 'fast'
    case 'standard':
      return 'standard'
    case 'gruendlich':
      return 'thorough'
  }
}

/**
 * Inverse of {@link modeToTier}: maps the internal model tier back to the
 * user-visible AI mode so the credit multiplier (economic 1× / standard 2× /
 * gruendlich 4×) matches the tier the user actually selected. Used by routes
 * and services that thread a user-selected `tier` into `runAiFeature`, where the
 * mode (not the tier) drives billing.
 */
export function tierToMode(tier: AiModelTier): AiMode {
  switch (tier) {
    case 'fast':
      return 'economic'
    case 'standard':
      return 'standard'
    case 'thorough':
      return 'gruendlich'
  }
}

/** Normalize a raw string to AiMode, falling back to the default. */
export function parseMode(
  raw: string | null | undefined,
  fallback: AiMode = 'standard',
): AiMode {
  if (raw === 'economic' || raw === 'standard' || raw === 'gruendlich') return raw
  return fallback
}

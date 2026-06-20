/**
 * Maps the user-visible AI mode to the internal model tier.
 *
 * Mode → Tier mapping (intentionally opaque to callers — provider names are
 * never exposed in the user-facing API):
 *   economic   → fast    (DeepSeek Flash — cheapest, fastest)
 *   standard   → standard (DeepSeek Flash — balanced)
 *   gruendlich → thorough (OpenAI GPT-4.1 — most capable)
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

/** Normalize a raw string to AiMode, falling back to the default. */
export function parseMode(
  raw: string | null | undefined,
  fallback: AiMode = 'standard',
): AiMode {
  if (raw === 'economic' || raw === 'standard' || raw === 'gruendlich') return raw
  return fallback
}

import {
  MODE_BASE_CREDITS,
  MODE_MIN_CREDITS,
  getLengthMultiplier,
} from '../data/creditPricing'
import type { AiModelTier } from '../types'

/** Rough token estimate without a tokenizer (~4 chars per token for clinical German). */
export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

export function estimateGenerationCredits(
  tier: AiModelTier,
  inputText: string,
): number {
  const estimatedTokens = estimateTokensFromText(inputText)
  const multiplier = getLengthMultiplier(estimatedTokens)
  const raw = MODE_BASE_CREDITS[tier] * multiplier
  return Math.max(MODE_MIN_CREDITS[tier], Math.ceil(raw))
}

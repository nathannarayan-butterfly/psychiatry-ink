/**
 * Credit calculation helpers.
 *
 * estimateCredits   — pre-call estimate (used to check balance before the call).
 * calculateFinalCredits — post-call calculation using actual token counts.
 *
 * Formula:
 *   base = rule.baseCredits × modeMultiplier
 *   overflowBlocks = max(0, ceil((totalTokens - maxIncluded) / blockSize))
 *   total = base + overflowBlocks × rule.overflowCreditsPerBlock × modeMultiplier
 *   minimum: 1 credit
 */

import type { AiMode } from '../../src/types/aiUsage'
import { MODE_MULTIPLIERS } from './aiPricingConfig'
import { getFeatureCreditRule } from './featureCreditRules'
import type { NormalizedAiUsage } from './types'

export function estimateCredits(
  featureKey: string,
  mode: AiMode,
  estimatedTokens: number,
): number {
  const rule = getFeatureCreditRule(featureKey)
  const multiplier = MODE_MULTIPLIERS[mode]
  const base = rule.baseCredits * multiplier
  const overflow = Math.max(0, estimatedTokens - rule.maxIncludedTokens)
  const overflowBlocks = Math.ceil(overflow / rule.overflowTokenBlockSize)
  const total = base + overflowBlocks * rule.overflowCreditsPerBlock * multiplier
  return Math.max(1, Math.round(total))
}

export function calculateFinalCredits(
  featureKey: string,
  mode: AiMode,
  actualUsage: Pick<NormalizedAiUsage, 'totalTokens'>,
): number {
  return estimateCredits(featureKey, mode, actualUsage.totalTokens)
}

/**
 * Rough token estimate from text length (chars / 4 ≈ tokens).
 * Used when pre-call token count is not yet available.
 */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}

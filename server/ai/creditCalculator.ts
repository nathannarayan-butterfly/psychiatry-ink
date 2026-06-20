/**
 * Credit calculation helpers.
 *
 * estimateCredits   — pre-call estimate (used to check balance before the call).
 *                     Uses the mode's *primary* provider for the cost factor
 *                     because the call has not yet been made.
 * calculateFinalCredits — post-call calculation using actual token counts and
 *                     the model that was actually used (which may differ from
 *                     the primary for the mode when a fallback fired).
 *
 * Formula:
 *   base       = rule.baseCredits × modeMultiplier × providerCostFactor
 *   overflowBlocks = max(0, ceil((totalTokens - maxIncluded) / blockSize))
 *   overflow   = overflowBlocks × rule.overflowCreditsPerBlock × modeMultiplier × providerCostFactor
 *   total      = base + overflow
 *   minimum: 1 credit
 *
 * `providerCostFactor` is 1.0 for the baseline (DeepSeek-v4-flash) and scales
 * up for more expensive providers (see {@link ./providerCosts}). That ensures
 * an OpenAI call consumes more credits than a DeepSeek call at the same mode
 * and token count, protecting the gross margin per call.
 */

import type { AiMode } from '../../src/types/aiUsage'
import { getModeMultiplier } from './aiPricingConfig'
import { getFeatureCreditRule } from './featureCreditRules'
import type { NormalizedAiUsage } from './types'
import { providerCostFactor } from './providerCosts'
import { resolveModelForTier } from '../modelTierMapping'
import { modeToTier } from './aiRouter'

/**
 * Resolve the provider-cost factor for the mode's PRIMARY model. Used by
 * pre-call estimation when the actual model is not yet known. If the user
 * is on a fallback path, the post-call recalculation will adjust.
 */
function primaryModelForMode(mode: AiMode): string {
  return resolveModelForTier(modeToTier(mode)).modelId
}

export interface CreditCalcOptions {
  /**
   * Specific model id to bill against. When provided, the provider cost
   * factor uses this model. Otherwise the mode's primary model is used.
   */
  modelId?: string
}

export function estimateCredits(
  featureKey: string,
  mode: AiMode,
  estimatedTokens: number,
  options: CreditCalcOptions = {},
): number {
  const rule = getFeatureCreditRule(featureKey)
  const multiplier = getModeMultiplier(mode)
  const modelId = options.modelId ?? primaryModelForMode(mode)
  const factor = providerCostFactor(modelId)
  const base = rule.baseCredits * multiplier * factor
  const overflow = Math.max(0, estimatedTokens - rule.maxIncludedTokens)
  const overflowBlocks = Math.ceil(overflow / rule.overflowTokenBlockSize)
  const total = base + overflowBlocks * rule.overflowCreditsPerBlock * multiplier * factor
  return Math.max(1, Math.round(total))
}

export function calculateFinalCredits(
  featureKey: string,
  mode: AiMode,
  actualUsage: Pick<NormalizedAiUsage, 'totalTokens'>,
  options: CreditCalcOptions = {},
): number {
  return estimateCredits(featureKey, mode, actualUsage.totalTokens, options)
}

/**
 * Rough token estimate from text length (chars / 4 ≈ tokens).
 * Used when pre-call token count is not yet available.
 */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}

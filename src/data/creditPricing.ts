import type { AiModelTier } from '../types'
import { REALIZED_CREDIT_VALUE_EUR } from './creditPacks'

/**
 * Credits per 1 EUR, derived from the realized Stripe pack pricing (the single
 * source of truth in creditPacks.ts) — NOT the retired nominal "100 credits =
 * €1" rate, which under-valued a credit ~3.5× and produced nonsensical margin
 * estimates. At the realized ≈ €0.035/credit this is ≈ 28.6 credits/EUR.
 *
 * Display/estimation only — the credit-deduction billing path never converts
 * credits to money (it uses base credits × mode multiplier directly).
 */
export const CREDITS_PER_EUR = 1 / REALIZED_CREDIT_VALUE_EUR

/** Re-exported from subscriptionPlans — dictation charge per transcription. */
export { TRANSCRIBE_CREDITS } from './subscriptionPlans'

export const MODE_BASE_CREDITS: Record<AiModelTier, number> = {
  fast: 1,
  standard: 4,
  thorough: 15,
}

export const MODE_MIN_CREDITS: Record<AiModelTier, number> = {
  fast: 1,
  standard: 3,
  thorough: 10,
}

export function getLengthMultiplier(estimatedTokens: number): number {
  if (estimatedTokens <= 1500) return 1
  if (estimatedTokens <= 4000) return 1.5
  if (estimatedTokens <= 8000) return 2
  return 3
}

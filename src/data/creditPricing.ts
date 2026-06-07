import type { AiModelTier } from '../types'

/** 100 credits = 1 EUR */
export const CREDITS_PER_EUR = 100

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

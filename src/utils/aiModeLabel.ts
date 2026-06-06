import type { AiModelTier } from '../types'

/** UI / log label for model tier (German clinical app convention). */
export function tierToAiMode(tier: AiModelTier): string {
  if (tier === 'fast') return 'schnell'
  if (tier === 'thorough') return 'gruendlich'
  return 'standard'
}

/**
 * AI credit pricing configuration.
 *
 * Modes are the user-visible quality tiers; the internal model tier (fast /
 * standard / thorough) is resolved separately in aiRouter.ts.
 *
 * Mode multipliers apply to the base credit cost of every feature.
 * economic (1×) → cheapest/fastest model
 * standard (2×) → balanced model
 * gruendlich (4×) → most capable model
 */

import type { AiMode } from '../../src/types/aiUsage'

export type { AiMode }

export const MODE_MULTIPLIERS: Record<AiMode, number> = {
  economic: 1,
  standard: 2,
  gruendlich: 4,
}

/**
 * Monthly credit grant per user. Replenished at each billing-period reset
 * (UTC 1st of month). Mirrors the Prisma `AiCreditAccount.monthlyCredits`
 * default so creation and reset paths grant the same amount.
 */
export const MONTHLY_CREDIT_GRANT = 500

/**
 * USD→credit conversion rate.
 * 1 credit ≈ 0.001 USD of AI spend at standard mode.
 * This rate is used only for display / estimation; billing uses credit rules directly.
 */
export const CREDIT_TO_USD_RATE = 0.001

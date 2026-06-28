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
import { REALIZED_CREDIT_VALUE_USD } from '../../src/data/creditPacks'

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
 * Monetary value of one credit in USD, derived from the realized Stripe pack
 * pricing (single source of truth in src/data/creditPacks.ts) — ≈ $0.038/credit
 * at the realized ≈ €0.035/credit retail rate.
 *
 * This REPLACES the previous nominal `0.001` ("1 credit ≈ $0.001"), which was
 * ~38× below the realized retail value and made any margin/cost estimate built
 * on it nonsensically negative. It is display/estimation-only — the actual
 * credit-deduction billing path (creditCalculator.ts: base credits × mode
 * multiplier) never converts credits to money, so this value charges nothing on
 * its own. Reconciling it to the realized rate cannot change any charged amount.
 */
export const CREDIT_TO_USD_RATE = REALIZED_CREDIT_VALUE_USD

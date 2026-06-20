/**
 * AI credit pricing configuration.
 *
 * Modes are the user-visible quality tiers; the internal model tier (fast /
 * standard / thorough) is resolved separately in aiRouter.ts.
 *
 * Mode multipliers apply to the base credit cost of every feature.
 * economic   (1×) → cheapest/fastest model (DeepSeek-first)
 * standard   (2×) → balanced model (DeepSeek / Gemini)
 * gruendlich (4× default, configurable up to 5× via env) → most capable model
 *                  (OpenAI primary, DeepSeek/Gemini fallback)
 *
 * On top of the mode multiplier, every call is also scaled by a
 * provider-cost factor (see {@link ./providerCosts}) so OpenAI calls do not
 * consume credits at the same rate as DeepSeek calls for the same token
 * count. This protects the gross margin per-call when an expensive provider
 * (OpenAI gpt-4.1, gpt-4o) is reached either by mode choice or by fallback.
 */

import type { AiMode } from '../../src/types/aiUsage'

export type { AiMode }

/**
 * Read the configurable Gründlich credit multiplier. Defaults to 4×; clamped
 * to the documented [4, 5] envelope so an over-aggressive env value cannot
 * cause runaway credit burn. Read at call time (not module load) so tests can
 * override via process.env mutation.
 */
export function gruendlichMultiplier(): number {
  const raw = process.env.GRUENDLICH_CREDIT_MULTIPLIER?.trim()
  if (!raw) return 4
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return 4
  return Math.min(5, Math.max(4, parsed))
}

/**
 * Mode multiplier table. economic/standard are fixed at 1×/2×; gruendlich is
 * read dynamically so an env override (or admin tuning) takes effect without
 * restarting the process.
 */
export function getModeMultiplier(mode: AiMode): number {
  if (mode === 'economic') return 1
  if (mode === 'standard') return 2
  return gruendlichMultiplier()
}

/**
 * Legacy static snapshot of the mode multiplier table. Retained for callers
 * that need a plain record (e.g. UI display); credit-billing code paths MUST
 * use {@link getModeMultiplier} so the env override is honoured.
 */
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

/**
 * USD→GBP exchange rate used by margin analytics to express the
 * provider USD cost on the same currency axis as bundle revenue (GBP).
 * Configurable via `USD_TO_GBP_RATE` env; defaults to 0.79 (mid-2026
 * approximation). Live FX is out of scope for Beta — see analytics module
 * comments for the upgrade path.
 */
export function usdToGbpRate(): number {
  const raw = process.env.USD_TO_GBP_RATE?.trim()
  if (raw) {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 0.79
}

/**
 * Margin warning thresholds, expressed as cost-as-share-of-revenue.
 * `MARGIN_WARN_THRESHOLD = 0.40` ⇒ variable cost > 40% of revenue triggers
 * `status: 'warning'`. `MARGIN_CRITICAL_THRESHOLD = 0.50` ⇒ critical.
 * Both are overridable via env so they can be tuned without a deploy.
 */
export const MARGIN_WARN_THRESHOLD_DEFAULT = 0.4
export const MARGIN_CRITICAL_THRESHOLD_DEFAULT = 0.5

export function marginWarnThreshold(): number {
  const raw = process.env.MARGIN_WARN_THRESHOLD?.trim()
  if (raw) {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) return parsed
  }
  return MARGIN_WARN_THRESHOLD_DEFAULT
}

export function marginCriticalThreshold(): number {
  const raw = process.env.MARGIN_CRITICAL_THRESHOLD?.trim()
  if (raw) {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) return parsed
  }
  return MARGIN_CRITICAL_THRESHOLD_DEFAULT
}

/**
 * Beta extra-credit bundles (single source of truth for SKUs + GBP prices).
 * Mirrored into the AiCreditBundle table at migrate time and reseeded by
 * `ensureBundlesSeeded` at runtime so a stale DB never goes out of sync.
 */
export const CREDIT_BUNDLE_SKUS = [
  { sku: 'credits-100', credits: 100, priceGbp: 4.99 },
  { sku: 'credits-250', credits: 250, priceGbp: 9.99 },
  { sku: 'credits-500', credits: 500, priceGbp: 17.99 },
  { sku: 'credits-1000', credits: 1000, priceGbp: 29.99 },
  { sku: 'credits-2500', credits: 2500, priceGbp: 59.99 },
] as const

export type CreditBundleSku = (typeof CREDIT_BUNDLE_SKUS)[number]['sku']

export function findBundleBySku(sku: string): { sku: string; credits: number; priceGbp: number } | null {
  return CREDIT_BUNDLE_SKUS.find((b) => b.sku === sku) ?? null
}

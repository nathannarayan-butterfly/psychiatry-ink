/**
 * Margin-protected AI credit bundles for Stripe Checkout.
 *
 * Source of truth mirrors `CREDIT_BUNDLE_SKUS` in server/ai/aiPricingConfig.ts
 * on feat/ai-credit-bundles-and-margin-analytics — not the nominal list rate
 * (100 credits = €1 in creditPricing.ts, used only for estimation).
 */

export interface CreditPack {
  id: string
  credits: number
  /** Price in pence (GBP minor units) */
  priceGbpPence: number
  labelDe: string
  labelEn: string
  popular?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_100',
    credits: 100,
    priceGbpPence: 499,
    labelDe: '100 Credits',
    labelEn: '100 credits',
  },
  {
    id: 'pack_250',
    credits: 250,
    priceGbpPence: 999,
    labelDe: '250 Credits',
    labelEn: '250 credits',
  },
  {
    id: 'pack_500',
    credits: 500,
    priceGbpPence: 1799,
    labelDe: '500 Credits',
    labelEn: '500 credits',
  },
  {
    id: 'pack_1000',
    credits: 1000,
    priceGbpPence: 2999,
    labelDe: '1.000 Credits',
    labelEn: '1,000 credits',
    popular: true,
  },
  {
    id: 'pack_2500',
    credits: 2500,
    priceGbpPence: 5999,
    labelDe: '2.500 Credits',
    labelEn: '2,500 credits',
  },
]

export function findCreditPack(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === packId)
}

// ── Realized per-credit retail value (single source of truth) ────────────────
//
// The live Stripe credit packs (above) are the ONLY authority for the monetary
// value of a credit. The previously-contradictory nominal constants
// (`CREDIT_TO_USD_RATE = 0.001` and `CREDITS_PER_EUR = 100`, i.e. "100 credits
// = €1") implied ~€0.01/credit, which is ~3.5× below the realized retail rate
// and produced nonsensical (deeply negative) margin estimates. Those constants
// are display/estimation-only (NOT wired into the credit-deduction billing
// path — that uses base credits × mode multiplier in
// server/ai/creditCalculator.ts), so reconciling them to the realized value is
// safe and changes no charged amounts.
//
// We anchor the realized value to the "popular" pack (the headline 1,000-credit
// bundle at £29.99 → £0.030/credit ≈ €0.035/credit), which matches the cost
// analysis' realized revenue of ≈ €0.035/credit.

/** Approximate FX used only to express the GBP retail value in EUR/USD for
 *  display/estimation. Not used for any charge (Stripe charges in GBP). */
const GBP_TO_EUR = 1.17
const GBP_TO_USD = 1.27

/** Realized retail value of one credit in GBP, from the headline (popular) pack
 *  — or the first pack as a fallback. Single source of truth. */
export function realizedCreditValueGbp(): number {
  const anchor = CREDIT_PACKS.find((pack) => pack.popular) ?? CREDIT_PACKS[0]
  return anchor.priceGbpPence / 100 / anchor.credits
}

/** Realized per-credit retail value (GBP) — e.g. £0.030 for the £29.99/1,000 pack. */
export const REALIZED_CREDIT_VALUE_GBP = realizedCreditValueGbp()

/** Realized per-credit retail value expressed in EUR (≈ €0.035). */
export const REALIZED_CREDIT_VALUE_EUR = REALIZED_CREDIT_VALUE_GBP * GBP_TO_EUR

/** Realized per-credit retail value expressed in USD (≈ $0.038). */
export const REALIZED_CREDIT_VALUE_USD = REALIZED_CREDIT_VALUE_GBP * GBP_TO_USD

export function formatCreditPackPrice(pack: CreditPack, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'GBP',
  }).format(pack.priceGbpPence / 100)
}

export function formatCreditPackPerHundred(pack: CreditPack, locale: string): string {
  const perHundred = (pack.priceGbpPence / pack.credits) * 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(perHundred / 100)
}

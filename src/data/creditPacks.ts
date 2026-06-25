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

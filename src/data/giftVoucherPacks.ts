/**
 * Buy-a-gift voucher products ("Gutschein kaufen / verschenken").
 *
 * A gift voucher grants `creditsPerPeriod` credits every `periodMonths` for
 * `totalPeriods` periods once the recipient redeems the code. Priced in GBP
 * pence to match the existing one-off credit packs (see `creditPacks.ts`).
 *
 * `validDays` is the redemption window: the recipient must redeem the code
 * within this many days of purchase. Once redeemed, all `totalPeriods` periods
 * are granted on the monthly schedule regardless of this window.
 */

export interface GiftVoucherPack {
  id: string
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  validDays: number
  /** Price in pence (GBP minor units). */
  priceGbpPence: number
  labelDe: string
  labelEn: string
  popular?: boolean
}

export const GIFT_VOUCHER_PACKS: GiftVoucherPack[] = [
  {
    id: 'gift_500x6',
    creditsPerPeriod: 500,
    periodMonths: 1,
    totalPeriods: 6,
    validDays: 365,
    priceGbpPence: 9999,
    labelDe: '500 Credits/Monat · 6 Monate',
    labelEn: '500 credits/month · 6 months',
    popular: true,
  },
  {
    id: 'gift_500x12',
    creditsPerPeriod: 500,
    periodMonths: 1,
    totalPeriods: 12,
    validDays: 365,
    priceGbpPence: 17999,
    labelDe: '500 Credits/Monat · 12 Monate',
    labelEn: '500 credits/month · 12 months',
  },
  {
    id: 'gift_250x3',
    creditsPerPeriod: 250,
    periodMonths: 1,
    totalPeriods: 3,
    validDays: 365,
    priceGbpPence: 3999,
    labelDe: '250 Credits/Monat · 3 Monate',
    labelEn: '250 credits/month · 3 months',
  },
]

export function findGiftVoucherPack(packId: string): GiftVoucherPack | undefined {
  return GIFT_VOUCHER_PACKS.find((pack) => pack.id === packId)
}

/** Total credits a gift voucher grants over its full schedule. */
export function giftVoucherTotalCredits(pack: GiftVoucherPack): number {
  return pack.creditsPerPeriod * pack.totalPeriods
}

export function formatGiftVoucherPrice(pack: GiftVoucherPack, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'GBP',
  }).format(pack.priceGbpPence / 100)
}

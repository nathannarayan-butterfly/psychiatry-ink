/**
 * Buy-a-gift voucher products ("Gutschein kaufen / verschenken").
 *
 * Purchasable gift vouchers are ONE-TIME lump credit top-ups: redeeming the
 * code deposits the full `creditsPerPeriod` amount once into the recipient's
 * non-expiring `purchased_credits` bucket. They are modelled with
 * `totalPeriods: 1` so the existing recurring grant logic (voucherSchedule +
 * voucher_grant_period) grants the whole amount in a single period — no
 * monthly schedule. Priced in GBP pence to match the one-off credit packs
 * (see `creditPacks.ts`).
 *
 * `validDays` is the redemption window: the recipient must redeem the code
 * within this many days of purchase. The window only gates *when the code may
 * be redeemed* — once redeemed, the granted credits never expire (they live in
 * `purchased_credits`).
 *
 * NOTE: This is distinct from admin/promo vouchers (source='admin',
 * voucher_create_admin), which keep supporting multi-period scheduled grants.
 */

export interface GiftVoucherPack {
  id: string
  /**
   * Credits granted per period. With `totalPeriods: 1` this is the full
   * one-time lump deposited into `purchased_credits` on redemption.
   */
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  /** Redemption window in days — the code must be redeemed within this many days. */
  validDays: number
  /** Price in pence (GBP minor units). */
  priceGbpPence: number
  labelDe: string
  labelEn: string
  popular?: boolean
}

export const GIFT_VOUCHER_PACKS: GiftVoucherPack[] = [
  {
    id: 'gift_1000',
    creditsPerPeriod: 1000,
    periodMonths: 1,
    totalPeriods: 1,
    validDays: 180,
    priceGbpPence: 2999,
    labelDe: '1.000 Credits',
    labelEn: '1,000 credits',
  },
  {
    id: 'gift_2000',
    creditsPerPeriod: 2000,
    periodMonths: 1,
    totalPeriods: 1,
    validDays: 180,
    priceGbpPence: 5499,
    labelDe: '2.000 Credits',
    labelEn: '2,000 credits',
    popular: true,
  },
  {
    id: 'gift_5000',
    creditsPerPeriod: 5000,
    periodMonths: 1,
    totalPeriods: 1,
    validDays: 180,
    priceGbpPence: 12999,
    labelDe: '5.000 Credits',
    labelEn: '5,000 credits',
  },
]

export function findGiftVoucherPack(packId: string): GiftVoucherPack | undefined {
  return GIFT_VOUCHER_PACKS.find((pack) => pack.id === packId)
}

/** Total credits a gift voucher grants (one-time lump = creditsPerPeriod × totalPeriods). */
export function giftVoucherTotalCredits(pack: GiftVoucherPack): number {
  return pack.creditsPerPeriod * pack.totalPeriods
}

export function formatGiftVoucherPrice(pack: GiftVoucherPack, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'GBP',
  }).format(pack.priceGbpPence / 100)
}

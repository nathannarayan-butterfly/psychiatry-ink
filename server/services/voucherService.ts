/**
 * Voucher orchestration: redemption, recurring "claim due periods", and gift
 * code generation. The atomic/idempotent work lives in the SQL RPCs; this layer
 * decides which periods are due (via the pure `voucherSchedule` helper) and
 * drives the per-period grant RPC.
 */

import { randomBytes } from 'node:crypto'
import { voucherRepo, type VoucherRedeemResult } from '../data/vouchers'
import { computeDuePeriodIndices } from './voucherSchedule'

/** Unambiguous alphabet (no 0/O/1/I) for human-typable codes. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generate a grouped voucher code, e.g. `GIFT-7K3M-9QF2`. */
export function generateVoucherCode(prefix = 'GIFT'): string {
  const group = (len: number): string => {
    const bytes = randomBytes(len)
    let out = ''
    for (let i = 0; i < len; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
    return out
  }
  return `${prefix}-${group(4)}-${group(4)}`
}

export interface ClaimResult {
  creditsGranted: number
  periodsGranted: number
}

/**
 * Grant any voucher periods now due across all of the user's redemptions.
 * Idempotent: each period is guarded by `voucher_period_grants` in the RPC, so
 * re-running grants nothing already delivered. Safe to call on every credit
 * read / login.
 */
export async function claimDueVoucherPeriods(userId: string, now: Date = new Date()): Promise<ClaimResult> {
  const redemptions = await voucherRepo.listActiveRedemptions(userId)
  let creditsGranted = 0
  let periodsGranted = 0

  for (const redemption of redemptions) {
    const dueIndices = computeDuePeriodIndices(
      {
        redeemedAt: redemption.redeemedAt,
        periodsGranted: redemption.periodsGranted,
        totalPeriods: redemption.totalPeriods,
        periodMonths: redemption.periodMonths,
      },
      now,
    )
    for (const index of dueIndices) {
      const granted = await voucherRepo.grantVoucherPeriod(redemption.redemptionId, index)
      if (granted) {
        creditsGranted += redemption.creditsPerPeriod
        periodsGranted += 1
      }
    }
  }

  return { creditsGranted, periodsGranted }
}

export interface RedeemOutcome {
  ok: boolean
  error?: string
  creditsGranted: number
  creditsPerPeriod?: number
  totalPeriods?: number
  periodMonths?: number
}

/**
 * Redeem a code for the user and immediately grant the first (and any other now
 * due) period via the same exactly-once path as recurring grants.
 */
export async function redeemVoucherForUser(userId: string, code: string): Promise<RedeemOutcome> {
  const result: VoucherRedeemResult = await voucherRepo.redeemVoucher(userId, code)
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'not_found', creditsGranted: 0 }
  }

  // Grant the immediately-due periods (period 0 and any already past, e.g. a
  // late redemption of a code dated in the past — defensive).
  const claim = await claimDueVoucherPeriods(userId)

  return {
    ok: true,
    creditsGranted: claim.creditsGranted,
    creditsPerPeriod: result.creditsPerPeriod,
    totalPeriods: result.totalPeriods,
    periodMonths: result.periodMonths,
  }
}

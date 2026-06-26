import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database, Json } from '../types/database'

/**
 * voucherRepo — typed data-access seam for the Gutschein (voucher) system.
 *
 * All writes go through SECURITY DEFINER RPCs (service-role only); reads use the
 * service-role client and MUST be scoped to an already-authenticated owner id by
 * the caller. See supabase/migrations/20260705000000_voucher_system.sql.
 */

export type VoucherRow = Database['public']['Tables']['vouchers']['Row']
export type VoucherRedemptionRow = Database['public']['Tables']['voucher_redemptions']['Row']

/** A redemption joined with the schedule fields needed to compute due periods. */
export interface ActiveRedemption {
  redemptionId: string
  redeemedAt: string
  periodsGranted: number
  totalPeriods: number
  periodMonths: number
  creditsPerPeriod: number
}

export interface VoucherRedeemResult {
  ok: boolean
  error?: string
  redemptionId?: string
  voucherId?: string
  creditsPerPeriod?: number
  periodMonths?: number
  totalPeriods?: number
}

/** Validate a code and bind a redemption to the user (no credits granted yet). */
export async function redeemVoucher(userId: string, code: string): Promise<VoucherRedeemResult> {
  const { data, error } = await getSupabaseAdmin().rpc('voucher_redeem', {
    p_user_id: userId,
    p_code: code,
  })
  if (error) throw new Error(`voucher_redeem failed: ${error.message}`)
  return parseRedeemResult(data)
}

function parseRedeemResult(data: Json | null): VoucherRedeemResult {
  const obj = (data ?? {}) as Record<string, unknown>
  return {
    ok: obj.ok === true,
    error: typeof obj.error === 'string' ? obj.error : undefined,
    redemptionId: typeof obj.redemption_id === 'string' ? obj.redemption_id : undefined,
    voucherId: typeof obj.voucher_id === 'string' ? obj.voucher_id : undefined,
    creditsPerPeriod: typeof obj.credits_per_period === 'number' ? obj.credits_per_period : undefined,
    periodMonths: typeof obj.period_months === 'number' ? obj.period_months : undefined,
    totalPeriods: typeof obj.total_periods === 'number' ? obj.total_periods : undefined,
  }
}

/** Idempotently grant one period for a redemption. Returns true when granted. */
export async function grantVoucherPeriod(redemptionId: string, periodIndex: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc('voucher_grant_period', {
    p_redemption_id: redemptionId,
    p_period_index: periodIndex,
  })
  if (error) throw new Error(`voucher_grant_period failed: ${error.message}`)
  return data === true
}

/** List a user's redemptions that still have undelivered periods. */
export async function listActiveRedemptions(userId: string): Promise<ActiveRedemption[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('voucher_redemptions')
    .select(
      'id, redeemed_at, periods_granted, voucher:vouchers(total_periods, period_months, credits_per_period)',
    )
    .eq('redeemed_by', userId)
  if (error) throw new Error(`voucher_redemptions read failed: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    redeemed_at: string
    periods_granted: number
    voucher:
      | { total_periods: number; period_months: number; credits_per_period: number }
      | { total_periods: number; period_months: number; credits_per_period: number }[]
      | null
  }>

  return rows
    .map((row) => {
      const voucher = Array.isArray(row.voucher) ? row.voucher[0] : row.voucher
      if (!voucher) return null
      return {
        redemptionId: row.id,
        redeemedAt: row.redeemed_at,
        periodsGranted: row.periods_granted,
        totalPeriods: voucher.total_periods,
        periodMonths: voucher.period_months,
        creditsPerPeriod: voucher.credits_per_period,
      } satisfies ActiveRedemption
    })
    .filter((row): row is ActiveRedemption => row !== null && row.periodsGranted < row.totalPeriods)
}

export interface VoucherCreateResult {
  ok: boolean
  code: string | null
}

/** Create a purchased gift voucher (idempotent on the Stripe session id). */
export async function createVoucherFromPurchase(params: {
  sessionId: string
  buyerUserId: string
  code: string
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  validDays: number
}): Promise<VoucherCreateResult> {
  const { data, error } = await getSupabaseAdmin().rpc('voucher_create_from_purchase', {
    p_session_id: params.sessionId,
    p_buyer: params.buyerUserId,
    p_code: params.code,
    p_credits_per_period: params.creditsPerPeriod,
    p_period_months: params.periodMonths,
    p_total_periods: params.totalPeriods,
    p_valid_days: params.validDays,
  })
  if (error) throw new Error(`voucher_create_from_purchase failed: ${error.message}`)
  const obj = (data ?? {}) as Record<string, unknown>
  return { ok: obj.ok === true, code: typeof obj.code === 'string' ? obj.code : null }
}

// ── Admin (promo) vouchers ───────────────────────────────────────────────────

export interface AdminVoucherCreateInput {
  /** Verified operator id (audit trail in vouchers.created_by). */
  createdBy: string
  /** Optional caller-provided code; auto-generated PROMO-… when omitted. */
  code?: string | null
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  maxRedemptions: number
  /** Explicit window end (ISO). Takes precedence over validDays. */
  validUntil?: string | null
  /** Window length in days from now (used when validUntil is absent). */
  validDays?: number | null
}

export interface AdminVoucherCreateResult {
  ok: boolean
  error?: string
  code?: string
  creditsPerPeriod?: number
  periodMonths?: number
  totalPeriods?: number
  maxRedemptions?: number
  validUntil?: string
}

/** Mint a source='admin' promo voucher via the service-role-only RPC. */
export async function createAdminVoucher(
  input: AdminVoucherCreateInput,
): Promise<AdminVoucherCreateResult> {
  const { data, error } = await getSupabaseAdmin().rpc('voucher_create_admin', {
    p_created_by: input.createdBy,
    p_code: input.code ?? null,
    p_credits_per_period: input.creditsPerPeriod,
    p_period_months: input.periodMonths,
    p_total_periods: input.totalPeriods,
    p_max_redemptions: input.maxRedemptions,
    p_valid_until: input.validUntil ?? null,
    p_valid_days: input.validDays ?? null,
  })
  if (error) throw new Error(`voucher_create_admin failed: ${error.message}`)
  const obj = (data ?? {}) as Record<string, unknown>
  return {
    ok: obj.ok === true,
    error: typeof obj.error === 'string' ? obj.error : undefined,
    code: typeof obj.code === 'string' ? obj.code : undefined,
    creditsPerPeriod: typeof obj.credits_per_period === 'number' ? obj.credits_per_period : undefined,
    periodMonths: typeof obj.period_months === 'number' ? obj.period_months : undefined,
    totalPeriods: typeof obj.total_periods === 'number' ? obj.total_periods : undefined,
    maxRedemptions: typeof obj.max_redemptions === 'number' ? obj.max_redemptions : undefined,
    validUntil: typeof obj.valid_until === 'string' ? obj.valid_until : undefined,
  }
}

export interface AdminVoucherListItem {
  id: string
  code: string
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  maxRedemptions: number
  redemptionsUsed: number
  validFrom: string
  validUntil: string
  status: string
  createdBy: string | null
  createdAt: string
}

/** List all source='admin' vouchers with redemption counts (operator view). */
export async function listAdminVouchers(): Promise<AdminVoucherListItem[]> {
  const { data, error } = await getSupabaseAdmin().rpc('voucher_list_admin')
  if (error) throw new Error(`voucher_list_admin failed: ${error.message}`)
  const rows = Array.isArray(data) ? data : []
  return rows.map((raw) => {
    const obj = (raw ?? {}) as Record<string, unknown>
    return {
      id: String(obj.id ?? ''),
      code: String(obj.code ?? ''),
      creditsPerPeriod: Number(obj.credits_per_period ?? 0),
      periodMonths: Number(obj.period_months ?? 0),
      totalPeriods: Number(obj.total_periods ?? 0),
      maxRedemptions: Number(obj.max_redemptions ?? 0),
      redemptionsUsed: Number(obj.redemptions_used ?? 0),
      validFrom: String(obj.valid_from ?? ''),
      validUntil: String(obj.valid_until ?? ''),
      status: String(obj.status ?? ''),
      createdBy: typeof obj.created_by === 'string' ? obj.created_by : null,
      createdAt: String(obj.created_at ?? ''),
    } satisfies AdminVoucherListItem
  })
}

/** Read a purchased voucher for a buyer by Stripe session id (to show the code). */
export async function getPurchasedVoucherBySession(
  sessionId: string,
  buyerUserId: string,
): Promise<Pick<VoucherRow, 'code' | 'credits_per_period' | 'period_months' | 'total_periods'> | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('vouchers')
    .select('code, credits_per_period, period_months, total_periods')
    .eq('stripe_session_id', sessionId)
    .eq('created_by', buyerUserId)
    .maybeSingle()
  if (error) throw new Error(`vouchers read failed: ${error.message}`)
  return data
}

export const voucherRepo = {
  redeemVoucher,
  grantVoucherPeriod,
  listActiveRedemptions,
  createVoucherFromPurchase,
  getPurchasedVoucherBySession,
  createAdminVoucher,
  listAdminVouchers,
}

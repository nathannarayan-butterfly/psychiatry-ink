import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * referralRepo — typed data-access seam for the invite / referral system.
 *
 * Writes go through SECURITY DEFINER RPCs (service-role only). Stats reads use
 * the service-role client and MUST be scoped to the authenticated referrer by
 * the caller. See supabase/migrations/20260705000100_referral_system.sql.
 */

export type ReferralRow = Database['public']['Tables']['referrals']['Row']

export interface ReferralStats {
  invited: number
  converted: number
  rewarded: number
  creditsEarned: number
}

export interface ReferralAttributeResult {
  ok: boolean
  attributed?: boolean
  error?: string
}

export interface ReferralClaimResult {
  ok: boolean
  granted: boolean
  referralId?: string
  referrerUser?: string
}

/** Return the user's reusable invite code, creating it (with `candidate`) once. */
export async function getOrCreateInviteCode(userId: string, candidate: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin().rpc('referral_get_or_create_code', {
    p_user_id: userId,
    p_code: candidate,
  })
  if (error) throw new Error(`referral_get_or_create_code failed: ${error.message}`)
  if (typeof data !== 'string' || !data) throw new Error('referral_get_or_create_code returned no code')
  return data
}

/** Bind an invitee to the referrer behind `code` (idempotent, self-ref ignored). */
export async function attributeReferral(
  inviteeUserId: string,
  code: string,
): Promise<ReferralAttributeResult> {
  const { data, error } = await getSupabaseAdmin().rpc('referral_attribute', {
    p_invitee: inviteeUserId,
    p_code: code,
  })
  if (error) throw new Error(`referral_attribute failed: ${error.message}`)
  const obj = (data ?? {}) as Record<string, unknown>
  return {
    ok: obj.ok === true,
    attributed: obj.attributed === true,
    error: typeof obj.error === 'string' ? obj.error : undefined,
  }
}

/**
 * Reward the referrer of `inviteeUserId` exactly once (atomic status flip +
 * 250-credit grant in the RPC). Returns `granted: false` when there is no
 * pending attribution or it was already rewarded.
 */
export async function claimReferralReward(
  inviteeUserId: string,
  rewardCredits: number,
): Promise<ReferralClaimResult> {
  const { data, error } = await getSupabaseAdmin().rpc('referral_claim_reward', {
    p_invitee: inviteeUserId,
    p_reward_credits: rewardCredits,
  })
  if (error) throw new Error(`referral_claim_reward failed: ${error.message}`)
  const obj = (data ?? {}) as Record<string, unknown>
  return {
    ok: obj.ok === true,
    granted: obj.granted === true,
    referralId: typeof obj.referral_id === 'string' ? obj.referral_id : undefined,
    referrerUser: typeof obj.referrer_user === 'string' ? obj.referrer_user : undefined,
  }
}

/** Aggregate the referrer's invite stats for the credits/settings UI. */
export async function getReferralStats(referrerUserId: string): Promise<ReferralStats> {
  const { data, error } = await getSupabaseAdmin()
    .from('referrals')
    .select('status, reward_credits')
    .eq('referrer_user', referrerUserId)
  if (error) throw new Error(`referrals stats read failed: ${error.message}`)

  const rows = (data ?? []) as Array<Pick<ReferralRow, 'status' | 'reward_credits'>>
  let converted = 0
  let rewarded = 0
  let creditsEarned = 0
  for (const row of rows) {
    if (row.status === 'converted' || row.status === 'rewarded') converted += 1
    if (row.status === 'rewarded') {
      rewarded += 1
      creditsEarned += row.reward_credits ?? 0
    }
  }
  return { invited: rows.length, converted, rewarded, creditsEarned }
}

export const referralRepo = {
  getOrCreateInviteCode,
  attributeReferral,
  claimReferralReward,
  getReferralStats,
}

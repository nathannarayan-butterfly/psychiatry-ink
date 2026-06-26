/**
 * Referral orchestration: invite code + stats, attribution, and the
 * conversion reward. The exactly-once reward (status flip + 250-credit grant)
 * is atomic in the `referral_claim_reward` RPC; this layer just wires it up.
 */

import { randomBytes } from 'node:crypto'
import { referralRepo, type ReferralStats } from '../data/referrals'

/** Credits the referrer earns when an invitee converts to a paid subscription. */
export const REFERRAL_REWARD_CREDITS = 250

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generate a compact, human-typable invite code (e.g. `PIK-8F3KQ2`). */
export function generateInviteCode(): string {
  const bytes = randomBytes(6)
  let out = ''
  for (let i = 0; i < 6; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `PIK-${out}`
}

export interface ReferralInfo {
  code: string
  inviteUrl: string
  stats: ReferralStats
}

/** Resolve (or create) the user's invite code + their referral stats. */
export async function getReferralInfo(userId: string, origin: string): Promise<ReferralInfo> {
  const code = await referralRepo.getOrCreateInviteCode(userId, generateInviteCode())
  const stats = await referralRepo.getReferralStats(userId)
  const base = origin.replace(/\/$/, '')
  return { code, inviteUrl: `${base}/?ref=${encodeURIComponent(code)}`, stats }
}

/** Attribute the current user as an invitee of `code` (idempotent). */
export async function attributeInvitee(userId: string, code: string) {
  return referralRepo.attributeReferral(userId, code)
}

/**
 * Reward the referrer when `inviteeUserId` converts to a real paid subscription.
 * Idempotent and crash-safe (atomic in the RPC). Called from the Stripe webhook
 * AFTER the $0 trial-start invoice has been excluded.
 */
export async function rewardReferrerForConversion(inviteeUserId: string) {
  return referralRepo.claimReferralReward(inviteeUserId, REFERRAL_REWARD_CREDITS)
}

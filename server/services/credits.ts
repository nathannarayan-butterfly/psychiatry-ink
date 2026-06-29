/**
 * Unified credit facade — delegates to ai_credit_accounts (creditGuard).
 *
 * The legacy `credit_balances` table is kept only for plan storage and the
 * local-dev `'default'` singleton balance (one-time migrated into
 * ai_credit_accounts for authenticated users). Authenticated users always
 * resolve to the RPC-backed ai_credit_accounts path; the `'default'` path is
 * local-dev only.
 */

import {
  deductCreditsTransactionally,
  getCreditSummary,
  refundCredits as refundAiCredits,
} from '../ai/creditGuard'
import { migrateLegacyCreditsIfNeeded, accountIdFromUserId } from './creditMigration'
import { creditBalancesRepo } from '../data/creditBalances'

const LEGACY_ACCOUNT_ID = 'default'
const LEGACY_DEFAULT_BALANCE = 500

export type UserPlan = 'free' | 'pro'

export { accountIdFromUserId }

/** Ensures plan metadata row exists (balance lives in ai_credit_accounts). */
export async function ensureCreditAccountMeta(userId?: string) {
  const id = accountIdFromUserId(userId)
  const isLegacy = id === LEGACY_ACCOUNT_ID
  return creditBalancesRepo.ensureCreditBalance(id, isLegacy ? LEGACY_DEFAULT_BALANCE : 0)
}

/** @deprecated Use ensureCreditAccountMeta — kept for call-site compatibility. */
export const ensureCreditAccount = ensureCreditAccountMeta

export async function getCreditBalance(userId?: string): Promise<number> {
  const id = accountIdFromUserId(userId)
  if (id === LEGACY_ACCOUNT_ID) {
    const account = await ensureCreditAccountMeta(userId)
    return account.balance
  }

  await migrateLegacyCreditsIfNeeded(id)
  const summary = await getCreditSummary(id)
  return summary.totalAvailable
}

export async function getUserPlan(userId?: string): Promise<UserPlan> {
  const account = await ensureCreditAccountMeta(userId)
  return account.plan === 'pro' ? 'pro' : 'free'
}

export async function canAfford(amount: number, userId?: string): Promise<boolean> {
  if (amount <= 0) return true
  const balance = await getCreditBalance(userId)
  return balance >= amount
}

export async function deductCredits(
  amount: number,
  userId?: string,
  featureKey = 'legacy_deduct',
): Promise<number> {
  if (amount <= 0) return getCreditBalance(userId)

  const id = accountIdFromUserId(userId)
  if (id === LEGACY_ACCOUNT_ID) {
    const account = await ensureCreditAccountMeta(userId)
    const updated = await creditBalancesRepo.setCreditBalance(id, account.balance - amount)
    return Math.max(0, updated.balance)
  }

  await migrateLegacyCreditsIfNeeded(id)
  const result = await deductCreditsTransactionally({
    userId: id,
    credits: amount,
    featureKey,
  })
  if (!result.ok) {
    return getCreditBalance(userId)
  }
  return getCreditBalance(userId)
}

export async function reserveCredits(
  amount: number,
  userId?: string,
): Promise<{ ok: boolean; balance: number }> {
  const id = accountIdFromUserId(userId)
  if (id === LEGACY_ACCOUNT_ID) {
    const account = await ensureCreditAccountMeta(userId)
    if (amount <= 0) {
      return { ok: true, balance: account.balance }
    }
    if (account.balance < amount) {
      return { ok: false, balance: account.balance }
    }
    const updated = await creditBalancesRepo.setCreditBalance(id, account.balance - amount)
    return { ok: true, balance: updated.balance }
  }

  await migrateLegacyCreditsIfNeeded(id)
  if (amount <= 0) {
    const summary = await getCreditSummary(id)
    return { ok: true, balance: summary.totalAvailable }
  }

  const result = await deductCreditsTransactionally({
    userId: id,
    credits: amount,
    featureKey: 'generation_log_reserve',
  })
  const balance = await getCreditBalance(userId)
  return { ok: result.ok, balance }
}

export async function refundCredits(amount: number, userId?: string): Promise<number> {
  if (amount <= 0) return getCreditBalance(userId)

  const id = accountIdFromUserId(userId)
  if (id === LEGACY_ACCOUNT_ID) {
    const account = await ensureCreditAccountMeta(userId)
    const updated = await creditBalancesRepo.setCreditBalance(id, account.balance + amount)
    return updated.balance
  }

  await refundAiCredits({
    userId: id,
    credits: amount,
    featureKey: 'generation_log_reserve',
    note: 'generation_log_refund',
  })
  return getCreditBalance(userId)
}

/** Stripe billing stub — manual upgrade for development. */
export async function setUserPlan(userId: string, plan: UserPlan): Promise<UserPlan> {
  await ensureCreditAccountMeta(userId)
  const updated = await creditBalancesRepo.setCreditBalancePlan(userId, plan)
  return updated.plan === 'pro' ? 'pro' : 'free'
}

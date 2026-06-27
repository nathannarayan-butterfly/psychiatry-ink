/**
 * Credit balance guard (supabase-js data layer).
 *
 * checkBalance   — throws InsufficientCreditsError when the account cannot cover
 *                  the estimated cost. Reads total available = monthlyCredits +
 *                  purchasedCredits from ai_credit_accounts.
 *
 * ensureCreditAccount — self-healing upsert of the ai_credit_accounts row for a
 *                  userId, creating it with the default monthly allowance when
 *                  missing. Also performs an atomic monthly-grant reset when the
 *                  existing account's `monthly_reset_at` has elapsed. Both the
 *                  upsert and the conditional monthly grant happen inside the
 *                  `ai_credit_ensure_account` SECURITY DEFINER RPC, so concurrent
 *                  first-call-of-the-month requests can't double-grant (the
 *                  conditional UPDATE keyed on the stale reset timestamp picks a
 *                  single winner) — replacing the old Prisma `updateMany` guard.
 *
 * deductCreditsTransactionally — atomically decrements the account balance and
 *                  appends a debit ledger entry inside the `ai_credit_debit` RPC.
 *                  The RPC spends purchased credits first, then monthly, with
 *                  gte guards on both buckets in a single statement, so two
 *                  concurrent debits can never drive either bucket negative; the
 *                  loser of the race gets `false` and no ledger row is written.
 *                  This replaces the old Prisma `$transaction` + `updateMany`.
 *
 * refundCredits  — appends a refund ledger entry (for failed calls where no
 *                  usable output was returned) via the `ai_credit_refund` RPC.
 */

import type { AiMode } from '../../src/types/aiUsage'
import { MONTHLY_CREDIT_GRANT } from './aiPricingConfig'
import { migrateLegacyCreditsIfNeeded } from '../services/creditMigration'
import { creditsRepo } from '../data/credits'
import { listRecentUsageForUser, type AiUsageHistoryRow } from '../data/aiUsage'
import { InsufficientCreditsError, CreditInfrastructureError } from './creditErrors'
import { AccessLockedError, computeAccess } from '../services/subscriptionAccess'

// Re-exported so existing `from './creditGuard'` / `from '../ai/creditGuard'`
// import sites keep working after the classes moved to ./creditErrors.
export { InsufficientCreditsError, CreditInfrastructureError }

function nextMonthlyReset(): Date {
  const now = new Date()
  // Reset on the 1st of next month at UTC midnight.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

/** Returns total usable credits: monthly + purchased. */
function totalCredits(account: { monthlyCredits: number; purchasedCredits: number }): number {
  return account.monthlyCredits + account.purchasedCredits
}

export interface EnsuredCreditAccount {
  id: string
  monthlyCredits: number
  purchasedCredits: number
  monthlyResetAt: Date
}

/**
 * Self-healing upsert of the ai_credit_accounts row for the given userId.
 *
 * - Creates the row with the configured monthly grant on first call.
 * - When the existing row's `monthly_reset_at` has elapsed, atomically
 *   replenishes `monthly_credits` to {@link MONTHLY_CREDIT_GRANT}, advances
 *   `monthly_reset_at` to the next reset, and appends a `monthly_grant` ledger
 *   entry — all inside the `ai_credit_ensure_account` RPC, which keys the reset
 *   on the stale `monthly_reset_at` so concurrent first-call-of-the-period
 *   requests race exactly one winner and never double-grant.
 *
 * `nextMonthlyReset()` is always passed as the next boundary; the RPC only
 * applies it when creating the row or when the stored boundary has elapsed.
 */
export async function ensureCreditAccount(userId: string): Promise<EnsuredCreditAccount> {
  const account = await creditsRepo.ensureAccount(
    userId,
    MONTHLY_CREDIT_GRANT,
    nextMonthlyReset().toISOString(),
  )
  return {
    id: account.id,
    monthlyCredits: account.monthly_credits,
    purchasedCredits: account.purchased_credits,
    monthlyResetAt: new Date(account.monthly_reset_at),
  }
}

/**
 * Spend-time access gate. Credits may be BANKED (bought as packs, bought/redeemed
 * as gift vouchers, admin grants) without any subscription, but they may only be
 * SPENT while the account has an active subscription or active trial (or is still
 * in the trial-not-started onboarding grace). When access is denied this throws
 * {@link AccessLockedError} (`code = 'subscription_required'`), which subclasses
 * {@link InsufficientCreditsError} so the existing 402 handlers surface it with a
 * clear, typed prompt to subscribe.
 *
 * Enforcement is controlled by `REQUIRE_SUBSCRIPTION_FOR_CREDITS` (default ON);
 * see {@link computeAccess}. A user with no account row yet keeps access (a
 * brand-new user starting onboarding).
 */
export async function assertCanSpendCredits(userId: string): Promise<void> {
  const account = await creditsRepo.getAccountByUserId(userId)
  const decision = computeAccess(account ?? null)
  if (!decision.access) {
    throw new AccessLockedError(decision.reason)
  }
}

/**
 * Throw InsufficientCreditsError if the user's account cannot cover
 * `estimatedCredits`. No credits are deducted here — only balance is read.
 */
export async function checkBalance(
  userId: string,
  estimatedCredits: number,
): Promise<void> {
  if (estimatedCredits <= 0) return

  await migrateLegacyCreditsIfNeeded(userId)
  const account = await ensureCreditAccount(userId)
  const available = totalCredits(account)

  if (available < estimatedCredits) {
    throw new InsufficientCreditsError(available, estimatedCredits)
  }
}

/**
 * Atomically deduct `credits` from the account and append a debit ledger row.
 *
 * The deduction is performed inside the `ai_credit_debit` RPC using a single
 * conditional UPDATE that requires
 *   `purchased_credits >= fromPurchased AND monthly_credits >= fromMonthly`.
 * When two debits race, the database serializes the conditional update — only
 * one succeeds, the loser gets `false`, and no ledger entry is written for it.
 * Concurrent debits therefore can never drive either bucket negative.
 *
 * Returns `{ ok: false }` when balance is insufficient (either at the advisory
 * pre-check or after losing the race inside the RPC); callers should treat this
 * as InsufficientCreditsError.
 */
export async function deductCreditsTransactionally(params: {
  userId: string
  credits: number
  featureKey: string
  usageLogId?: string
  mode?: AiMode
}): Promise<{ ok: boolean }> {
  if (params.credits <= 0) return { ok: true }

  // Spend-path gate: spending requires an active subscription/trial even when
  // the balance is funded purely by purchased credits or redeemed vouchers.
  // Throws AccessLockedError (subscription_required) when blocked. Buying/
  // redeeming credits does NOT pass through here, so banking stays allowed.
  await assertCanSpendCredits(params.userId)

  const account = await ensureCreditAccount(params.userId)
  const available = totalCredits(account)

  // Fast-path advisory rejection. The conditional UPDATE inside the RPC is the
  // authoritative gate — this avoids an RPC round-trip when the account is
  // plainly underwater.
  if (available < params.credits) {
    return { ok: false }
  }

  const ok = await creditsRepo.debit(account.id, params.credits, params.featureKey, {
    usageLogId: params.usageLogId,
    note: params.mode ? `mode=${params.mode}` : undefined,
  })

  return { ok }
}

/**
 * Append a refund ledger entry (e.g. when an AI call fails and no output
 * was accepted). Does NOT re-credit a monthly vs purchased split —
 * simply increments the monthly balance for simplicity.
 */
export async function refundCredits(params: {
  userId: string
  credits: number
  featureKey: string
  usageLogId?: string
  note?: string
}): Promise<void> {
  if (params.credits <= 0) return

  const account = await ensureCreditAccount(params.userId)
  await creditsRepo.refund(account.id, params.credits, params.featureKey, {
    usageLogId: params.usageLogId,
    // The RPC coalesces a null note to 'ai_call_failed_refund'.
    note: params.note,
  })
}

/** Read current balance summary for a user. */
export async function getCreditSummary(userId: string): Promise<{
  monthlyCredits: number
  purchasedCredits: number
  totalAvailable: number
  monthlyResetAt: Date
}> {
  await migrateLegacyCreditsIfNeeded(userId)
  const account = await ensureCreditAccount(userId)
  return {
    monthlyCredits: account.monthlyCredits,
    purchasedCredits: account.purchasedCredits,
    totalAvailable: totalCredits(account),
    monthlyResetAt: account.monthlyResetAt,
  }
}

/** Credit a purchased or admin-granted balance increase with a ledger row. */
export async function addPurchasedCredits(params: {
  userId: string
  credits: number
  note?: string
  featureKey?: string | null
}): Promise<{ totalAvailable: number }> {
  if (params.credits <= 0) {
    const summary = await getCreditSummary(params.userId)
    return { totalAvailable: summary.totalAvailable }
  }

  const account = await ensureCreditAccount(params.userId)
  // The RPC derives the ledger type from the note (`stripe:%` → 'purchase',
  // else 'admin_adjustment'), preserving the previous behaviour.
  await creditsRepo.grantPurchased(account.id, params.credits, {
    note: params.note,
    featureKey: params.featureKey ?? undefined,
  })

  const summary = await getCreditSummary(params.userId)
  return { totalAvailable: summary.totalAvailable }
}

export interface CreditLedgerEntry {
  id: string
  type: string
  credits: number
  featureKey: string | null
  note: string | null
  createdAt: Date
}

/** Recent ledger movements for a user account. */
export async function getCreditLedgerForUser(
  userId: string,
  limit = 50,
): Promise<CreditLedgerEntry[]> {
  const account = await ensureCreditAccount(userId)
  const rows = await creditsRepo.listLedger(account.id, limit)
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    credits: row.credits,
    featureKey: row.feature_key,
    note: row.note,
    createdAt: new Date(row.created_at),
  }))
}

export type AiUsageLogRow = AiUsageHistoryRow

/** Recent AI usage rows from the ai_usage_logs table. */
export async function getRecentAiUsageForUser(
  userId: string,
  limit = 50,
): Promise<AiUsageLogRow[]> {
  return listRecentUsageForUser(userId, limit)
}

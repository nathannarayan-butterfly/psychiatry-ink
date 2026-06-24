/**
 * Credit balance guard.
 *
 * checkBalance   — throws InsufficientCreditsError when the account cannot cover
 *                  the estimated cost. Reads total available = monthlyCredits +
 *                  purchasedCredits from AiCreditAccount.
 *
 * ensureCreditAccount — upserts the AiCreditAccount row for a userId, creating
 *                  it with the default monthly allowance if missing. Also
 *                  performs an atomic monthly-grant reset when the existing
 *                  account's `monthlyResetAt` has elapsed: the row is updated
 *                  with `updateMany` keyed on the stale reset timestamp so
 *                  concurrent first-call-of-the-month requests can't double-
 *                  grant, and a `monthly_grant` row is appended to the ledger.
 *
 * deductCreditsTransactionally — atomically decrements the account balance and
 *                  appends a debit ledger entry inside a single Prisma
 *                  transaction. Uses a conditional `updateMany` with `gte`
 *                  guards on both purchasedCredits and monthlyCredits so two
 *                  concurrent debits can never drive either bucket negative;
 *                  the loser of the race observes `result.count === 0` and
 *                  returns `{ ok: false }` without writing a ledger row.
 *
 * refundCredits  — appends a refund ledger entry (for failed calls where no
 *                  usable output was returned).
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '../db'
import type { AiMode } from '../../src/types/aiUsage'
import { MONTHLY_CREDIT_GRANT } from './aiPricingConfig'
import { migrateLegacyCreditsIfNeeded } from '../services/creditMigration'

export class InsufficientCreditsError extends Error {
  readonly available: number
  readonly required: number

  constructor(available: number, required: number) {
    super(
      `Insufficient AI credits: ${required} required, ${available} available.`,
    )
    this.name = 'InsufficientCreditsError'
    this.available = available
    this.required = required
  }
}

/**
 * Thrown when the AI credit infrastructure itself is unreachable (DB outage,
 * migration not applied, misconfigured DATABASE_URL, etc.). Distinct from
 * InsufficientCreditsError so the caller can fail closed in production
 * without conflating "user has no credits" with "we can't tell".
 */
export class CreditInfrastructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreditInfrastructureError'
  }
}

function nextMonthlyReset(): Date {
  const now = new Date()
  // Reset on the 1st of next month at UTC midnight.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

/** Returns total usable credits: monthly + purchased. */
function totalCredits(account: { monthlyCredits: number; purchasedCredits: number }): number {
  return account.monthlyCredits + account.purchasedCredits
}

/**
 * Upsert an AiCreditAccount for the given userId.
 *
 * - Creates the row with the configured monthly grant on first call.
 * - When the existing row's `monthlyResetAt` has elapsed, atomically replenishes
 *   `monthlyCredits` to {@link MONTHLY_CREDIT_GRANT}, advances `monthlyResetAt`
 *   to the next reset, and appends a `monthly_grant` ledger entry. The reset
 *   is keyed on the stale `monthlyResetAt` via `updateMany`, so concurrent
 *   first-call-of-the-period requests race exactly one winner and never
 *   double-grant.
 */
export async function ensureCreditAccount(userId: string): Promise<{
  id: string
  monthlyCredits: number
  purchasedCredits: number
}> {
  const existing = await prisma.aiCreditAccount.findUnique({ where: { userId } })
  if (!existing) {
    return prisma.aiCreditAccount.create({
      data: {
        userId,
        monthlyCredits: MONTHLY_CREDIT_GRANT,
        purchasedCredits: 0,
        monthlyResetAt: nextMonthlyReset(),
      },
    })
  }

  const now = new Date()
  if (now < existing.monthlyResetAt) return existing

  // Past the reset boundary. Try to grant atomically; only the request that
  // matches the stale `monthlyResetAt` wins.
  const nextResetAt = nextMonthlyReset()
  const reset = await prisma.aiCreditAccount.updateMany({
    where: { id: existing.id, monthlyResetAt: existing.monthlyResetAt },
    data: { monthlyCredits: MONTHLY_CREDIT_GRANT, monthlyResetAt: nextResetAt },
  })

  if (reset.count === 1) {
    await prisma.aiCreditLedger.create({
      data: {
        accountId: existing.id,
        type: 'monthly_grant',
        credits: MONTHLY_CREDIT_GRANT,
        featureKey: null,
        usageLogId: null,
        note: `monthly_reset:${nextResetAt.toISOString()}`,
      },
    })
    return {
      id: existing.id,
      monthlyCredits: MONTHLY_CREDIT_GRANT,
      purchasedCredits: existing.purchasedCredits,
    }
  }

  // Lost the race — another concurrent caller already granted. Re-read.
  const fresh = await prisma.aiCreditAccount.findUnique({ where: { id: existing.id } })
  return fresh ?? existing
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
 * The deduction is performed inside a Prisma transaction using a single
 * conditional `updateMany` that requires
 *   `purchasedCredits >= fromPurchased AND monthlyCredits >= fromMonthly`.
 * When two debits race past the (advisory) pre-check, the database serializes
 * the conditional update — only one row update succeeds, the loser observes
 * `result.count === 0`, and no ledger entry is written for it. Concurrent
 * debits therefore can never drive either bucket negative.
 *
 * Returns `{ ok: false }` when balance is insufficient (either at the advisory
 * pre-check or after losing the race inside the transaction); callers should
 * treat this as InsufficientCreditsError.
 */
export async function deductCreditsTransactionally(params: {
  userId: string
  credits: number
  featureKey: string
  usageLogId?: string
  mode?: AiMode
}): Promise<{ ok: boolean }> {
  if (params.credits <= 0) return { ok: true }

  const account = await ensureCreditAccount(params.userId)
  const available = totalCredits(account)

  // Fast-path advisory rejection. The conditional updateMany below is the
  // authoritative gate — this avoids a transaction round-trip when the
  // account is plainly underwater.
  if (available < params.credits) {
    return { ok: false }
  }

  return prisma.$transaction(async (tx) => {
    const cur = await tx.aiCreditAccount.findUnique({ where: { id: account.id } })
    if (!cur) return { ok: false as const }

    // Spend purchased credits first (they never expire), then monthly.
    const fromPurchased = Math.min(cur.purchasedCredits, params.credits)
    const fromMonthly = params.credits - fromPurchased

    const result = await tx.aiCreditAccount.updateMany({
      where: {
        id: account.id,
        purchasedCredits: { gte: fromPurchased },
        monthlyCredits: { gte: fromMonthly },
      },
      data: {
        purchasedCredits: { decrement: fromPurchased },
        monthlyCredits: { decrement: fromMonthly },
      },
    })

    if (result.count === 0) {
      // Lost the race — another concurrent debit consumed the credits we
      // intended to spend. Balance unchanged, no ledger row written.
      return { ok: false as const }
    }

    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: 'debit',
        credits: -params.credits,
        featureKey: params.featureKey,
        usageLogId: params.usageLogId ?? null,
        note: params.mode ? `mode=${params.mode}` : null,
      },
    })

    return { ok: true as const }
  })
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

  await prisma.$transaction(async (tx) => {
    await tx.aiCreditAccount.update({
      where: { id: account.id },
      data: { monthlyCredits: { increment: params.credits } },
    })

    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: 'refund',
        credits: params.credits,
        featureKey: params.featureKey,
        usageLogId: params.usageLogId ?? null,
        note: params.note ?? 'ai_call_failed_refund',
      },
    })
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
  const full = await prisma.aiCreditAccount.findUnique({ where: { id: account.id } })
  const resetAt = full?.monthlyResetAt ?? nextMonthlyReset()
  return {
    monthlyCredits: account.monthlyCredits,
    purchasedCredits: account.purchasedCredits,
    totalAvailable: totalCredits(account),
    monthlyResetAt: resetAt,
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
  const ledgerType = params.note?.startsWith('stripe:') ? 'purchase' : 'admin_adjustment'

  await prisma.$transaction(async (tx) => {
    await tx.aiCreditAccount.update({
      where: { id: account.id },
      data: { purchasedCredits: { increment: params.credits } },
    })

    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: ledgerType,
        credits: params.credits,
        featureKey: params.featureKey ?? null,
        usageLogId: null,
        note: params.note ?? 'admin_adjustment',
      },
    })
  })

  const summary = await getCreditSummary(params.userId)
  return { totalAvailable: summary.totalAvailable }
}

/**
 * Increment purchased credits and append a ledger row INSIDE an existing
 * transaction. Used by the Stripe webhook handler so the idempotency marker and
 * the credit grant commit (or roll back) as one atomic unit — a crash or retry
 * can never grant credits without also persisting the "event processed" marker,
 * and vice versa.
 *
 * The caller is responsible for the idempotency check and for running this in a
 * Serializable transaction.
 */
export async function grantPurchasedCreditsWithinTx(
  tx: Prisma.TransactionClient,
  params: { accountId: string; credits: number; note?: string; featureKey?: string | null },
): Promise<void> {
  if (params.credits <= 0) return
  const ledgerType = params.note?.startsWith('stripe:') ? 'purchase' : 'admin_adjustment'
  await tx.aiCreditAccount.update({
    where: { id: params.accountId },
    data: { purchasedCredits: { increment: params.credits } },
  })
  await tx.aiCreditLedger.create({
    data: {
      accountId: params.accountId,
      type: ledgerType,
      credits: params.credits,
      featureKey: params.featureKey ?? null,
      usageLogId: null,
      note: params.note ?? 'admin_adjustment',
    },
  })
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
  const rows = await prisma.aiCreditLedger.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      credits: true,
      featureKey: true,
      note: true,
      createdAt: true,
    },
  })
  return rows
}

export interface AiUsageLogRow {
  id: string
  featureKey: string
  mode: string
  provider: string
  model: string
  totalTokens: number
  creditsCharged: number
  success: boolean
  errorCode: string | null
  createdAt: Date
}

/** Recent AI usage rows from the local AiUsageLog table. */
export async function getRecentAiUsageForUser(
  userId: string,
  limit = 50,
): Promise<AiUsageLogRow[]> {
  return prisma.aiUsageLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      featureKey: true,
      mode: true,
      provider: true,
      model: true,
      totalTokens: true,
      creditsCharged: true,
      success: true,
      errorCode: true,
      createdAt: true,
    },
  })
}

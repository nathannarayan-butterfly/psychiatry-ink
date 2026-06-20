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
 * deductCreditsTransactionally — atomically decrements the account balance
 *                  inside a single Prisma transaction. **Bucket order: monthly
 *                  → purchased**: the free monthly grant is consumed first so
 *                  the user's paid-for purchased credits (which never expire)
 *                  outlive the monthly grant.  When a single debit spans both
 *                  buckets, two ledger rows are emitted (one per bucket) so
 *                  analytics can split monthly vs purchased consumption.
 *                  Uses a conditional `updateMany` with `gte` guards on both
 *                  buckets so two concurrent debits can never drive either
 *                  bucket negative; the loser observes `result.count === 0`
 *                  and returns `{ ok: false }` without writing ledger rows.
 *
 * refundCredits  — appends a refund ledger entry (for failed calls where no
 *                  usable output was returned).
 */

import { prisma } from '../db'
import type { AiMode } from '../../src/types/aiUsage'
import { MONTHLY_CREDIT_GRANT } from './aiPricingConfig'

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
        bucket: 'monthly',
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

    // Monthly first (free grant, expires each period), purchased second
    // (non-expiring, paid for). Concretely: a debit of 70 against an account
    // with 50 monthly + 30 purchased drains 50 monthly + 20 purchased.
    const fromMonthly = Math.min(cur.monthlyCredits, params.credits)
    const fromPurchased = params.credits - fromMonthly

    const result = await tx.aiCreditAccount.updateMany({
      where: {
        id: account.id,
        monthlyCredits: { gte: fromMonthly },
        purchasedCredits: { gte: fromPurchased },
      },
      data: {
        monthlyCredits: { decrement: fromMonthly },
        purchasedCredits: { decrement: fromPurchased },
      },
    })

    if (result.count === 0) {
      // Lost the race — another concurrent debit consumed the credits we
      // intended to spend. Balance unchanged, no ledger row written.
      return { ok: false as const }
    }

    // Emit one ledger row per bucket that was actually touched. Both rows
    // share the same featureKey and usageLogId so a UI/CSV joining on those
    // can reconstruct the per-call total.
    const note = params.mode ? `mode=${params.mode}` : null
    if (fromMonthly > 0) {
      await tx.aiCreditLedger.create({
        data: {
          accountId: account.id,
          type: 'debit',
          credits: -fromMonthly,
          bucket: 'monthly',
          featureKey: params.featureKey,
          usageLogId: params.usageLogId ?? null,
          note,
        },
      })
    }
    if (fromPurchased > 0) {
      await tx.aiCreditLedger.create({
        data: {
          accountId: account.id,
          type: 'debit',
          credits: -fromPurchased,
          bucket: 'purchased',
          featureKey: params.featureKey,
          usageLogId: params.usageLogId ?? null,
          note,
        },
      })
    }

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
        bucket: 'monthly',
        featureKey: params.featureKey,
        usageLogId: params.usageLogId ?? null,
        note: params.note ?? 'ai_call_failed_refund',
      },
    })
  })
}

/**
 * Credit an account with non-expiring purchased credits (called by the
 * Stripe webhook when a bundle purchase is confirmed paid). Idempotent at
 * the ledger level: callers must pass a unique `note` (e.g.
 * `bundle_purchase:<purchaseId>`) so a replayed webhook is a no-op.
 *
 * Append-only: increments AiCreditAccount.purchasedCredits and writes a
 * `purchase`-typed ledger row, atomically.
 */
export async function creditPurchasedCredits(params: {
  userId: string
  credits: number
  purchaseId: string
  note?: string
}): Promise<{ ok: true } | { ok: false; reason: 'duplicate' | 'invalid' }> {
  if (params.credits <= 0) return { ok: false, reason: 'invalid' }

  const account = await ensureCreditAccount(params.userId)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.aiCreditLedger.findFirst({
      where: { accountId: account.id, note: `bundle_purchase:${params.purchaseId}` },
    })
    if (existing) return { ok: false as const, reason: 'duplicate' as const }

    await tx.aiCreditAccount.update({
      where: { id: account.id },
      data: { purchasedCredits: { increment: params.credits } },
    })
    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: 'purchase',
        credits: params.credits,
        bucket: 'purchased',
        featureKey: null,
        usageLogId: null,
        note: params.note ?? `bundle_purchase:${params.purchaseId}`,
      },
    })
    return { ok: true as const }
  })
}

/** Read current balance summary for a user. */
export async function getCreditSummary(userId: string): Promise<{
  monthlyCredits: number
  purchasedCredits: number
  totalAvailable: number
  monthlyResetAt: Date
}> {
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

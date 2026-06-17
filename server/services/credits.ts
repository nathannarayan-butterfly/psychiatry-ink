import { prisma } from '../db'

const LEGACY_ACCOUNT_ID = 'default'
const LEGACY_DEFAULT_BALANCE = 500
/** Matches src/data/subscriptionPlans.ts FREE_SIGNUP_CREDITS */
const FREE_SIGNUP_CREDITS = 200

export type UserPlan = 'free' | 'pro'

export function accountIdFromUserId(userId: string | undefined): string {
  return userId?.trim() || LEGACY_ACCOUNT_ID
}

export async function ensureCreditAccount(userId?: string) {
  const id = accountIdFromUserId(userId)
  const isLegacy = id === LEGACY_ACCOUNT_ID

  // Atomic upsert avoids the find-then-create race where two concurrent
  // requests both create the same id and hit a unique-constraint error.
  return prisma.creditBalance.upsert({
    where: { id },
    update: {},
    create: {
      id,
      balance: isLegacy ? LEGACY_DEFAULT_BALANCE : FREE_SIGNUP_CREDITS,
      plan: 'free',
    },
  })
}

export async function getCreditBalance(userId?: string): Promise<number> {
  const account = await ensureCreditAccount(userId)
  return account.balance
}

export async function getUserPlan(userId?: string): Promise<UserPlan> {
  const account = await ensureCreditAccount(userId)
  return account.plan === 'pro' ? 'pro' : 'free'
}

export async function canAfford(amount: number, userId?: string): Promise<boolean> {
  if (amount <= 0) return true
  const balance = await getCreditBalance(userId)
  return balance >= amount
}

export async function deductCredits(amount: number, userId?: string): Promise<number> {
  if (amount <= 0) return getCreditBalance(userId)

  const id = accountIdFromUserId(userId)
  await ensureCreditAccount(userId)

  // Serialize read+write in a transaction so concurrent deductions cannot
  // lose updates (prevents double-spend on overlapping requests).
  return prisma.$transaction(async (tx) => {
    const account = await tx.creditBalance.findUnique({ where: { id } })
    const current = account?.balance ?? 0
    const next = Math.max(0, current - amount)
    const updated = await tx.creditBalance.update({
      where: { id },
      data: { balance: next },
    })
    return updated.balance
  })
}

/**
 * Atomically reserve (decrement) credits for a generation iff the account can
 * afford them. The conditional `updateMany ... where balance >= amount` is a
 * SINGLE SQL UPDATE, so two concurrent generations can never both pass an
 * affordability check and then overspend — exactly one wins when the balance is
 * tight. Returns whether the reservation succeeded plus the resulting balance.
 */
export async function reserveCredits(
  amount: number,
  userId?: string,
): Promise<{ ok: boolean; balance: number }> {
  const id = accountIdFromUserId(userId)
  await ensureCreditAccount(userId)

  if (amount <= 0) {
    const account = await prisma.creditBalance.findUnique({ where: { id } })
    return { ok: true, balance: account?.balance ?? 0 }
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.creditBalance.updateMany({
      where: { id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    })
    const account = await tx.creditBalance.findUnique({ where: { id } })
    return { ok: result.count > 0, balance: account?.balance ?? 0 }
  })
}

/** Refund previously-reserved credits (e.g. a generation that ultimately failed). */
export async function refundCredits(amount: number, userId?: string): Promise<number> {
  if (amount <= 0) return getCreditBalance(userId)
  const id = accountIdFromUserId(userId)
  await ensureCreditAccount(userId)
  const updated = await prisma.creditBalance.update({
    where: { id },
    data: { balance: { increment: amount } },
  })
  return updated.balance
}

/** Stripe billing stub — manual upgrade for development. */
export async function setUserPlan(userId: string, plan: UserPlan): Promise<UserPlan> {
  await ensureCreditAccount(userId)
  const updated = await prisma.creditBalance.update({
    where: { id: userId },
    data: { plan },
  })
  return updated.plan === 'pro' ? 'pro' : 'free'
}

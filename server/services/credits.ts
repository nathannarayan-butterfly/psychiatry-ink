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
  const existing = await prisma.creditBalance.findUnique({ where: { id } })
  if (existing) return existing

  const isLegacy = id === LEGACY_ACCOUNT_ID
  return prisma.creditBalance.create({
    data: {
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
  const account = await ensureCreditAccount(userId)
  const next = Math.max(0, account.balance - amount)

  const updated = await prisma.creditBalance.update({
    where: { id },
    data: { balance: next },
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

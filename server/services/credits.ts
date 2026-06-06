import { prisma } from '../db'

const DEFAULT_BALANCE = 500
const ACCOUNT_ID = 'default'

export async function ensureCreditAccount() {
  const existing = await prisma.creditBalance.findUnique({ where: { id: ACCOUNT_ID } })
  if (existing) return existing

  return prisma.creditBalance.create({
    data: { id: ACCOUNT_ID, balance: DEFAULT_BALANCE },
  })
}

export async function getCreditBalance(): Promise<number> {
  const account = await ensureCreditAccount()
  return account.balance
}

export async function canAfford(amount: number): Promise<boolean> {
  if (amount <= 0) return true
  const balance = await getCreditBalance()
  return balance >= amount
}

export async function deductCredits(amount: number): Promise<number> {
  if (amount <= 0) return getCreditBalance()

  const account = await ensureCreditAccount()
  const next = Math.max(0, account.balance - amount)

  const updated = await prisma.creditBalance.update({
    where: { id: ACCOUNT_ID },
    data: { balance: next },
  })

  return updated.balance
}

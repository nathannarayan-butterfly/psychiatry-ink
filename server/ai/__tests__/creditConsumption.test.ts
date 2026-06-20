/**
 * Bucket-consumption tests for AiCreditAccount.
 *
 * Spec: monthly credits drain first, purchased credits drain second. When a
 * single debit spans both buckets, ONE row per bucket is written to
 * AiCreditLedger so analytics can split monthly vs purchased consumption.
 *
 * These tests run against the same Prisma mocks as creditSystem.test.ts but
 * are kept in a separate file so the bucket semantics are easy to grep.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../db', () => ({
  prisma: {
    aiCreditAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    aiCreditLedger: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../db'
import { deductCreditsTransactionally, creditPurchasedCredits } from '../creditGuard'

const mockedPrisma = vi.mocked(prisma, true)

interface BalanceState {
  monthlyCredits: number
  purchasedCredits: number
}

function wireBucketSim(initial: BalanceState) {
  const balance: BalanceState = { ...initial }
  const ledgerRows: Array<{
    type: string
    credits: number
    bucket: string
  }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditAccount.findUnique as any).mockImplementation(async () => ({
    id: 'acc-1',
    userId: 'user-1',
    organisationId: null,
    monthlyCredits: balance.monthlyCredits,
    purchasedCredits: balance.purchasedCredits,
    monthlyResetAt: new Date(Date.now() + 30 * 86_400 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditAccount.updateMany as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => {
      const minMonthly = args.where?.monthlyCredits?.gte ?? 0
      const minPurchased = args.where?.purchasedCredits?.gte ?? 0
      if (
        balance.monthlyCredits < minMonthly ||
        balance.purchasedCredits < minPurchased
      ) {
        return { count: 0 }
      }
      balance.monthlyCredits -= args.data?.monthlyCredits?.decrement ?? 0
      balance.purchasedCredits -= args.data?.purchasedCredits?.decrement ?? 0
      return { count: 1 }
    },
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditAccount.update as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => {
      balance.monthlyCredits += args.data?.monthlyCredits?.increment ?? 0
      balance.purchasedCredits += args.data?.purchasedCredits?.increment ?? 0
      return {}
    },
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditLedger.create as any).mockImplementation(async (args: any) => {
    ledgerRows.push({
      type: args.data.type,
      credits: args.data.credits,
      bucket: args.data.bucket,
    })
    return { id: `led-${ledgerRows.length}` }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditLedger.findFirst as any).mockResolvedValue(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
    return fn({
      aiCreditAccount: {
        findUnique: mockedPrisma.aiCreditAccount.findUnique,
        update: mockedPrisma.aiCreditAccount.update,
        updateMany: mockedPrisma.aiCreditAccount.updateMany,
      },
      aiCreditLedger: {
        create: mockedPrisma.aiCreditLedger.create,
        findFirst: mockedPrisma.aiCreditLedger.findFirst,
      },
    })
  })

  return { balance, ledgerRows }
}

describe('creditGuard.deductCreditsTransactionally — bucket order', () => {
  beforeEach(() => vi.clearAllMocks())

  it('drains monthly credits first when the debit fits in monthly', async () => {
    const { balance, ledgerRows } = wireBucketSim({ monthlyCredits: 50, purchasedCredits: 30 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 20,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(true)
    expect(balance.monthlyCredits).toBe(30)
    expect(balance.purchasedCredits).toBe(30) // untouched
    expect(ledgerRows).toEqual([
      { type: 'debit', credits: -20, bucket: 'monthly' },
    ])
  })

  it('spans both buckets: monthly first, purchased fills the rest (one ledger row per bucket)', async () => {
    const { balance, ledgerRows } = wireBucketSim({ monthlyCredits: 50, purchasedCredits: 30 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 70,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(true)
    expect(balance.monthlyCredits).toBe(0)
    expect(balance.purchasedCredits).toBe(10)
    expect(ledgerRows).toEqual([
      { type: 'debit', credits: -50, bucket: 'monthly' },
      { type: 'debit', credits: -20, bucket: 'purchased' },
    ])
  })

  it('uses only purchased credits when the monthly bucket is empty', async () => {
    const { balance, ledgerRows } = wireBucketSim({ monthlyCredits: 0, purchasedCredits: 30 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 20,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(true)
    expect(balance.monthlyCredits).toBe(0)
    expect(balance.purchasedCredits).toBe(10)
    expect(ledgerRows).toEqual([
      { type: 'debit', credits: -20, bucket: 'purchased' },
    ])
  })

  it('rejects without writing a ledger row when total balance is insufficient', async () => {
    const { balance, ledgerRows } = wireBucketSim({ monthlyCredits: 5, purchasedCredits: 5 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 50,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(false)
    expect(balance.monthlyCredits).toBe(5)
    expect(balance.purchasedCredits).toBe(5)
    expect(ledgerRows).toEqual([])
  })
})

describe('creditGuard.creditPurchasedCredits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('increments purchased balance and writes a purchase ledger row', async () => {
    const { balance, ledgerRows } = wireBucketSim({ monthlyCredits: 100, purchasedCredits: 0 })
    const result = await creditPurchasedCredits({
      userId: 'user-1',
      credits: 250,
      purchaseId: 'purchase-1',
    })

    expect(result.ok).toBe(true)
    expect(balance.purchasedCredits).toBe(250)
    expect(balance.monthlyCredits).toBe(100) // untouched
    expect(ledgerRows).toEqual([
      { type: 'purchase', credits: 250, bucket: 'purchased' },
    ])
  })

  it('idempotency: a replayed purchase webhook is a no-op', async () => {
    wireBucketSim({ monthlyCredits: 100, purchasedCredits: 250 })

    ;(mockedPrisma.aiCreditLedger.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'led-prev',
      accountId: 'acc-1',
      type: 'purchase',
      credits: 250,
      bucket: 'purchased',
      note: 'bundle_purchase:purchase-1',
    })

    const result = await creditPurchasedCredits({
      userId: 'user-1',
      credits: 250,
      purchaseId: 'purchase-1',
    })

    expect(result).toEqual({ ok: false, reason: 'duplicate' })
    expect(mockedPrisma.aiCreditAccount.update).not.toHaveBeenCalled()
  })
})

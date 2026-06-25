import { beforeEach, describe, expect, it, vi } from 'vitest'

const deductCreditsTransactionally = vi.fn()
const getCreditSummary = vi.fn()
const refundAiCredits = vi.fn()
const migrateLegacyCreditsIfNeeded = vi.fn()

vi.mock('../ai/creditGuard', () => ({
  deductCreditsTransactionally: (...args: unknown[]) => deductCreditsTransactionally(...args),
  getCreditSummary: (...args: unknown[]) => getCreditSummary(...args),
  refundCredits: (...args: unknown[]) => refundAiCredits(...args),
}))

vi.mock('./creditMigration', () => ({
  migrateLegacyCreditsIfNeeded: (...args: unknown[]) => migrateLegacyCreditsIfNeeded(...args),
  accountIdFromUserId: (userId?: string) => userId?.trim() || 'default',
}))

// The legacy credit_balances seam is only touched by the local-dev 'default'
// path; these tests exercise the authenticated 'user-1' path, which delegates
// to the mocked creditGuard. Mock the repo so the module imports cleanly without
// a live Supabase client.
vi.mock('../data/creditBalances', () => ({
  creditBalancesRepo: {
    ensureCreditBalance: vi.fn(),
    getCreditBalance: vi.fn(),
    setCreditBalance: vi.fn(),
    setCreditBalancePlan: vi.fn(),
  },
}))

import { refundCredits, reserveCredits } from './credits'

beforeEach(() => {
  deductCreditsTransactionally.mockReset()
  getCreditSummary.mockReset()
  refundAiCredits.mockReset()
  migrateLegacyCreditsIfNeeded.mockReset()
  migrateLegacyCreditsIfNeeded.mockResolvedValue(undefined)
  getCreditSummary.mockResolvedValue({
    monthlyCredits: 90,
    purchasedCredits: 0,
    totalAvailable: 90,
    monthlyResetAt: new Date(),
  })
})

describe('reserveCredits (AiCreditAccount)', () => {
  it('delegates to deductCreditsTransactionally for authenticated users', async () => {
    deductCreditsTransactionally.mockResolvedValue({ ok: true })

    const result = await reserveCredits(10, 'user-1')

    expect(result.ok).toBe(true)
    expect(deductCreditsTransactionally).toHaveBeenCalledWith({
      userId: 'user-1',
      credits: 10,
      featureKey: 'generation_log_reserve',
    })
  })

  it('returns ok=false when the debit transaction fails', async () => {
    deductCreditsTransactionally.mockResolvedValue({ ok: false })
    getCreditSummary.mockResolvedValue({
      monthlyCredits: 5,
      purchasedCredits: 0,
      totalAvailable: 5,
      monthlyResetAt: new Date(),
    })

    const result = await reserveCredits(10, 'user-1')

    expect(result.ok).toBe(false)
    expect(result.balance).toBe(5)
  })
})

describe('refundCredits', () => {
  it('delegates to the AI credit refund path', async () => {
    getCreditSummary.mockResolvedValue({
      monthlyCredits: 110,
      purchasedCredits: 0,
      totalAvailable: 110,
      monthlyResetAt: new Date(),
    })

    const balance = await refundCredits(10, 'user-1')

    expect(refundAiCredits).toHaveBeenCalledWith({
      userId: 'user-1',
      credits: 10,
      featureKey: 'generation_log_reserve',
      note: 'generation_log_refund',
    })
    expect(balance).toBe(110)
  })
})

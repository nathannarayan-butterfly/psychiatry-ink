/**
 * creditGuard spend-path access gate (Change 2 — credits require a plan to USE).
 *
 * Verifies that the spend path (`deductCreditsTransactionally` →
 * `assertCanSpendCredits`) blocks users without an active subscription/trial,
 * even when they hold banked `purchased_credits`, while BANKING credits
 * (`addPurchasedCredits` — packs, vouchers, admin grants) stays allowed.
 *
 * Unlike creditSystem.test.ts this file uses the REAL subscriptionAccess so the
 * end-to-end access decision (computeAccess + AccessLockedError) is exercised.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const getAccountByUserId = vi.fn()
const ensureAccount = vi.fn()
const debit = vi.fn()
const grantPurchased = vi.fn()

vi.mock('../../data/credits', () => ({
  creditsRepo: {
    getAccountByUserId: (...a: unknown[]) => getAccountByUserId(...a),
    ensureAccount: (...a: unknown[]) => ensureAccount(...a),
    debit: (...a: unknown[]) => debit(...a),
    grantPurchased: (...a: unknown[]) => grantPurchased(...a),
    refund: vi.fn(),
    listLedger: vi.fn(),
  },
}))

vi.mock('../../services/creditMigration', () => ({
  migrateLegacyCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
  accountIdFromUserId: (userId?: string) => userId?.trim() || 'default',
}))

import {
  addPurchasedCredits,
  assertCanSpendCredits,
  deductCreditsTransactionally,
} from '../creditGuard'
import { AccessLockedError } from '../../services/subscriptionAccess'

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString()
const PAST = new Date(Date.now() - 30 * 86_400_000).toISOString()

type AccountRow = {
  id: string
  user_id: string
  monthly_credits: number
  purchased_credits: number
  monthly_reset_at: string
  trial_ends_at: string | null
  subscription_status: string | null
  subscription_plan: string | null
  subscription_interval: string | null
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'acc-1',
    user_id: 'user-1',
    monthly_credits: 0,
    purchased_credits: 0,
    monthly_reset_at: FUTURE,
    trial_ends_at: null,
    subscription_status: null,
    subscription_plan: null,
    subscription_interval: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.REQUIRE_SUBSCRIPTION_FOR_CREDITS = 'true'
  debit.mockResolvedValue(true)
})

afterEach(() => {
  delete process.env.REQUIRE_SUBSCRIPTION_FOR_CREDITS
})

describe('assertCanSpendCredits', () => {
  it('allows an active subscriber (even with banked purchased credits)', async () => {
    getAccountByUserId.mockResolvedValue(
      accountRow({ subscription_status: 'active', purchased_credits: 500 }),
    )
    await expect(assertCanSpendCredits('user-1')).resolves.toBeUndefined()
  })

  it('allows a user inside an active trial', async () => {
    getAccountByUserId.mockResolvedValue(accountRow({ trial_ends_at: FUTURE }))
    await expect(assertCanSpendCredits('user-1')).resolves.toBeUndefined()
  })

  it('blocks a no-subscription user holding purchased credits with subscription_required', async () => {
    getAccountByUserId.mockResolvedValue(
      accountRow({ trial_ends_at: PAST, purchased_credits: 500 }),
    )
    await expect(assertCanSpendCredits('user-1')).rejects.toMatchObject({
      code: 'subscription_required',
      reason: 'subscription_required',
    })
    await expect(assertCanSpendCredits('user-1')).rejects.toBeInstanceOf(AccessLockedError)
  })

  it('keeps the onboarding grace for a user who never started a trial', async () => {
    getAccountByUserId.mockResolvedValue(accountRow({ trial_ends_at: null }))
    await expect(assertCanSpendCredits('user-1')).resolves.toBeUndefined()
  })

  it('honours REQUIRE_SUBSCRIPTION_FOR_CREDITS=false (legacy: credits unlock spend)', async () => {
    process.env.REQUIRE_SUBSCRIPTION_FOR_CREDITS = 'false'
    getAccountByUserId.mockResolvedValue(
      accountRow({ trial_ends_at: PAST, purchased_credits: 500 }),
    )
    await expect(assertCanSpendCredits('user-1')).resolves.toBeUndefined()
  })
})

describe('deductCreditsTransactionally — spend gate', () => {
  it('subscriber: deducts and returns ok=true', async () => {
    getAccountByUserId.mockResolvedValue(
      accountRow({ subscription_status: 'active', purchased_credits: 500 }),
    )
    ensureAccount.mockResolvedValue(
      accountRow({ subscription_status: 'active', purchased_credits: 500 }),
    )

    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(true)
    expect(debit).toHaveBeenCalledOnce()
  })

  it('no-subscription user with banked credits: throws AccessLockedError, never debits', async () => {
    getAccountByUserId.mockResolvedValue(
      accountRow({ trial_ends_at: PAST, purchased_credits: 500 }),
    )
    ensureAccount.mockResolvedValue(accountRow({ purchased_credits: 500 }))

    await expect(
      deductCreditsTransactionally({
        userId: 'user-1',
        credits: 5,
        featureKey: 'inline_text_edit',
      }),
    ).rejects.toBeInstanceOf(AccessLockedError)

    expect(debit).not.toHaveBeenCalled()
  })
})

describe('addPurchasedCredits — banking stays allowed without a plan', () => {
  it('grants purchased credits to a no-subscription account (buying/redeeming allowed)', async () => {
    ensureAccount.mockResolvedValue(accountRow({ purchased_credits: 0 }))

    const result = await addPurchasedCredits({
      userId: 'user-1',
      credits: 1000,
      note: 'stripe:checkout:cs_test:gift_1000',
    })

    expect(grantPurchased).toHaveBeenCalledOnce()
    const [accountId, credits] = grantPurchased.mock.calls[0]
    expect(accountId).toBe('acc-1')
    expect(credits).toBe(1000)
    // The access gate is NOT consulted when banking credits.
    expect(getAccountByUserId).not.toHaveBeenCalled()
    expect(result.totalAvailable).toBeTypeOf('number')
  })
})

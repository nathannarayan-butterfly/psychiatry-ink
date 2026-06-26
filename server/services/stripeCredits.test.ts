import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stripe Checkout session create — captured per test so we can assert the exact
// params the service sends (trial_end + payment_method_collection).
const checkoutSessionsCreate = vi.fn()

vi.mock('stripe', () => ({
  default: class FakeStripe {
    checkout = { sessions: { create: checkoutSessionsCreate } }
    webhooks = { constructEvent: vi.fn() }
    subscriptions = { retrieve: vi.fn() }
  },
}))

// Mock the Supabase read seam so no live client is required.
const getAccountByUserId = vi.fn()
vi.mock('../data/credits', () => ({
  creditsRepo: {
    getAccountByUserId: (...args: unknown[]) => getAccountByUserId(...args),
  },
}))

// Webhook-only collaborators — mocked so the module imports without env/Supabase.
vi.mock('../ai/creditGuard', () => ({ addPurchasedCredits: vi.fn() }))
vi.mock('../data/appSettings', () => ({
  claimEventMarker: vi.fn(),
  releaseEventMarker: vi.fn(),
}))

import { createSubscriptionCheckoutSession, resolveSubscriptionTrialEnd } from './stripeCredits'

const NOW = new Date('2026-06-26T12:00:00.000Z')

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  checkoutSessionsCreate.mockReset()
  checkoutSessionsCreate.mockResolvedValue({ id: 'cs_test_123' })
  getAccountByUserId.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('resolveSubscriptionTrialEnd', () => {
  it('returns the trial end (unix seconds) when the app trial is comfortably in the future', () => {
    const trialEndsAt = '2026-07-06T12:00:00.000Z' // ~10 days out
    const result = resolveSubscriptionTrialEnd(trialEndsAt, NOW)
    expect(result).toBe(Math.floor(Date.parse(trialEndsAt) / 1000))
  })

  it('returns null when there is no recorded trial', () => {
    expect(resolveSubscriptionTrialEnd(null, NOW)).toBeNull()
    expect(resolveSubscriptionTrialEnd(undefined, NOW)).toBeNull()
    expect(resolveSubscriptionTrialEnd('not-a-date', NOW)).toBeNull()
  })

  it('returns null when the trial has already ended (bill immediately)', () => {
    expect(resolveSubscriptionTrialEnd('2026-06-01T00:00:00.000Z', NOW)).toBeNull()
  })

  it('returns null when the remaining trial is below Stripe’s ~48h floor', () => {
    // 47h in the future — under the 48h minimum → fall back to immediate billing.
    const justUnder48h = new Date(NOW.getTime() + 47 * 60 * 60 * 1000).toISOString()
    expect(resolveSubscriptionTrialEnd(justUnder48h, NOW)).toBeNull()
  })

  it('accepts exactly the 48h boundary', () => {
    const exactly48h = new Date(NOW.getTime() + 48 * 60 * 60 * 1000).toISOString()
    expect(resolveSubscriptionTrialEnd(exactly48h, NOW)).toBe(
      Math.floor(Date.parse(exactly48h) / 1000),
    )
  })

  it('returns null when the trial end exceeds Stripe’s 5-year ceiling', () => {
    const sixYears = new Date(NOW.getTime() + 6 * 365 * 24 * 60 * 60 * 1000).toISOString()
    expect(resolveSubscriptionTrialEnd(sixYears, NOW)).toBeNull()
  })
})

describe('createSubscriptionCheckoutSession — trial alignment', () => {
  const baseParams = {
    userId: 'user-1',
    interval: 'month' as const,
    successUrl: 'https://app.example/success',
    cancelUrl: 'https://app.example/cancel',
  }

  it('(a) defers first billing to trial_end and forces card collection when inside the trial', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const trialEndsAt = '2026-07-06T12:00:00.000Z'
    getAccountByUserId.mockResolvedValue({
      stripe_customer_id: null,
      trial_ends_at: trialEndsAt,
    })

    await createSubscriptionCheckoutSession(baseParams)

    expect(checkoutSessionsCreate).toHaveBeenCalledTimes(1)
    const args = checkoutSessionsCreate.mock.calls[0][0]
    expect(args.subscription_data.trial_end).toBe(Math.floor(Date.parse(trialEndsAt) / 1000))
    expect(args.payment_method_collection).toBe('always')
  })

  it('(b) bills immediately (no trial_end) when the trial is absent', async () => {
    getAccountByUserId.mockResolvedValue({ stripe_customer_id: null, trial_ends_at: null })

    await createSubscriptionCheckoutSession(baseParams)

    const args = checkoutSessionsCreate.mock.calls[0][0]
    expect(args.subscription_data.trial_end).toBeUndefined()
    expect(args.payment_method_collection).toBeUndefined()
  })

  it('(c) bills immediately (no trial_end) when the remaining trial is below 48h', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const justUnder48h = new Date(NOW.getTime() + 47 * 60 * 60 * 1000).toISOString()
    getAccountByUserId.mockResolvedValue({
      stripe_customer_id: null,
      trial_ends_at: justUnder48h,
    })

    await createSubscriptionCheckoutSession(baseParams)

    const args = checkoutSessionsCreate.mock.calls[0][0]
    expect(args.subscription_data.trial_end).toBeUndefined()
    expect(args.payment_method_collection).toBeUndefined()
  })
})

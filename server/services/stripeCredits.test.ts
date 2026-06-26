import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stripe Checkout session create — captured per test so we can assert the exact
// params the service sends (trial_end + payment_method_collection).
const checkoutSessionsCreate = vi.fn()
const webhooksConstructEvent = vi.fn()

vi.mock('stripe', () => ({
  default: class FakeStripe {
    checkout = { sessions: { create: checkoutSessionsCreate } }
    webhooks = { constructEvent: webhooksConstructEvent }
    subscriptions = { retrieve: vi.fn() }
    paymentIntents = { retrieve: vi.fn(), create: vi.fn() }
    setupIntents = { retrieve: vi.fn() }
    customers = { create: vi.fn(), update: vi.fn() }
  },
}))

// Mock the Supabase read seam so no live client is required.
const getAccountByUserId = vi.fn()
const finishAutoRecharge = vi.fn()
const setPaymentMethod = vi.fn()
const getUserIdByStripeCustomerId = vi.fn()
vi.mock('../data/credits', () => ({
  creditsRepo: {
    getAccountByUserId: (...args: unknown[]) => getAccountByUserId(...args),
    finishAutoRecharge: (...args: unknown[]) => finishAutoRecharge(...args),
    setPaymentMethod: (...args: unknown[]) => setPaymentMethod(...args),
    getUserIdByStripeCustomerId: (...args: unknown[]) => getUserIdByStripeCustomerId(...args),
  },
}))

// Webhook-only collaborators — mocked so the module imports without env/Supabase.
const addPurchasedCredits = vi.fn()
const claimEventMarker = vi.fn()
const releaseEventMarker = vi.fn()
vi.mock('../ai/creditGuard', () => ({ addPurchasedCredits: (...args: unknown[]) => addPurchasedCredits(...args) }))
vi.mock('../data/appSettings', () => ({
  claimEventMarker: (...args: unknown[]) => claimEventMarker(...args),
  releaseEventMarker: (...args: unknown[]) => releaseEventMarker(...args),
}))

import {
  createSubscriptionCheckoutSession,
  handleStripeWebhook,
  resolveSubscriptionTrialEnd,
} from './stripeCredits'

const NOW = new Date('2026-06-26T12:00:00.000Z')

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy'
  checkoutSessionsCreate.mockReset()
  checkoutSessionsCreate.mockResolvedValue({ id: 'cs_test_123' })
  getAccountByUserId.mockReset()
  webhooksConstructEvent.mockReset()
  finishAutoRecharge.mockReset().mockResolvedValue(null)
  setPaymentMethod.mockReset().mockResolvedValue(null)
  getUserIdByStripeCustomerId.mockReset().mockResolvedValue(null)
  addPurchasedCredits.mockReset().mockResolvedValue({ totalAvailable: 0 })
  // First delivery claims the marker by default; tests override for duplicates.
  claimEventMarker.mockReset().mockResolvedValue(true)
  releaseEventMarker.mockReset().mockResolvedValue(undefined)
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

describe('handleStripeWebhook — auto-recharge payment_intent.succeeded', () => {
  function autoRechargeIntentEvent(overrides: Record<string, unknown> = {}) {
    return {
      id: 'evt_ar_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_ar_1',
          status: 'succeeded',
          customer: 'cus_1',
          metadata: { kind: 'auto_recharge', userId: 'user-1', packId: 'pack_1000', credits: '1000' },
          ...overrides,
        },
      },
    }
  }

  it('grants credits once (idempotent) and releases the lock for an auto-recharge intent', async () => {
    webhooksConstructEvent.mockReturnValue(autoRechargeIntentEvent())

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(claimEventMarker).toHaveBeenCalledWith('stripe:event:evt_ar_1')
    expect(addPurchasedCredits).toHaveBeenCalledTimes(1)
    expect(addPurchasedCredits).toHaveBeenCalledWith({
      userId: 'user-1',
      credits: 1000,
      note: 'stripe:auto_recharge:pi_ar_1:pack_1000',
    })
    expect(finishAutoRecharge).toHaveBeenCalledWith('user-1', { success: true })
  })

  it('does NOT grant twice when the event was already processed (marker not claimed)', async () => {
    claimEventMarker.mockResolvedValue(false)
    webhooksConstructEvent.mockReturnValue(autoRechargeIntentEvent())

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(addPurchasedCredits).not.toHaveBeenCalled()
  })

  it('ignores a manual-purchase PaymentIntent (granted via checkout.session.completed)', async () => {
    webhooksConstructEvent.mockReturnValue(
      autoRechargeIntentEvent({ metadata: { kind: 'manual_purchase', userId: 'user-1' } }),
    )

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(claimEventMarker).not.toHaveBeenCalled()
    expect(addPurchasedCredits).not.toHaveBeenCalled()
  })

  it('disables auto-recharge on payment_intent.payment_failed (auto-recharge intent)', async () => {
    webhooksConstructEvent.mockReturnValue({
      id: 'evt_ar_fail',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_ar_fail',
          status: 'requires_payment_method',
          customer: 'cus_1',
          metadata: { kind: 'auto_recharge', userId: 'user-1', packId: 'pack_1000', credits: '1000' },
          last_payment_error: { code: 'card_declined' },
        },
      },
    })

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(finishAutoRecharge).toHaveBeenCalledWith('user-1', {
      success: false,
      disable: true,
      failureReason: 'card_declined',
    })
    expect(addPurchasedCredits).not.toHaveBeenCalled()
  })
})

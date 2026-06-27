import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'

// ── Mock the Stripe charge primitive + config probe (stripeCredits) ──────────
const chargeAutoRechargeOffSession = vi.fn()
const isStripeCreditsConfigured = vi.fn()
vi.mock('./stripeCredits', () => ({
  chargeAutoRechargeOffSession: (...args: unknown[]) => chargeAutoRechargeOffSession(...args),
  isStripeCreditsConfigured: () => isStripeCreditsConfigured(),
}))

// ── Mock the credit data seam ────────────────────────────────────────────────
const beginAutoRecharge = vi.fn()
const finishAutoRecharge = vi.fn()
const getAccountByUserId = vi.fn()
vi.mock('../data/credits', () => ({
  creditsRepo: {
    beginAutoRecharge: (...args: unknown[]) => beginAutoRecharge(...args),
    finishAutoRecharge: (...args: unknown[]) => finishAutoRecharge(...args),
    getAccountByUserId: (...args: unknown[]) => getAccountByUserId(...args),
  },
}))

import {
  classifyChargeFailure,
  getAutoRechargeState,
  maybeTriggerAutoRecharge,
} from './autoRecharge'

const USER = 'user-1'

/** A claimed account row (begin succeeded) with a saved card + chosen pack. */
function claimedAccount(overrides: Record<string, unknown> = {}) {
  return {
    user_id: USER,
    stripe_customer_id: 'cus_123',
    default_payment_method_id: 'pm_123',
    auto_recharge_pack_id: 'pack_1000',
    auto_recharge_in_flight_at: '2026-06-26T12:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  isStripeCreditsConfigured.mockReturnValue(true)
  finishAutoRecharge.mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('maybeTriggerAutoRecharge — eligibility gate', () => {
  it('no-ops when Stripe is not configured (never touches the DB)', async () => {
    isStripeCreditsConfigured.mockReturnValue(false)
    await maybeTriggerAutoRecharge(USER)
    expect(beginAutoRecharge).not.toHaveBeenCalled()
    expect(chargeAutoRechargeOffSession).not.toHaveBeenCalled()
  })

  it('does not charge when the user is not eligible (begin returns null)', async () => {
    beginAutoRecharge.mockResolvedValue(null)
    await maybeTriggerAutoRecharge(USER)
    expect(chargeAutoRechargeOffSession).not.toHaveBeenCalled()
    expect(finishAutoRecharge).not.toHaveBeenCalled()
  })

  it('passes the cap/period/cooldown/stale knobs through to begin', async () => {
    beginAutoRecharge.mockResolvedValue(null)
    await maybeTriggerAutoRecharge(USER)
    expect(beginAutoRecharge).toHaveBeenCalledTimes(1)
    const [userId, opts] = beginAutoRecharge.mock.calls[0]
    expect(userId).toBe(USER)
    expect(opts).toMatchObject({
      maxPerPeriod: expect.any(Number),
      period: expect.any(String),
      cooldown: expect.any(String),
      stale: expect.any(String),
    })
  })
})

describe('maybeTriggerAutoRecharge — charge outcomes', () => {
  it('charges with a deterministic idempotency key and finishes success on PI succeeded', async () => {
    beginAutoRecharge.mockResolvedValue(claimedAccount())
    chargeAutoRechargeOffSession.mockResolvedValue({ id: 'pi_1', status: 'succeeded' })

    await maybeTriggerAutoRecharge(USER)

    expect(chargeAutoRechargeOffSession).toHaveBeenCalledTimes(1)
    const args = chargeAutoRechargeOffSession.mock.calls[0][0]
    expect(args.customerId).toBe('cus_123')
    expect(args.paymentMethodId).toBe('pm_123')
    expect(args.pack.id).toBe('pack_1000')
    // Deterministic key bound to the claimed in-flight stamp.
    expect(args.idempotencyKey).toBe('auto_recharge:user-1:pack_1000:2026-06-26T12:00:00.000Z')

    // Grant happens in the webhook; here we only release + start cooldown.
    expect(finishAutoRecharge).toHaveBeenCalledWith(USER, { success: true })
  })

  it('disables + flags needs-attention on a hard decline (card_declined)', async () => {
    beginAutoRecharge.mockResolvedValue(claimedAccount())
    const declined = new Stripe.errors.StripeCardError({
      type: 'card_error',
      code: 'card_declined',
      message: 'Your card was declined.',
    } as never)
    chargeAutoRechargeOffSession.mockRejectedValue(declined)

    await maybeTriggerAutoRecharge(USER)

    expect(finishAutoRecharge).toHaveBeenCalledWith(USER, {
      success: false,
      disable: true,
      failureReason: 'card_declined',
    })
  })

  it('disables on SCA / requires_action returned without throwing', async () => {
    beginAutoRecharge.mockResolvedValue(claimedAccount())
    chargeAutoRechargeOffSession.mockResolvedValue({ id: 'pi_2', status: 'requires_action' })

    await maybeTriggerAutoRecharge(USER)

    expect(finishAutoRecharge).toHaveBeenCalledWith(USER, {
      success: false,
      disable: true,
      failureReason: 'requires_action',
    })
  })

  it('keeps auto-recharge enabled (retryable) on a transient/unknown error', async () => {
    beginAutoRecharge.mockResolvedValue(claimedAccount())
    chargeAutoRechargeOffSession.mockRejectedValue(new Error('network blip'))

    await maybeTriggerAutoRecharge(USER)

    expect(finishAutoRecharge).toHaveBeenCalledWith(USER, {
      success: false,
      disable: false,
      failureReason: null,
    })
  })

  it('never charges (defensively) when the claimed row lacks a payment method', async () => {
    beginAutoRecharge.mockResolvedValue(
      claimedAccount({ default_payment_method_id: null }),
    )
    await maybeTriggerAutoRecharge(USER)
    expect(chargeAutoRechargeOffSession).not.toHaveBeenCalled()
    expect(finishAutoRecharge).toHaveBeenCalledWith(USER, {
      success: false,
      disable: true,
      failureReason: 'no_payment_method',
    })
  })
})

describe('classifyChargeFailure', () => {
  it('treats known hard decline codes as disable + reason', () => {
    const err = new Stripe.errors.StripeCardError({
      type: 'card_error',
      code: 'authentication_required',
      message: 'auth required',
    } as never)
    expect(classifyChargeFailure(err)).toEqual({ disable: true, reason: 'authentication_required' })
  })

  it('treats a plain Error as transient (no disable)', () => {
    expect(classifyChargeFailure(new Error('boom'))).toEqual({ disable: false, reason: null })
  })
})

describe('getAutoRechargeState', () => {
  it('maps the account row into the UI state shape', async () => {
    getAccountByUserId.mockResolvedValue({
      auto_recharge_enabled: true,
      auto_recharge_threshold: 150,
      auto_recharge_pack_id: 'pack_500',
      auto_recharge_amount: 500,
      default_payment_method_id: 'pm_9',
      auto_recharge_status: 'active',
      auto_recharge_failure_reason: null,
      auto_recharge_last_at: '2026-06-20T00:00:00.000Z',
    })

    const state = await getAutoRechargeState(USER)
    expect(state).toEqual({
      enabled: true,
      threshold: 150,
      packId: 'pack_500',
      amount: 500,
      hasPaymentMethod: true,
      status: 'active',
      failureReason: null,
      lastRechargeAt: '2026-06-20T00:00:00.000Z',
    })
  })

  it('returns safe defaults when no account exists', async () => {
    getAccountByUserId.mockResolvedValue(null)
    const state = await getAutoRechargeState(USER)
    expect(state).toMatchObject({ enabled: false, threshold: 100, hasPaymentMethod: false })
  })
})

/**
 * Webhook orchestration tests for the referral conversion reward and the
 * buy-a-gift voucher mint. Covers:
 *  - the $0 trial-start invoice is excluded (no period grant, no referral reward)
 *  - a real paid invoice grants the period AND rewards the referrer exactly once
 *  - a gift-voucher checkout mints exactly one voucher
 *
 * The exactly-once / idempotency guarantees themselves live in SQL (status guard
 * + unique session id); these tests assert the JS webhook wires them correctly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const constructEvent = vi.fn()
const subscriptionsRetrieve = vi.fn()

vi.mock('stripe', () => ({
  default: class FakeStripe {
    checkout = { sessions: { create: vi.fn() } }
    webhooks = { constructEvent }
    subscriptions = { retrieve: subscriptionsRetrieve }
  },
}))

const grantSubscriptionPeriod = vi.fn()
const applySubscription = vi.fn()
const getUserIdByStripeCustomerId = vi.fn()
const getAccountByUserId = vi.fn()
vi.mock('../data/credits', () => ({
  creditsRepo: {
    grantSubscriptionPeriod: (...a: unknown[]) => grantSubscriptionPeriod(...a),
    applySubscription: (...a: unknown[]) => applySubscription(...a),
    getUserIdByStripeCustomerId: (...a: unknown[]) => getUserIdByStripeCustomerId(...a),
    getAccountByUserId: (...a: unknown[]) => getAccountByUserId(...a),
  },
}))

const addPurchasedCredits = vi.fn()
vi.mock('../ai/creditGuard', () => ({ addPurchasedCredits: (...a: unknown[]) => addPurchasedCredits(...a) }))

const claimEventMarker = vi.fn()
const releaseEventMarker = vi.fn()
vi.mock('../data/appSettings', () => ({
  claimEventMarker: (...a: unknown[]) => claimEventMarker(...a),
  releaseEventMarker: (...a: unknown[]) => releaseEventMarker(...a),
}))

const createVoucherFromPurchase = vi.fn()
vi.mock('../data/vouchers', () => ({
  voucherRepo: { createVoucherFromPurchase: (...a: unknown[]) => createVoucherFromPurchase(...a) },
}))

const rewardReferrerForConversion = vi.fn()
vi.mock('./referralService', () => ({
  rewardReferrerForConversion: (...a: unknown[]) => rewardReferrerForConversion(...a),
  REFERRAL_REWARD_CREDITS: 250,
}))

import { handleStripeWebhook } from './stripeCredits'

function invoicePaidEvent(amountPaid: number) {
  return {
    id: `evt_${amountPaid}`,
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_1',
        amount_paid: amountPaid,
        customer: 'cus_1',
        parent: { subscription_details: { subscription: 'sub_1', metadata: { userId: 'invitee-1' } } },
      },
    },
  }
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy'
  vi.clearAllMocks()
  claimEventMarker.mockResolvedValue(true)
  releaseEventMarker.mockResolvedValue(undefined)
  rewardReferrerForConversion.mockResolvedValue({ ok: true, granted: true })
  grantSubscriptionPeriod.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET
})

describe('handleStripeWebhook — invoice.paid referral reward', () => {
  it('excludes the $0 trial-start invoice: no period grant, no referral reward', async () => {
    constructEvent.mockReturnValue(invoicePaidEvent(0))

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(grantSubscriptionPeriod).not.toHaveBeenCalled()
    expect(rewardReferrerForConversion).not.toHaveBeenCalled()
  })

  it('rewards the referrer exactly once on a real paid invoice', async () => {
    constructEvent.mockReturnValue(invoicePaidEvent(2499))

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(grantSubscriptionPeriod).toHaveBeenCalledOnce()
    expect(rewardReferrerForConversion).toHaveBeenCalledOnce()
    expect(rewardReferrerForConversion).toHaveBeenCalledWith('invitee-1')
  })

  it('does not fail the webhook when the referral reward throws (period already granted)', async () => {
    constructEvent.mockReturnValue(invoicePaidEvent(2499))
    rewardReferrerForConversion.mockRejectedValue(new Error('reward boom'))

    await expect(handleStripeWebhook(Buffer.from('{}'), 'sig')).resolves.toEqual({ received: true })
    expect(grantSubscriptionPeriod).toHaveBeenCalledOnce()
    // The marker is NOT released (the event succeeded overall), so Stripe won't retry.
    expect(releaseEventMarker).not.toHaveBeenCalled()
  })
})

describe('handleStripeWebhook — gift voucher mint', () => {
  it('mints exactly one voucher for a paid gift checkout', async () => {
    createVoucherFromPurchase.mockResolvedValue({ ok: true, code: 'GIFT-AAAA-BBBB' })
    constructEvent.mockReturnValue({
      id: 'evt_gift',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_gift_1',
          mode: 'payment',
          payment_status: 'paid',
          client_reference_id: 'buyer-1',
          metadata: { kind: 'gift_voucher', userId: 'buyer-1', giftPackId: 'gift_500x6' },
        },
      },
    })

    await handleStripeWebhook(Buffer.from('{}'), 'sig')

    expect(createVoucherFromPurchase).toHaveBeenCalledOnce()
    const arg = createVoucherFromPurchase.mock.calls[0][0]
    expect(arg.sessionId).toBe('cs_gift_1')
    expect(arg.buyerUserId).toBe('buyer-1')
    expect(arg.creditsPerPeriod).toBe(500)
    expect(arg.totalPeriods).toBe(6)
    // A non-gift credit grant must NOT run for a gift checkout.
    expect(addPurchasedCredits).not.toHaveBeenCalled()
  })
})

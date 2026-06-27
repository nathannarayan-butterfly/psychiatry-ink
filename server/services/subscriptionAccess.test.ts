import { describe, expect, it } from 'vitest'
import {
  AccessLockedError,
  computeAccess,
  type AccountAccessFields,
} from './subscriptionAccess'
import { InsufficientCreditsError } from '../ai/creditGuard'

const NOW = new Date('2026-06-25T12:00:00.000Z')

function account(overrides: Partial<AccountAccessFields>): AccountAccessFields {
  return {
    trial_ends_at: null,
    subscription_status: null,
    subscription_plan: null,
    subscription_interval: null,
    purchased_credits: 0,
    ...overrides,
  }
}

describe('computeAccess', () => {
  it('grants access when no account exists yet', () => {
    const r = computeAccess(null, NOW)
    expect(r.access).toBe(true)
    expect(r.locked).toBe(false)
    expect(r.reason).toBe('no_account')
  })

  it('grants access to an active subscription even past the trial', () => {
    const r = computeAccess(
      account({
        trial_ends_at: '2026-01-01T00:00:00.000Z',
        subscription_status: 'active',
        subscription_plan: 'single_user',
        subscription_interval: 'month',
      }),
      NOW,
    )
    expect(r.access).toBe(true)
    expect(r.locked).toBe(false)
    expect(r.reason).toBe('subscription_active')
    expect(r.plan).toBe('single_user')
    expect(r.interval).toBe('month')
  })

  it('treats a Stripe trialing subscription as active', () => {
    const r = computeAccess(account({ subscription_status: 'trialing' }), NOW)
    expect(r.access).toBe(true)
    expect(r.reason).toBe('subscription_active')
  })

  it('grants access during an active trial and reports days remaining', () => {
    const r = computeAccess(
      account({ trial_ends_at: '2026-06-30T12:00:00.000Z' }),
      NOW,
    )
    expect(r.access).toBe(true)
    expect(r.reason).toBe('trial_active')
    expect(r.daysRemaining).toBe(5)
  })

  it('BLOCKS a lapsed trial with banked purchased credits but no subscription (enforcement ON)', () => {
    const r = computeAccess(
      account({ trial_ends_at: '2026-06-01T00:00:00.000Z', purchased_credits: 120 }),
      NOW,
      { requireSubscriptionForCredits: true },
    )
    // Banked credits no longer unlock spending — the user must subscribe. The
    // distinct reason drives a "subscribe to use your credits" prompt.
    expect(r.access).toBe(false)
    expect(r.locked).toBe(true)
    expect(r.reason).toBe('subscription_required')
  })

  it('restores the legacy purchased-credits grant when enforcement is OFF', () => {
    const r = computeAccess(
      account({ trial_ends_at: '2026-06-01T00:00:00.000Z', purchased_credits: 120 }),
      NOW,
      { requireSubscriptionForCredits: false },
    )
    expect(r.access).toBe(true)
    expect(r.locked).toBe(false)
    expect(r.reason).toBe('purchased_credits')
  })

  it('still grants access to an active subscriber holding purchased credits', () => {
    const r = computeAccess(
      account({ subscription_status: 'active', purchased_credits: 120 }),
      NOW,
      { requireSubscriptionForCredits: true },
    )
    expect(r.access).toBe(true)
    expect(r.reason).toBe('subscription_active')
  })

  it('still grants access to a trial user holding purchased credits', () => {
    const r = computeAccess(
      account({ trial_ends_at: '2026-06-30T12:00:00.000Z', purchased_credits: 120 }),
      NOW,
      { requireSubscriptionForCredits: true },
    )
    expect(r.access).toBe(true)
    expect(r.reason).toBe('trial_active')
  })

  it('keeps access for legacy accounts that never started a trial', () => {
    const r = computeAccess(account({ trial_ends_at: null }), NOW)
    expect(r.access).toBe(true)
    expect(r.locked).toBe(false)
    expect(r.reason).toBe('trial_not_started')
  })

  it('soft-locks a lapsed trial with no subscription and no purchased credits', () => {
    const r = computeAccess(
      account({
        trial_ends_at: '2026-06-01T00:00:00.000Z',
        subscription_status: 'canceled',
        purchased_credits: 0,
      }),
      NOW,
    )
    expect(r.access).toBe(false)
    expect(r.locked).toBe(true)
    expect(r.reason).toBe('locked_trial_expired')
    expect(r.daysRemaining).toBeNull()
  })

  it('soft-locks a past_due subscription with a lapsed trial', () => {
    const r = computeAccess(
      account({ trial_ends_at: '2026-06-01T00:00:00.000Z', subscription_status: 'past_due' }),
      NOW,
    )
    expect(r.access).toBe(false)
    expect(r.reason).toBe('locked_trial_expired')
  })
})

describe('AccessLockedError', () => {
  it('is an InsufficientCreditsError so existing 402 handlers catch it', () => {
    const err = new AccessLockedError('locked_trial_expired')
    expect(err).toBeInstanceOf(InsufficientCreditsError)
    expect(err.code).toBe('subscription_required')
    expect(err.reason).toBe('locked_trial_expired')
    expect(err.message).toMatch(/trial has ended/i)
  })

  it('uses a credits-specific message for the subscription_required reason', () => {
    const err = new AccessLockedError('subscription_required')
    expect(err.code).toBe('subscription_required')
    expect(err.reason).toBe('subscription_required')
    expect(err.message).toMatch(/active subscription is required to use your credits/i)
  })
})

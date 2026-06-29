/**
 * Auto-recharge "needs attention" banner gating (item 18).
 *
 * The warning must appear ONLY after a genuine failed recharge attempt — a
 * `needs_attention` status WITH a concrete `failureReason`. It must never fire
 * on a fresh/healthy account, when auto-recharge is off, or on a stale/defaulted
 * status with no recorded failure.
 */

import { describe, expect, it } from 'vitest'
import { autoRechargeNeedsAttention, type AutoRechargeState } from '../aiCreditsApi'

function state(overrides: Partial<AutoRechargeState>): AutoRechargeState {
  return {
    enabled: false,
    threshold: 100,
    packId: null,
    amount: null,
    hasPaymentMethod: false,
    status: null,
    failureReason: null,
    lastRechargeAt: null,
    ...overrides,
  }
}

describe('autoRechargeNeedsAttention', () => {
  it('does not warn for undefined/null state', () => {
    expect(autoRechargeNeedsAttention(undefined)).toBe(false)
    expect(autoRechargeNeedsAttention(null)).toBe(false)
  })

  it('does not warn for a fresh/healthy account (no attempt made)', () => {
    expect(autoRechargeNeedsAttention(state({ status: null, failureReason: null }))).toBe(false)
    expect(autoRechargeNeedsAttention(state({ status: 'active', failureReason: null }))).toBe(false)
  })

  it('does not warn when status is needs_attention but there is no real failure reason', () => {
    // The bug: a stale/defaulted "needs_attention" status with no recorded
    // failed attempt previously showed the banner on every load.
    expect(autoRechargeNeedsAttention(state({ status: 'needs_attention', failureReason: null }))).toBe(false)
    expect(autoRechargeNeedsAttention(state({ status: 'needs_attention', failureReason: '   ' }))).toBe(false)
  })

  it('warns only after a genuine failed recharge attempt', () => {
    expect(
      autoRechargeNeedsAttention(
        state({ status: 'needs_attention', failureReason: 'card_declined' }),
      ),
    ).toBe(true)
  })

  it('does not warn once the failure is cleared (e.g. new card saved)', () => {
    expect(
      autoRechargeNeedsAttention(
        state({ enabled: true, status: 'active', failureReason: null, hasPaymentMethod: true }),
      ),
    ).toBe(false)
  })
})

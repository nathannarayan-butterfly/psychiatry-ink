/**
 * Pricing-constant reconciliation tests.
 *
 * Locks in the reconciliation of the previously-contradictory per-credit
 * monetary constants to the realized Stripe pack pricing (the single source of
 * truth in src/data/creditPacks.ts). These constants are display/estimation
 * only — the credit-deduction billing path uses base credits × mode multiplier
 * (creditCalculator.ts) and never converts credits to money — so these tests
 * guard against a regression back to the nonsensical nominal rates (which made
 * every margin estimate deeply negative), NOT against any charged amount.
 */

import { describe, expect, it } from 'vitest'
import {
  CREDIT_PACKS,
  REALIZED_CREDIT_VALUE_GBP,
  REALIZED_CREDIT_VALUE_EUR,
  REALIZED_CREDIT_VALUE_USD,
  realizedCreditValueGbp,
} from '../../../src/data/creditPacks'
import { CREDITS_PER_EUR } from '../../../src/data/creditPricing'
import { CREDIT_TO_USD_RATE, MONTHLY_CREDIT_GRANT, MODE_MULTIPLIERS } from '../aiPricingConfig'
import { PRO_MONTHLY_CREDITS } from '../../../src/data/subscriptionPlans'
import { estimateCredits } from '../creditCalculator'

describe('realized per-credit retail value (single source of truth)', () => {
  it('anchors to the popular pack (£29.99 / 1,000 = £0.030/credit)', () => {
    const popular = CREDIT_PACKS.find((pack) => pack.popular)
    expect(popular).toBeDefined()
    expect(realizedCreditValueGbp()).toBeCloseTo(
      (popular!.priceGbpPence / 100) / popular!.credits,
      6,
    )
    // £29.99 / 1,000 credits = £0.02999 ≈ £0.030
    expect(REALIZED_CREDIT_VALUE_GBP).toBeGreaterThan(0.028)
    expect(REALIZED_CREDIT_VALUE_GBP).toBeLessThan(0.032)
  })

  it('expresses ≈ €0.035/credit (the cost-analysis realized rate)', () => {
    expect(REALIZED_CREDIT_VALUE_EUR).toBeGreaterThan(0.032)
    expect(REALIZED_CREDIT_VALUE_EUR).toBeLessThan(0.04)
  })

  it('expresses ≈ $0.038/credit', () => {
    expect(REALIZED_CREDIT_VALUE_USD).toBeGreaterThan(0.034)
    expect(REALIZED_CREDIT_VALUE_USD).toBeLessThan(0.042)
  })
})

describe('reconciled money↔credit constants', () => {
  it('CREDIT_TO_USD_RATE tracks the realized USD value and is no longer the nominal 0.001', () => {
    expect(CREDIT_TO_USD_RATE).toBe(REALIZED_CREDIT_VALUE_USD)
    // Must be FAR above the retired nominal $0.001/credit landmine.
    expect(CREDIT_TO_USD_RATE).toBeGreaterThan(0.01)
    expect(CREDIT_TO_USD_RATE).not.toBe(0.001)
  })

  it('CREDITS_PER_EUR is derived from the realized EUR value (≈ 28.6/EUR), not the nominal 100', () => {
    expect(CREDITS_PER_EUR).toBeCloseTo(1 / REALIZED_CREDIT_VALUE_EUR, 6)
    expect(CREDITS_PER_EUR).toBeGreaterThan(24)
    expect(CREDITS_PER_EUR).toBeLessThan(34)
    expect(CREDITS_PER_EUR).not.toBe(100)
  })
})

describe('subscription plan matches the live grant', () => {
  it('PRO_MONTHLY_CREDITS equals the server MONTHLY_CREDIT_GRANT (500)', () => {
    expect(PRO_MONTHLY_CREDITS).toBe(MONTHLY_CREDIT_GRANT)
    expect(PRO_MONTHLY_CREDITS).toBe(500)
  })
})

describe('credit-deduction multipliers are unchanged (no repricing)', () => {
  it('keeps economic 1× / standard 2× / gründlich 4×', () => {
    expect(MODE_MULTIPLIERS.economic).toBe(1)
    expect(MODE_MULTIPLIERS.standard).toBe(2)
    expect(MODE_MULTIPLIERS.gruendlich).toBe(4)
  })

  it('bills gründlich at exactly 4× the economic base for the same feature/tokens', () => {
    const tokens = 1000
    const economic = estimateCredits('document_generation', 'economic', tokens)
    const gruendlich = estimateCredits('document_generation', 'gruendlich', tokens)
    // document_generation baseCredits=4, maxIncludedTokens=6000 → no overflow at 1k tokens.
    expect(economic).toBe(4)
    expect(gruendlich).toBe(16)
    expect(gruendlich).toBe(economic * 4)
  })
})

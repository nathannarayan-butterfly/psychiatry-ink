import { describe, expect, it } from 'vitest'
import { addMonths, computeDuePeriodIndices } from './voucherSchedule'

const REDEEMED_AT = '2026-01-15T10:00:00.000Z'

describe('voucherSchedule.computeDuePeriodIndices', () => {
  it('grants only period 0 immediately at redemption', () => {
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 0, totalPeriods: 6, periodMonths: 1 },
      new Date(REDEEMED_AT),
    )
    expect(due).toEqual([0])
  })

  it('is idempotent: after period 0 is granted, nothing is due until the next month', () => {
    // Same instant, cursor advanced to 1 → no further periods due yet.
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 1, totalPeriods: 6, periodMonths: 1 },
      new Date(REDEEMED_AT),
    )
    expect(due).toEqual([])
  })

  it('grants the next monthly period once its boundary passes', () => {
    const oneMonthLater = new Date(addMonths(Date.parse(REDEEMED_AT), 1))
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 1, totalPeriods: 6, periodMonths: 1 },
      oneMonthLater,
    )
    expect(due).toEqual([1])
  })

  it('catches up multiple missed periods in one claim (e.g. after inactivity)', () => {
    // 3 months and a day after redemption, nothing granted yet → periods 0,1,2,3.
    const later = new Date(addMonths(Date.parse(REDEEMED_AT), 3) + 86_400_000)
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 0, totalPeriods: 6, periodMonths: 1 },
      later,
    )
    expect(due).toEqual([0, 1, 2, 3])
  })

  it('never exceeds totalPeriods (the entitlement cap)', () => {
    const farFuture = new Date(addMonths(Date.parse(REDEEMED_AT), 24))
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 0, totalPeriods: 6, periodMonths: 1 },
      farFuture,
    )
    expect(due).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('returns nothing once the cursor is exhausted', () => {
    const farFuture = new Date(addMonths(Date.parse(REDEEMED_AT), 24))
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 6, totalPeriods: 6, periodMonths: 1 },
      farFuture,
    )
    expect(due).toEqual([])
  })

  it('honours a multi-month cadence', () => {
    // Quarterly (period_months = 3): at ~3 months only period 1 becomes due.
    const later = new Date(addMonths(Date.parse(REDEEMED_AT), 3) + 86_400_000)
    const due = computeDuePeriodIndices(
      { redeemedAt: REDEEMED_AT, periodsGranted: 1, totalPeriods: 4, periodMonths: 3 },
      later,
    )
    expect(due).toEqual([1])
  })

  it('guards against bad input', () => {
    expect(computeDuePeriodIndices({ redeemedAt: 'nope', periodsGranted: 0, totalPeriods: 6, periodMonths: 1 })).toEqual([])
    expect(
      computeDuePeriodIndices({ redeemedAt: REDEEMED_AT, periodsGranted: 0, totalPeriods: 0, periodMonths: 1 }),
    ).toEqual([])
  })
})

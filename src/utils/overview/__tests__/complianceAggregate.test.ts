import { beforeEach, describe, expect, it } from 'vitest'
import {
  averageAggregateStatus,
  loadComplianceAggregateOverrides,
  percentToAggregateStatus,
  resolveItemAggregateStatus,
  setComplianceAggregateOverride,
  type ComplianceAggregateOverride,
} from '../complianceAggregate'

const CASE_ID = 'case-aggregate-test'

describe('complianceAggregate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('maps percent thresholds to yes / partial / no', () => {
    expect(percentToAggregateStatus(100)).toBe('yes')
    expect(percentToAggregateStatus(80)).toBe('yes')
    expect(percentToAggregateStatus(79)).toBe('partial')
    expect(percentToAggregateStatus(50)).toBe('partial')
    expect(percentToAggregateStatus(49)).toBe('no')
    expect(percentToAggregateStatus(0)).toBe('no')
    expect(percentToAggregateStatus(null)).toBeNull()
  })

  it('persists aggregate overrides per case', () => {
    setComplianceAggregateOverride('med-1', 'yes', CASE_ID)
    setComplianceAggregateOverride('therapy-1', 'partial', CASE_ID)

    expect(loadComplianceAggregateOverrides(CASE_ID)).toEqual([
      expect.objectContaining({ itemKey: 'med-1', status: 'yes' }),
      expect.objectContaining({ itemKey: 'therapy-1', status: 'partial' }),
    ])
  })

  it('prefers manual override over derived percent', () => {
    const overrides: ComplianceAggregateOverride[] = [
      { itemKey: 'med-1', status: 'no', updatedAt: '2026-06-19T12:00:00.000Z' },
    ]

    expect(resolveItemAggregateStatus('med-1', 95, overrides)).toEqual({
      status: 'no',
      overridden: true,
    })
    expect(resolveItemAggregateStatus('med-2', 95, overrides)).toEqual({
      status: 'yes',
      overridden: false,
    })
  })

  it('averages aggregate statuses for an overall badge', () => {
    expect(averageAggregateStatus(['yes', 'yes'])).toBe('yes')
    expect(averageAggregateStatus(['yes', 'no'])).toBe('partial')
    expect(averageAggregateStatus(['no', 'no'])).toBe('no')
    expect(averageAggregateStatus([null, null])).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildAdaptiveVisitActionBlocks,
  flattenOverviewQuickActionItems,
} from '../overviewQuickActions'

describe('buildAdaptiveVisitActionBlocks', () => {
  const emptyContext = {
    abnormalLabCount: 0,
    safetyAlertCount: 0,
    daysSinceLastContact: null as number | null,
  }

  it('exposes eleven core menu items without urgent context', () => {
    const items = flattenOverviewQuickActionItems(buildAdaptiveVisitActionBlocks(emptyContext))
    expect(items.map((item) => item.id)).toEqual([
      'newVerlaufNote',
      'dictateVisitNote',
      'psychopathFinding',
      'riskUpdate',
      'medicationChange',
      'sideEffectEntry',
      'labRequest',
      'consultRequest',
      'addTodo',
    ])
  })

  it('promotes at most two urgent items and omits them from groups', () => {
    const blocks = buildAdaptiveVisitActionBlocks({
      abnormalLabCount: 2,
      safetyAlertCount: 1,
      daysSinceLastContact: 14,
    })
    const items = flattenOverviewQuickActionItems(blocks)
    expect(items.slice(0, 2).map((item) => item.id)).toEqual([
      'reviewSafetyAlert',
      'reviewAbnormalLabs',
    ])
    expect(items.filter((item) => item.id === 'newVerlaufNote')).toHaveLength(1)
    expect(items.filter((item) => item.id === 'reviewAbnormalLabs')).toHaveLength(1)
    expect(items.filter((item) => item.id === 'reviewSafetyAlert')).toHaveLength(1)
  })

  it('shows review section only when labs or safety alerts are present', () => {
    const withLabs = buildAdaptiveVisitActionBlocks({
      ...emptyContext,
      abnormalLabCount: 1,
    })
    expect(flattenOverviewQuickActionItems(withLabs).some((item) => item.id === 'reviewAbnormalLabs')).toBe(
      true,
    )

    const withSafety = buildAdaptiveVisitActionBlocks({
      ...emptyContext,
      safetyAlertCount: 1,
    })
    expect(
      flattenOverviewQuickActionItems(withSafety).some((item) => item.id === 'reviewSafetyAlert'),
    ).toBe(true)

    expect(
      flattenOverviewQuickActionItems(buildAdaptiveVisitActionBlocks(emptyContext)).some((item) =>
        item.id.startsWith('review'),
      ),
    ).toBe(false)
  })
})

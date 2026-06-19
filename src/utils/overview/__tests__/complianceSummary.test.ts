import { beforeEach, describe, expect, it } from 'vitest'
import type { MedicationEntry } from '../../../types/medicationPlan'
import {
  buildComplianceDayWindow,
  buildMedicationItems,
  computeCompliancePercent,
  mergeComplianceDayStatus,
  normalizeComplianceText,
  toDateKey,
  type ComplianceItemTimeline,
} from '../complianceSummary'
import {
  applyComplianceOverrides,
  loadComplianceOverrides,
  removeComplianceOverride,
  setComplianceOverride,
  type ComplianceOverride,
} from '../complianceOverrides'

function makeMedication(overrides: Partial<MedicationEntry>): MedicationEntry {
  return {
    id: overrides.id ?? 'med-1',
    substance: 'Aripiprazol',
    formulation: 'tablet',
    strength: '10 mg',
    doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'mg' },
    doseLineGerman: 'Aripiprazol 10 mg 1-0-0-0',
    prn: false,
    startDate: '2026-01-01',
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-01-01',
    lastChangeAt: '2026-01-01',
    lastChangeType: 'start',
    history: [],
    ...overrides,
  } as MedicationEntry
}

describe('complianceSummary helpers', () => {
  const now = new Date(2026, 5, 19, 12, 0, 0)

  it('builds a 14-day window ending on the anchor day', () => {
    const days = buildComplianceDayWindow(now, 14)

    expect(days).toHaveLength(14)
    expect(days[0]?.dateIso).toBe('2026-06-06')
    expect(days[13]?.dateIso).toBe('2026-06-19')
    expect(days.every((day) => day.status === 'unknown')).toBe(true)
  })

  it('merges day status with refusal taking precedence', () => {
    expect(mergeComplianceDayStatus('participated', 'refused')).toBe('refused')
    expect(mergeComplianceDayStatus('excused', 'participated')).toBe('excused')
    expect(mergeComplianceDayStatus('unknown', 'participated')).toBe('participated')
  })

  it('computes percent from participations over participations + refusals', () => {
    const days = buildComplianceDayWindow(now, 14).map((day, index) => ({
      ...day,
      status:
        index === 0
          ? ('participated' as const)
          : index === 1
            ? ('participated' as const)
            : index === 2
              ? ('refused' as const)
              : index === 3
                ? ('excused' as const)
                : ('unknown' as const),
    }))

    expect(computeCompliancePercent(days)).toEqual({
      percent: 67,
      documentedDays: 4,
    })
  })

  it('returns null percent when only excused or unknown days exist', () => {
    const days = buildComplianceDayWindow(now, 14).map((day, index) => ({
      ...day,
      status: index === 0 ? ('excused' as const) : ('unknown' as const),
    }))

    expect(computeCompliancePercent(days)).toEqual({
      percent: null,
      documentedDays: 1,
    })
  })

  it('normalizes timestamps to local calendar keys', () => {
    const local = new Date(2026, 5, 10, 9, 0, 0)
    expect(toDateKey(local)).toBe('2026-06-10')
  })
})

describe('normalizeComplianceText', () => {
  it('lowercases and strips accents and punctuation', () => {
    expect(normalizeComplianceText('Lorazepam (Tavor®), 1 mg')).toBe('lorazepam tavor 1 mg')
    expect(normalizeComplianceText('Quetiapin-retard')).toBe('quetiapin-retard')
  })
})

function makeItemTimeline(
  key: string,
  statuses: Array<'participated' | 'refused' | 'excused' | 'unknown'>,
): ComplianceItemTimeline {
  const now = new Date(2026, 5, 19, 12, 0, 0)
  const days = buildComplianceDayWindow(now, 14).map((day, index) => ({
    ...day,
    status: statuses[index] ?? ('unknown' as const),
  }))
  const { percent, documentedDays } = computeCompliancePercent(days)
  return {
    key,
    label: key,
    sublabel: null,
    timeline: { days, percent, documentedDays, windowDays: 14 },
  }
}

describe('applyComplianceOverrides', () => {
  // window: 2026-06-06 … 2026-06-19 (index 0 … 13)
  it('returns the same items reference when there are no overrides', () => {
    const items = [makeItemTimeline('med-1', ['participated', 'refused'])]
    expect(applyComplianceOverrides(items, [])).toBe(items)
  })

  it('replaces the derived status for the matched day and item', () => {
    const items = [makeItemTimeline('med-1', ['refused'])]
    const overrides: ComplianceOverride[] = [
      { itemKey: 'med-1', dateIso: '2026-06-06', status: 'participated', updatedAt: 'x' },
    ]

    const [result] = applyComplianceOverrides(items, overrides)
    const cell = result.timeline.days.find((day) => day.dateIso === '2026-06-06')
    expect(cell?.status).toBe('participated')
    expect(cell?.overridden).toBe(true)
  })

  it('recomputes the percent after an override flips a day', () => {
    // derived: one participated + one refused → 50%
    const items = [makeItemTimeline('med-1', ['participated', 'refused'])]
    expect(items[0].timeline.percent).toBe(50)

    // override the refused day to participated → 100%
    const [result] = applyComplianceOverrides(items, [
      { itemKey: 'med-1', dateIso: '2026-06-07', status: 'participated', updatedAt: 'x' },
    ])
    expect(result.timeline.percent).toBe(100)
    expect(result.timeline.documentedDays).toBe(2)
  })

  it('lets an override to "unknown" drop a day out of the scored percent', () => {
    const items = [makeItemTimeline('med-1', ['participated', 'refused'])]
    const [result] = applyComplianceOverrides(items, [
      { itemKey: 'med-1', dateIso: '2026-06-07', status: 'unknown', updatedAt: 'x' },
    ])
    // only the participated day remains scored → 100%
    expect(result.timeline.percent).toBe(100)
    expect(result.timeline.documentedDays).toBe(1)
  })

  it('only applies an override to its matching item key', () => {
    const items = [
      makeItemTimeline('med-1', ['refused']),
      makeItemTimeline('med-2', ['refused']),
    ]
    const result = applyComplianceOverrides(items, [
      { itemKey: 'med-1', dateIso: '2026-06-06', status: 'participated', updatedAt: 'x' },
    ])

    expect(result[0].timeline.days[0].status).toBe('participated')
    expect(result[1].timeline.days[0].status).toBe('refused')
    // untouched item keeps its original reference
    expect(result[1]).toBe(items[1])
  })

  it('ignores overrides for days outside the window', () => {
    const items = [makeItemTimeline('med-1', ['participated'])]
    const result = applyComplianceOverrides(items, [
      { itemKey: 'med-1', dateIso: '2000-01-01', status: 'refused', updatedAt: 'x' },
    ])
    expect(result[0]).toBe(items[0])
  })
})

describe('compliance override persistence', () => {
  const caseId = 'case-compliance-test'

  beforeEach(() => {
    localStorage.clear()
  })

  it('upserts an override (one entry per item + day)', () => {
    setComplianceOverride('med-1', '2026-06-10', 'participated', caseId)
    const afterSecond = setComplianceOverride('med-1', '2026-06-10', 'refused', caseId)

    expect(afterSecond).toHaveLength(1)
    expect(afterSecond[0].status).toBe('refused')
    expect(loadComplianceOverrides(caseId)).toHaveLength(1)
  })

  it('keeps overrides for distinct item/day pairs separate', () => {
    setComplianceOverride('med-1', '2026-06-10', 'participated', caseId)
    setComplianceOverride('med-1', '2026-06-11', 'refused', caseId)
    setComplianceOverride('med-2', '2026-06-10', 'excused', caseId)

    expect(loadComplianceOverrides(caseId)).toHaveLength(3)
  })

  it('removes an override and reverts to derived (empty list)', () => {
    setComplianceOverride('med-1', '2026-06-10', 'participated', caseId)
    const after = removeComplianceOverride('med-1', '2026-06-10', caseId)

    expect(after).toHaveLength(0)
    expect(loadComplianceOverrides(caseId)).toHaveLength(0)
  })

  it('scopes overrides per case', () => {
    setComplianceOverride('med-1', '2026-06-10', 'participated', caseId)
    expect(loadComplianceOverrides('other-case')).toHaveLength(0)
  })
})

describe('buildMedicationItems', () => {
  it('keeps one row per active medication and skips inactive/deleted entries', () => {
    const items = buildMedicationItems([
      makeMedication({ id: 'a', substance: 'Aripiprazol' }),
      makeMedication({ id: 'b', substance: 'Lorazepam', status: 'reduced' }),
      makeMedication({ id: 'c', substance: 'Sertralin', status: 'discontinued' }),
      makeMedication({ id: 'd', substance: 'Pipamperon', status: 'active', deletedAt: '2026-06-01' }),
    ])

    expect(items.map((item) => item.label)).toEqual(['Aripiprazol', 'Lorazepam'])
  })

  it('uses the dose line as the secondary label and derives matching aliases', () => {
    const [item] = buildMedicationItems([
      makeMedication({
        id: 'a',
        substance: 'Aripiprazol',
        displayBrandName: 'Abilify',
        doseLineGerman: 'Aripiprazol 10 mg 1-0-0-0',
      }),
    ])

    expect(item.label).toBe('Aripiprazol')
    expect(item.sublabel).toBe('Aripiprazol 10 mg 1-0-0-0')
    expect(item.aliases).toContain('aripiprazol')
    expect(item.aliases).toContain('abilify')
  })
})

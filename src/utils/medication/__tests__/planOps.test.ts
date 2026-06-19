import { describe, expect, it } from 'vitest'
import type { MedicationEntry } from '../../../types/medicationPlan'
import { activeMedications, isActiveMedication } from '../planOps'

function makeEntry(overrides: Partial<MedicationEntry> = {}): MedicationEntry {
  return {
    id: overrides.id ?? 'med-1',
    substance: overrides.substance ?? 'Quetiapin',
    formulation: 'tablet',
    strength: '100 mg',
    doseSchedule: { morning: '0', noon: '0', evening: '1', night: '0', unit: 'mg', prn: false },
    doseLineGerman: '100 mg abends',
    prn: false,
    startDate: '2026-01-01',
    status: 'active',
    indication: '',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-01-01T09:00:00.000Z',
    lastChangeAt: '2026-01-01T09:00:00.000Z',
    lastChangeType: 'start',
    history: [],
    ...overrides,
  }
}

describe('activeMedications', () => {
  it('includes active, reduced, and increased statuses', () => {
    const meds = [
      makeEntry({ id: 'a', status: 'active' }),
      makeEntry({ id: 'b', status: 'reduced' }),
      makeEntry({ id: 'c', status: 'increased' }),
    ]
    expect(activeMedications(meds).map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('excludes discontinued and paused medications', () => {
    const meds = [
      makeEntry({ id: 'active', status: 'active' }),
      makeEntry({ id: 'disc', status: 'discontinued' }),
      makeEntry({ id: 'pause', status: 'paused' }),
    ]
    expect(activeMedications(meds).map((m) => m.id)).toEqual(['active'])
  })

  it('excludes soft-deleted entries regardless of status', () => {
    const meds = [
      makeEntry({ id: 'active', status: 'active' }),
      makeEntry({ id: 'deleted', status: 'active', deletedAt: '2026-02-01T00:00:00.000Z' }),
    ]
    expect(activeMedications(meds).map((m) => m.id)).toEqual(['active'])
    expect(isActiveMedication(meds[1]!)).toBe(false)
  })
})

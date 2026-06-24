import { describe, expect, it } from 'vitest'
import type { MedicationEntry } from '../../../types/medicationPlan'
import { activeMedications, isActiveMedication, medicationDraftFromEntry, resolvePrnDoseInput } from '../planOps'

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

describe('resolvePrnDoseInput', () => {
  it('composes from structured PRN fields', () => {
    expect(
      resolvePrnDoseInput(
        makeEntry({
          prn: true,
          doseSchedule: {
            morning: '',
            noon: '',
            evening: '',
            night: '',
            unit: 'mg',
            prn: true,
            prnBasisDose: '40',
            prnMaxDailyDose: '120',
          },
        }),
      ),
    ).toBe('40 mg bei Bedarf (max. 120 mg/24 h)')
  })

  it('prefers legacy doseSchedule.morning when no structured fields', () => {
    expect(
      resolvePrnDoseInput(
        makeEntry({
          prn: true,
          doseSchedule: { morning: '40 mg bis zu 120 mg/24 h', noon: '', evening: '', night: '', unit: 'mg', prn: true },
        }),
      ),
    ).toBe('40 mg bis zu 120 mg/24 h')
  })

  it('derives Bedarf text from doseLineGerman when morning is empty', () => {
    expect(
      resolvePrnDoseInput(
        makeEntry({
          substance: 'Lorazepam',
          strength: '1 mg',
          prn: true,
          doseLineGerman: 'Lorazepam 1 mg bei Bedarf (max. 2 mg/24 h)',
          doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
        }),
      ),
    ).toBe('1 mg bei Bedarf (max. 2 mg/24 h)')
  })
})

describe('medicationDraftFromEntry', () => {
  it('hydrates structured PRN fields from legacy dose line and clears M-M-A-N slots', () => {
    const draft = medicationDraftFromEntry(
      makeEntry({
        substance: 'Pipamperon',
        strength: '40 mg',
        prn: true,
        doseLineGerman: 'Pipamperon 40 mg bis zu 120 mg/24 h',
        doseSchedule: { morning: '', noon: '1', evening: '', night: '', unit: 'mg', prn: true },
      }),
    )
    expect(draft.prn).toBe(true)
    expect(draft.doseSchedule.prnBasisDose).toBe('40')
    expect(draft.doseSchedule.prnMaxDailyDose).toBe('120')
    expect(draft.doseSchedule.morning).toBe('')
    expect(draft.doseSchedule.noon).toBe('')
    expect(draft.doseSchedule.evening).toBe('')
    expect(draft.doseSchedule.night).toBe('')
  })
})

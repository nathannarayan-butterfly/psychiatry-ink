import { describe, expect, it } from 'vitest'
import type { MedicationEntry } from '../../../types/medicationPlan'
import {
  formatDoseLineGerman,
  formatDoseScheduleGerman,
  formatMedicationOverviewDoseGerman,
} from '../doseLine'

function makeEntry(overrides: Partial<MedicationEntry> = {}): MedicationEntry {
  return {
    id: 'med-1',
    substance: 'Aripiprazol',
    formulation: 'tablet',
    strength: '10 mg',
    doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'Stk.' },
    doseLineGerman: 'Aripiprazol 10-0-0-0 mg',
    prn: false,
    startDate: '2026-06-09',
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-06-09T09:00:00.000Z',
    lastChangeAt: '2026-06-09T09:00:00.000Z',
    lastChangeType: 'start',
    history: [],
    ...overrides,
  }
}

describe('formatDoseScheduleGerman', () => {
  it('always renders 4 Festzeiten with empty slots as 0', () => {
    expect(
      formatDoseScheduleGerman({
        morning: '1',
        noon: '',
        evening: '',
        night: '',
        unit: 'Stk.',
      }),
    ).toBe('1-0-0-0 Stk.')
  })

  it('converts Stk. counts to mg-per-slot for solid oral with mg strength', () => {
    expect(
      formatDoseScheduleGerman(
        { morning: '1', noon: '', evening: '', night: '', unit: 'Stk.' },
        { formulation: 'tablet', strength: '10 mg' },
      ),
    ).toBe('10-0-0-0 mg')
  })

  it('converts evening tablet count to mg in the correct Festzeit', () => {
    expect(
      formatDoseScheduleGerman(
        { morning: '', noon: '', evening: '1', night: '', unit: 'Stk.' },
        { formulation: 'tablet', strength: '3 mg' },
      ),
    ).toBe('0-0-3-0 mg')
  })

  it('keeps ml amounts for liquid formulations', () => {
    expect(
      formatDoseScheduleGerman(
        { morning: '7.5', noon: '', evening: '', night: '10', unit: 'ml' },
        { formulation: 'solution', strength: '1 mg/ml' },
      ),
    ).toBe('7,5-0-0-10 ml')
  })

  it('renders PRN schedule as strength plus b.B.', () => {
    expect(
      formatDoseScheduleGerman(
        { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
        { formulation: 'tablet', strength: '1 mg' },
      ),
    ).toBe('1 mg b.B.')
  })

  it('renders PRN schedule from structured Bedarf fields', () => {
    expect(
      formatDoseScheduleGerman(
        {
          morning: '',
          noon: '',
          evening: '',
          night: '',
          unit: 'mg',
          prn: true,
          prnBasisDose: '40',
          prnMaxDailyDose: '120',
        },
        { formulation: 'tablet', strength: '40 mg' },
      ),
    ).toBe('40 mg bei Bedarf (max. 120 mg/24 h)')
  })

  it('renders PRN schedule from legacy morning free text', () => {
    expect(
      formatDoseScheduleGerman(
        { morning: '40 mg bis zu 120 mg/24 h', noon: '', evening: '', night: '', unit: 'mg', prn: true },
        { formulation: 'tablet', strength: '40 mg' },
      ),
    ).toBe('40 mg bis zu 120 mg/24 h')
  })
})

describe('formatDoseLineGerman', () => {
  it('renders Aripiprazol in psychiatry-standard Dosis format', () => {
    expect(
      formatDoseLineGerman('Aripiprazol', 'tablet', '10 mg', {
        morning: '1',
        noon: '',
        evening: '',
        night: '',
        unit: 'Stk.',
      }),
    ).toBe('Aripiprazol 10-0-0-0 mg')
  })

  it('renders Risperidon evening dose as mg-per-slot without Stk.', () => {
    expect(
      formatDoseLineGerman('Risperidon', 'tablet', '3 mg', {
        morning: '',
        noon: '',
        evening: '1',
        night: '',
        unit: 'Stk.',
      }),
    ).toBe('Risperidon 0-0-3-0 mg')
  })

  it('includes formulation for liquid schedules without duplicating strength', () => {
    expect(
      formatDoseLineGerman('Haloperidol', 'solution', '2 mg/ml', {
        morning: '7.5',
        noon: '',
        evening: '',
        night: '10',
        unit: 'ml',
      }),
    ).toBe('Haloperidol Lösung 7,5-0-0-10 ml')
  })

  it('renders PRN entries with strength and b.B.', () => {
    expect(
      formatDoseLineGerman('Lorazepam', 'tablet', '1 mg', {
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prn: true,
      }),
    ).toBe('Lorazepam 1 mg b.B.')
  })

  it('renders PRN entries with structured Bedarf dose fields', () => {
    expect(
      formatDoseLineGerman('Pipamperon', 'tablet', '40 mg', {
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prn: true,
        prnBasisDose: '40',
        prnMaxDailyDose: '120',
      }),
    ).toBe('Pipamperon 40 mg bei Bedarf (max. 120 mg/24 h)')
  })

  it('renders PRN entries with legacy Bedarf dose line in morning', () => {
    expect(
      formatDoseLineGerman('Pipamperon', 'tablet', '40 mg', {
        morning: '40 mg bis zu 120 mg/24 h',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prn: true,
      }),
    ).toBe('Pipamperon 40 mg bis zu 120 mg/24 h')
  })
})

describe('formatMedicationOverviewDoseGerman', () => {
  it('strips substance prefix from canonical doseLineGerman', () => {
    expect(formatMedicationOverviewDoseGerman(makeEntry())).toBe('10-0-0-0 mg')
  })

  it('falls back to mg-per-slot schedule when doseLineGerman is empty', () => {
    expect(
      formatMedicationOverviewDoseGerman(
        makeEntry({
          doseLineGerman: '',
          doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'Stk.' },
        }),
      ),
    ).toBe('10-0-0-0 mg')
  })

  it('returns full custom PRN line when substance prefix does not match pattern', () => {
    expect(
      formatMedicationOverviewDoseGerman(
        makeEntry({
          substance: 'Lorazepam',
          strength: '1 mg',
          doseLineGerman: 'Lorazepam 1 mg bei Bedarf (max. 2 mg/24 h)',
          doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
          prn: true,
        }),
      ),
    ).toBe('1 mg bei Bedarf (max. 2 mg/24 h)')
  })

  it('ignores stale doseLineGerman with Stk. counts in favour of mg-per-slot schedule', () => {
    expect(
      formatMedicationOverviewDoseGerman(
        makeEntry({
          doseLineGerman: 'Aripiprazol 10 mg 1-0-0-0 Stk.',
        }),
      ),
    ).toBe('10-0-0-0 mg')
  })

  it('ignores stale doseLineGerman with duplicated strength', () => {
    expect(
      formatMedicationOverviewDoseGerman(
        makeEntry({
          doseLineGerman: 'Aripiprazol 10mg. 10-0-0-0 mg',
        }),
      ),
    ).toBe('10-0-0-0 mg')
  })

  it('uses canonical PRN schedule when doseLineGerman matches b.B. pattern', () => {
    expect(
      formatMedicationOverviewDoseGerman(
        makeEntry({
          substance: 'Lorazepam',
          strength: '1 mg',
          doseLineGerman: 'Lorazepam 1 mg b.B.',
          doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
          prn: true,
        }),
      ),
    ).toBe('1 mg b.B.')
  })
})

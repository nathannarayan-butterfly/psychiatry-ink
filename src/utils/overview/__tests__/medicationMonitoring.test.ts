import { describe, expect, it } from 'vitest'

import type { MedicationEntry } from '../../../types/medicationPlan'
import type { LaborBefund } from '../../laborArchive'
import { getMedicationMonitoringGroups } from '../medicationMonitoring'

function med(substance: string, id = substance): MedicationEntry {
  return {
    id,
    substance,
    formulation: 'tablet',
    strength: '10 mg',
    doseSchedule: { morning: '10', noon: '', evening: '', night: '', unit: 'mg' },
    doseLineGerman: `${substance} 10 mg`,
    prn: false,
    startDate: '2026-01-01',
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-01-01T00:00:00.000Z',
    lastChangeAt: '2026-01-01T00:00:00.000Z',
    lastChangeType: 'start',
    history: [],
  }
}

function befund(date: string, values: { name: string; numericValue: number; unit: string }[]): LaborBefund {
  return {
    id: `befund-${date}`,
    caseId: 'case-1',
    date,
    label: 'Test',
    rawText: '',
    categories: [
      {
        id: 'cat-1',
        label: 'Labor',
        values: values.map((v) => ({
          name: v.name,
          value: String(v.numericValue),
          numericValue: v.numericValue,
          unit: v.unit,
        })),
      },
    ],
    createdAt: date,
  }
}

describe('getMedicationMonitoringGroups', () => {
  it('groups Aripiprazol metabolic parameters with latest lab values', () => {
    const medications = [med('Aripiprazol', 'med-arip')]
    const befunde = [
      befund('2026-06-01', [{ name: 'HbA1c', numericValue: 5.4, unit: '%' }]),
      befund('2026-06-10', [{ name: 'BMI', numericValue: 26.4, unit: 'kg/m²' }]),
      befund('2026-06-12', [{ name: 'Glukose (nüchtern)', numericValue: 98, unit: 'mg/dl' }]),
      befund('2026-06-20', [{ name: 'HbA1c', numericValue: 5.8, unit: '%' }]),
    ]

    const groups = getMedicationMonitoringGroups({ medications, befunde })
    expect(groups).toHaveLength(1)
    expect(groups[0].medicationName).toBe('Aripiprazol')

    const byLabel = Object.fromEntries(groups[0].parameters.map((p) => [p.label, p]))
    expect(byLabel['Glukose'].valueLabel).toBe('98 mg/dl')
    expect(byLabel['Glukose'].dateLabel).toBe('12.06.2026')
    expect(byLabel['BMI'].valueLabel).toBe('26.4 kg/m²')
    expect(byLabel['BMI'].dateLabel).toBe('10.06.2026')
    expect(byLabel['HbA1c'].valueLabel).toBe('5.8 %')
    expect(byLabel['HbA1c'].dateLabel).toBe('20.06.2026')
  })

  it('marks parameters without lab data as missing', () => {
    const medications = [med('Lithium', 'med-li')]
    const groups = getMedicationMonitoringGroups({ medications, befunde: [] })
    expect(groups).toHaveLength(1)
    expect(groups[0].parameters.every((p) => p.missing)).toBe(true)
  })

  it('computes BMI from weight and height when BMI not stored directly', () => {
    const medications = [med('Aripiprazol')]
    const befunde = [
      befund('2026-06-10', [
        { name: 'Gewicht', numericValue: 82, unit: 'kg' },
        { name: 'Körpergröße', numericValue: 176, unit: 'cm' },
      ]),
    ]
    const groups = getMedicationMonitoringGroups({ medications, befunde })
    const bmi = groups[0].parameters.find((p) => p.label === 'BMI')
    expect(bmi?.valueLabel).toBe('26.5 kg/m²')
    expect(bmi?.missing).toBe(false)
  })

  it('skips paused medications', () => {
    const medications: MedicationEntry[] = [
      { ...med('Aripiprazol'), status: 'paused' },
    ]
    const groups = getMedicationMonitoringGroups({ medications, befunde: [] })
    expect(groups).toHaveLength(0)
  })
})

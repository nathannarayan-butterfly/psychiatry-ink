import { describe, expect, it } from 'vitest'

import type { MedicationEntry } from '../../../types/medicationPlan'
import type { LaborBefund } from '../../laborArchive'
import {
  formatParameterMonitoringLabel,
  getParameterMonitoringRows,
} from '../medicationMonitoring'

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

function befund(date: string, values: { name: string; numericValue: number; unit: string; refMin?: number; refMax?: number }[]): LaborBefund {
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
          refMin: v.refMin,
          refMax: v.refMax,
        })),
      },
    ],
    createdAt: date,
  }
}

describe('getParameterMonitoringRows', () => {
  it('groups Aripiprazol metabolic parameters with latest lab values', () => {
    const medications = [med('Aripiprazol', 'med-arip')]
    const befunde = [
      befund('2026-06-01', [{ name: 'HbA1c', numericValue: 5.4, unit: '%' }]),
      befund('2026-06-10', [{ name: 'BMI', numericValue: 26.4, unit: 'kg/m²' }]),
      befund('2026-06-12', [{ name: 'Glukose (nüchtern)', numericValue: 98, unit: 'mg/dl' }]),
      befund('2026-06-20', [{ name: 'HbA1c', numericValue: 5.8, unit: '%' }]),
    ]

    const rows = getParameterMonitoringRows({ medications, befunde })
    expect(rows.length).toBeGreaterThan(0)

    const byLabel = Object.fromEntries(rows.map((p) => [p.label, p]))
    expect(byLabel['Glukose'].valueLabel).toBe('98 mg/dl')
    expect(byLabel['Glukose'].dateLabel).toBe('12.06.2026')
    expect(byLabel['Glukose'].medications).toEqual(['Aripiprazol'])
    expect(byLabel['BMI'].valueLabel).toBe('26.4 kg/m²')
    expect(byLabel['BMI'].dateLabel).toBe('10.06.2026')
    expect(byLabel['HbA1c'].valueLabel).toBe('5.8 %')
    expect(byLabel['HbA1c'].dateLabel).toBe('20.06.2026')
  })

  it('merges Lipide across multiple antipsychotics into one row with all meds in brackets', () => {
    const medications = [
      med('Risperidon', 'med-ris'),
      med('Olanzapin', 'med-ola'),
      med('Aripiprazol', 'med-ari'),
    ]
    const befunde = [
      befund('2026-06-15', [
        { name: 'Triglyceride', numericValue: 198, unit: 'mg/dl', refMin: 50, refMax: 150 },
      ]),
    ]

    const rows = getParameterMonitoringRows({ medications, befunde })
    const lipids = rows.find((r) => r.label === 'Lipide')
    expect(lipids).toBeDefined()
    expect(lipids!.medications).toEqual(['Aripiprazol', 'Olanzapin', 'Risperidon'])
    expect(lipids!.valueLabel).toBe('198 mg/dl')
    expect(lipids!.refLabel).toBe('50–150 mg/dl')
    expect(formatParameterMonitoringLabel(lipids!)).toBe(
      'Lipide (Aripiprazol, Olanzapin, Risperidon)',
    )
  })

  it('marks parameters without lab data as missing', () => {
    const medications = [med('Lithium', 'med-li')]
    const rows = getParameterMonitoringRows({ medications, befunde: [] })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((p) => p.missing)).toBe(true)
  })

  it('computes BMI from weight and height when BMI not stored directly', () => {
    const medications = [med('Aripiprazol')]
    const befunde = [
      befund('2026-06-10', [
        { name: 'Gewicht', numericValue: 82, unit: 'kg' },
        { name: 'Körpergröße', numericValue: 176, unit: 'cm' },
      ]),
    ]
    const rows = getParameterMonitoringRows({ medications, befunde })
    const bmi = rows.find((p) => p.label === 'BMI')
    expect(bmi?.valueLabel).toBe('26.5 kg/m²')
    expect(bmi?.missing).toBe(false)
  })

  it('skips paused medications', () => {
    const medications: MedicationEntry[] = [
      { ...med('Aripiprazol'), status: 'paused' },
    ]
    const rows = getParameterMonitoringRows({ medications, befunde: [] })
    expect(rows).toHaveLength(0)
  })
})

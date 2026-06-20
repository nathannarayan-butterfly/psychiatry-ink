import { describe, expect, it } from 'vitest'
import type { PatientDynamicKey } from '../../../data/documentTemplate/dynamicFields'
import type { TemplateField, TemplateRenderContext } from '../../../types/documentTemplate'
import { resolveAnthropometryFromBefunde } from '../anthropometryContext'
import { resolveDynamicField, DYNAMIC_FIELD_MISSING } from '../resolveDynamicField'
import type { LaborBefund } from '../../laborArchive'

const baseContext: TemplateRenderContext = {
  patient: {
    name: 'Max Mustermann',
    vorname: 'Max',
    nachname: 'Mustermann',
    geburtsdatum: '15.03.1982',
    geschlecht: 'männlich',
    age: '44 J.',
    height: '178 cm',
    weight: '82 kg',
    bmi: '25.9',
  },
  case: {
    caseId: 'abc123',
    diagnosis: 'F32.1 Mittelgradige depressive Episode',
    aufnahmedatum: '02.06.2026',
    entlassungsdatum: '20.06.2026',
    aufenthaltsdauer: '19 Tage',
    medikationKurz: 'Sertralin 100 mg 1-0-0; Quetiapin 25 mg 0-0-1',
  },
  clinician: { name: 'Dr. Beispiel' },
  system: {
    date: '20.06.2026',
    documentDate: '20.06.2026 14:30',
    time: '14:30',
    year: '2026',
  },
}

describe('resolveDynamicField', () => {
  it('resolves patient name from context', () => {
    expect(resolveDynamicField('patient.name', baseContext)).toBe('Max Mustermann')
  })

  it('resolves age and date of birth', () => {
    expect(resolveDynamicField('patient.geburtsdatum', baseContext)).toBe('15.03.1982')
    expect(resolveDynamicField('patient.age', baseContext)).toBe('44 J.')
  })

  it('resolves admission date from case context', () => {
    expect(resolveDynamicField('case.aufnahmedatum', baseContext)).toBe('02.06.2026')
  })

  it('returns em dash for missing values', () => {
    const empty: TemplateRenderContext = { system: { date: '20.06.2026' } }
    expect(resolveDynamicField('patient.name', empty)).toBe(DYNAMIC_FIELD_MISSING)
    expect(resolveDynamicField('case.entlassungsdatum', empty)).toBe(DYNAMIC_FIELD_MISSING)
  })

  it('resolves BMI from context', () => {
    expect(resolveDynamicField('patient.bmi', baseContext)).toBe('25.9')
  })

  it('supports custom missing fallback', () => {
    expect(
      resolveDynamicField('patient.address', baseContext, { missingFallback: 'n/a' }),
    ).toBe('n/a')
  })
})

describe('resolveAnthropometryFromBefunde', () => {
  it('computes BMI from height and weight lab values', () => {
    const befunde: LaborBefund[] = [
      {
        id: 'b1',
        caseId: 'case-1',
        date: '2026-06-01',
        rawText: '',
        createdAt: '2026-06-01T10:00:00.000Z',
        categories: [
          {
            id: 'anthro',
            label: 'Anthropometrie',
            values: [
              { name: 'Größe', numericValue: 175, unit: 'cm', value: '175' },
              { name: 'Gewicht', numericValue: 70, unit: 'kg', value: '70' },
            ],
          },
        ],
      },
    ]
    const result = resolveAnthropometryFromBefunde(befunde)
    expect(result.height).toBe('175 cm')
    expect(result.weight).toBe('70 kg')
    expect(result.bmi).toBe('22.9')
  })
})

describe('dynamic template field round-trip', () => {
  it('stores dynamic field type and key correctly', () => {
    const field: TemplateField = {
      id: 'f-dynamic-1',
      type: 'dynamic',
      dynamicKey: 'patient.name' satisfies PatientDynamicKey,
      label: 'Name',
      order: 0,
    }
    const serialized = JSON.parse(JSON.stringify(field)) as TemplateField
    expect(serialized.type).toBe('dynamic')
    expect(serialized.dynamicKey).toBe('patient.name')
    expect(serialized.label).toBe('Name')
  })
})

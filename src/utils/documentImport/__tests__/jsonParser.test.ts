import { describe, expect, it } from 'vitest'
import { parseJsonText } from '../parsers/jsonParser'
import type { CandidateModule } from '../../../schemas/documentImport/envelope'

function modules(text: string): CandidateModule[] {
  return parseJsonText(text).candidates.map((c) => c.module)
}

describe('parseJsonText', () => {
  it('maps a clinical object with collection keys into candidates', () => {
    const json = JSON.stringify({
      diagnoses: [{ icd10: 'F32.1', label: 'Mittelgradige depressive Episode' }],
      medications: [{ substance: 'Sertralin', strength: '50 mg', doseText: '1-0-0' }],
      anamnese: [{ sectionId: 'suchtanamnese', title: 'Sucht', text: 'Kein Alkohol.' }],
      labs: [{ panel: 'Elektrolyte', values: [{ name: 'Natrium', value: '140', unit: 'mmol/l' }] }],
    })
    const result = parseJsonText(json)
    expect(result.candidates).toHaveLength(4)
    expect(result.candidates.map((c) => c.module).sort()).toEqual(
      ['anamnese', 'diagnosis', 'lab', 'medication'].sort(),
    )
  })

  it('extracts diagnosis fields with provenance path', () => {
    const result = parseJsonText(JSON.stringify({ diagnoses: [{ icd10: 'F20.0', label: 'Schizophrenie' }] }))
    const diagnosis = result.candidates.find((c) => c.module === 'diagnosis')
    expect(diagnosis?.module).toBe('diagnosis')
    if (diagnosis?.module === 'diagnosis') {
      expect(diagnosis.data.icd10Code).toBe('F20.0')
      expect(diagnosis.data.label).toBe('Schizophrenie')
      expect(diagnosis.confidence).toBe('high')
    }
    expect(diagnosis?.sourceLocation.path).toBe('diagnoses[0]')
  })

  it('maps an array of tagged records', () => {
    const json = JSON.stringify([
      { module: 'diagnosis', label: 'Angststörung', code: 'F41.1' },
      { type: 'medication', substance: 'Lorazepam' },
    ])
    expect(modules(json)).toEqual(['diagnosis', 'medication'])
  })

  it('infers module from fields when untagged', () => {
    expect(modules(JSON.stringify({ substance: 'Quetiapin', dose: '300 mg' }))).toEqual(['medication'])
  })

  it('reports invalid JSON as an error notice', () => {
    const result = parseJsonText('{ not json')
    expect(result.candidates).toHaveLength(0)
    expect(result.notices[0].level).toBe('error')
    expect(result.notices[0].code).toBe('json_invalid')
  })

  it('warns when no clinical fields are recognised', () => {
    const result = parseJsonText(JSON.stringify({ foo: 'bar' }))
    // Unknown object degrades to a document candidate so nothing is lost.
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].module).toBe('document')
  })
})

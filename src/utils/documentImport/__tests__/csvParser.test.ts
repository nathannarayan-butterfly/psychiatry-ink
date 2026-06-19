import { describe, expect, it } from 'vitest'
import { parseCsvText } from '../parsers/csvParser'
import { tabularToCandidates } from '../tabular'

describe('parseCsvText', () => {
  it('auto-detects a diagnosis table (semicolon delimiter)', () => {
    const csv = 'ICD10;Diagnose\nF32.1;Mittelgradige depressive Episode\nF41.1;Generalisierte Angststörung'
    const result = parseCsvText(csv)
    expect(result.mapping.module).toBe('diagnosis')
    expect(result.candidates).toHaveLength(2)
    const first = result.candidates[0]
    expect(first.module).toBe('diagnosis')
    if (first.module === 'diagnosis') {
      expect(first.data.icd10Code).toBe('F32.1')
      expect(first.data.label).toBe('Mittelgradige depressive Episode')
    }
    expect(result.table.headers).toEqual(['ICD10', 'Diagnose'])
  })

  it('auto-detects a medication table (comma delimiter)', () => {
    const csv = 'Wirkstoff,Stärke,Dosierung\nSertralin,50 mg,1-0-0\nQuetiapin,300 mg,0-0-1'
    const result = parseCsvText(csv)
    expect(result.mapping.module).toBe('medication')
    expect(result.candidates).toHaveLength(2)
  })

  it('groups lab rows into a single panel candidate', () => {
    const csv = 'Parameter,Wert,Einheit\nNatrium,140,mmol/l\nKalium,4.1,mmol/l'
    const result = parseCsvText(csv)
    expect(result.mapping.module).toBe('lab')
    expect(result.candidates).toHaveLength(1)
    const lab = result.candidates[0]
    if (lab.module === 'lab') expect(lab.data.values).toHaveLength(2)
  })

  it('re-mapping recomputes candidates from the table', () => {
    const csv = 'Spalte A,Spalte B\nWert1,Wert2'
    const result = parseCsvText(csv)
    // Default unknown headers => document candidate.
    expect(result.mapping.module).toBe('document')
    const remapped = tabularToCandidates(result.table, {
      module: 'diagnosis',
      columns: { icd10Code: 0, label: 1 },
    })
    expect(remapped.candidates[0].module).toBe('diagnosis')
  })

  it('reports empty CSV as an error', () => {
    expect(parseCsvText('   ').notices[0].code).toBe('csv_empty')
  })
})

import { describe, expect, it } from 'vitest'
import { createDiagnoseFromHit } from '../diagnosenArchive'
import type { DiagnosisSearchHit } from '../../services/diagnosisReferenceApi'

describe('independent catalogue diagnosis storage', () => {
  const icd11Hit: DiagnosisSearchHit = {
    diagnosisEntryId: 'entry-6a20',
    system: 'ICD11MMS',
    catalogueVersion: '2024-01',
    code: '6A20',
    title: 'Schizophrenie',
    isCategory: false,
    isSelectable: true,
    criteriaAvailable: true,
  }

  it('saves ICD-11 selection without ICD-10 mapping', () => {
    const entry = createDiagnoseFromHit(icd11Hit, 'icd11')
    expect(entry.codingSystem).toBe('ICD11MMS')
    expect(entry.icd11.code).toBe('6A20')
    expect(entry.icd11.label).toBe('Schizophrenie')
    expect(entry.icd10.code).toBe('')
    expect(entry.icd10.label).toBe('')
    expect(entry.criteriaAvailable).toBe(true)
  })

  it('saves ICD-10 selection independently', () => {
    const icd10Hit: DiagnosisSearchHit = {
      ...icd11Hit,
      diagnosisEntryId: 'entry-f200',
      system: 'ICD10GM',
      code: 'F20.0',
      title: 'Paranoide Schizophrenie',
    }
    const entry = createDiagnoseFromHit(icd10Hit, 'icd10')
    expect(entry.codingSystem).toBe('ICD10GM')
    expect(entry.icd10.code).toBe('F20.0')
    expect(entry.icd11.code).toBe('')
  })
})

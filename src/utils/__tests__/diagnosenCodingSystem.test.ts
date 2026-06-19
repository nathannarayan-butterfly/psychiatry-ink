import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIAGNOSEN_CODING_SYSTEM,
  loadDiagnosenCodingSystem,
  normalizeVisibleCodingSystem,
  saveDiagnosenCodingSystem,
  VISIBLE_CODING_SYSTEMS,
} from '../diagnosenCodingSystem'

describe('diagnosenCodingSystem', () => {
  it('exposes only ICD-10 and ICD-11 in the UI', () => {
    expect(VISIBLE_CODING_SYSTEMS).toEqual(['icd10', 'icd11'])
  })

  it('normalizes legacy DSM selection to ICD-10', () => {
    expect(normalizeVisibleCodingSystem('dsm')).toBe('icd10')
    expect(normalizeVisibleCodingSystem('icd11')).toBe('icd11')
    expect(normalizeVisibleCodingSystem('icd10')).toBe('icd10')
  })

  it('migrates stored DSM preference away on load', () => {
    const caseId = `test-case-${Date.now()}`
    saveDiagnosenCodingSystem(caseId, 'dsm')
    expect(loadDiagnosenCodingSystem(caseId)).toBe(DEFAULT_DIAGNOSEN_CODING_SYSTEM)
  })
})

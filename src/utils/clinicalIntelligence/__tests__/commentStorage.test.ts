import { describe, it, expect } from 'vitest'
import { saveClinicianComment } from '../audit'
import { emptyClinicalIntelligenceCaseState } from '../../../types/clinicalIntelligence'
import {
  loadClinicalIntelligenceState,
  saveClinicalIntelligenceState,
  clinicalIntelligenceStorageKey,
} from '../storage'

describe('clinician comment persistence', () => {
  it('persists comment and writes audit entry', () => {
    const base = emptyClinicalIntelligenceCaseState('case-comment')
    const next = saveClinicianComment(base, '  Follow up sleep hygiene.  ')
    expect(next.clinicianComment).toBe('Follow up sleep hygiene.')
    expect(next.audit[0]?.action).toBe('clinician-comment-saved')
  })

  it('round-trips through storage helpers', () => {
    const caseId = 'case-storage-comment'
    const base = emptyClinicalIntelligenceCaseState(caseId)
    const withComment = saveClinicianComment(base, 'Notiz für die Begutachtung.')
    saveClinicalIntelligenceState(withComment)

    const loaded = loadClinicalIntelligenceState(caseId)
    expect(loaded.clinicianComment).toBe('Notiz für die Begutachtung.')
    expect(clinicalIntelligenceStorageKey(caseId)).toContain(caseId)
  })
})

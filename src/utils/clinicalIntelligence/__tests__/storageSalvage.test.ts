import { describe, it, expect, beforeEach } from 'vitest'
import type { ClinicalIntelligenceRunResponse } from '../../../types/clinicalIntelligence'
import {
  clinicalIntelligenceStorageKey,
  loadClinicalIntelligenceState,
  salvageClinicalIntelligenceStateFromRaw,
} from '../storage'

const CASE_ID = 'salvage-case-0001'

function makeRun(): ClinicalIntelligenceRunResponse {
  return {
    builtAt: '2026-06-20T10:00:00.000Z',
    language: 'de',
    dimensional: {
      activeDimensions: [
        {
          dimensionId: 'anxiety-threat-anticipation',
          dimensionName: 'Angst',
          severity: 3,
          confidence: 'moderate',
          longitudinalPattern: '',
          supportingEvidenceIds: ['anam-1'],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Anxious anticipation.',
          uncertainty: '',
          missingData: '',
          reviewStatus: 'accepted',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    mechanism: {
      activeMechanisms: [],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    evidenceItemCount: 1,
    diagnostics: { dimensional: null, mechanism: null },
  }
}

describe('clinical intelligence storage salvage', () => {
  beforeEach(() => {
    localStorage.removeItem(clinicalIntelligenceStorageKey(CASE_ID))
  })

  it('loads salvaged latestRun from invalid persisted envelope', () => {
    const run = makeRun()
    localStorage.setItem(
      clinicalIntelligenceStorageKey(CASE_ID),
      JSON.stringify({
        version: 99,
        caseId: CASE_ID,
        latestRun: run,
      }),
    )

    const loaded = loadClinicalIntelligenceState(CASE_ID)
    expect(loaded.latestRun?.dimensional.activeDimensions.length).toBeGreaterThan(0)
  })

  it('returns null salvage when latestRun is invalid', () => {
    expect(
      salvageClinicalIntelligenceStateFromRaw(CASE_ID, {
        version: 1,
        caseId: CASE_ID,
        latestRun: { builtAt: 'bad' },
      }),
    ).toBeNull()
  })
})

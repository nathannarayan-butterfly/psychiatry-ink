import { describe, it, expect } from 'vitest'
import { computeCiReviewCounts } from '../reviewCounts'
import {
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
} from '../../../types/clinicalIntelligence'

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
        {
          dimensionId: 'depressive-inhibition',
          dimensionName: 'Depression',
          severity: 2,
          confidence: 'low',
          longitudinalPattern: '',
          supportingEvidenceIds: [],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Exploratory dim in active list',
          uncertainty: '',
          missingData: '',
          reviewStatus: 'pending',
          source: 'exploratory',
        },
        {
          dimensionId: 'sleep-circadian-regulation',
          dimensionName: 'Schlaf',
          severity: 1,
          confidence: 'moderate',
          longitudinalPattern: '',
          supportingEvidenceIds: [],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Pending sleep issue.',
          uncertainty: '',
          missingData: '',
          reviewStatus: 'pending',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [{ topic: 'Topic', rationale: 'Needs more data' }],
      quarantined: [],
    },
    mechanism: {
      activeMechanisms: [
        {
          mechanismId: 'trauma-limbic-hyperreactivity',
          label: 'Trauma',
          confidence: 'moderate',
          linkedDimensions: ['anxiety-threat-anticipation'],
          supportingEvidenceIds: ['anam-1'],
          contradictingEvidenceIds: [],
          clinicalImplication: 'Threat processing.',
          treatmentRelevance: 'Trauma therapy.',
          uncertainty: '',
          reviewStatus: 'edited',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    evidenceItemCount: 1,
    diagnostics: { dimensional: null, mechanism: null },
  }
}

describe('computeCiReviewCounts', () => {
  it('counts evidence_based findings only and tracks rejected via state ids', () => {
    const state = {
      ...emptyClinicalIntelligenceCaseState('case-1'),
      rejectedDimensionIds: ['personality-organization' as const],
      rejectedMechanismIds: ['circadian-sleep-wake-dysregulation' as const],
    }
    const counts = computeCiReviewCounts(state, makeRun())

    expect(counts.dimensional).toEqual({ accepted: 1, pending: 1, rejected: 1 })
    expect(counts.mechanism).toEqual({ accepted: 1, pending: 0, rejected: 1 })
    expect(counts.exploratoryDimensional).toBe(1)
    expect(counts.exploratoryMechanism).toBe(0)
  })
})

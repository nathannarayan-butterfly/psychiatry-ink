import { describe, it, expect } from 'vitest'
import {
  assertDiscussContextCompact,
  buildClinicalIntelligenceDiscussContext,
  CI_DISCUSS_FORBIDDEN_FIELDS,
} from '../discussContext'
import {
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
  type CompactEvidencePayload,
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

const evidence: CompactEvidencePayload = {
  caseId: 'case-1',
  builtAt: '2026-06-20T10:00:00.000Z',
  isDeidentified: true,
  patientLabel: 'Patient',
  items: [
    {
      id: 'anam-1',
      label: 'Anamnese',
      category: 'anamnesis',
      text: 'Patient reports chronic worry and poor sleep over several months with functional impairment.',
    },
    {
      id: 'unused-1',
      label: 'Unused',
      category: 'other',
      text: 'Should not appear in discuss context.',
    },
  ],
}

describe('buildClinicalIntelligenceDiscussContext', () => {
  it('includes compact summaries only — no raw text field name in payload', () => {
    const state = {
      ...emptyClinicalIntelligenceCaseState('case-1'),
      latestRun: makeRun(),
      clinicianComment: 'Review with patient next visit.',
    }
    const context = buildClinicalIntelligenceDiscussContext(state, evidence, 'de')
    expect(context).not.toBeNull()

    const json = JSON.stringify(context)
    for (const field of CI_DISCUSS_FORBIDDEN_FIELDS) {
      expect(json.includes(`"${field}"`)).toBe(false)
    }

    expect(context!.evidenceItems).toHaveLength(1)
    expect(context!.evidenceItems[0]?.id).toBe('anam-1')
    expect(context!.evidenceItems[0]?.summary.length).toBeLessThanOrEqual(320)
    expect(context!.evidenceItems[0]).not.toHaveProperty('text')

    assertDiscussContextCompact(context)
  })
})

import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TranslationProvider } from '../../../../context/TranslationContext'
import { ClinicalIntelligenceRightPanel } from '../ClinicalIntelligenceRightPanel'
import type { UseClinicalIntelligenceResult } from '../../../../hooks/useClinicalIntelligence'
import {
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
} from '../../../../types/clinicalIntelligence'

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
          supportingEvidenceIds: [],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Summary',
          uncertainty: '',
          missingData: '',
          reviewStatus: 'pending',
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
    evidenceItemCount: 0,
    diagnostics: { dimensional: null, mechanism: null },
  }
}

function makeCi(): UseClinicalIntelligenceResult {
  const state = { ...emptyClinicalIntelligenceCaseState('case-1'), latestRun: makeRun() }
  return {
    state,
    status: 'idle',
    error: null,
    evidence: null,
    evidenceError: null,
    hasEvidenceBase: true,
    hasLatestRun: true,
    latestRun: state.latestRun,
    refreshEvidencePreview: () => {},
    runPipeline: async () => ({
      ok: false,
      state,
      error: new Error('not implemented in test'),
      reason: 'unknown',
    }),
    acceptDimension: () => {},
    editDimension: () => {},
    rejectDimension: () => {},
    acceptMechanism: () => {},
    editMechanism: () => {},
    rejectMechanism: () => {},
    acceptAll: () => ({ dimensionsAccepted: 0, mechanismsAccepted: 0 }),
    saveClinicianComment: () => {},
    saveAcceptedFindings: () => {},
    setDiscussMessages: () => {},
  } satisfies UseClinicalIntelligenceResult
}

describe('ClinicalIntelligenceRightPanel discuss rail', () => {
  it('renders discuss panel in the right rail when discussOpen', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(
          TranslationProvider,
          null,
          createElement(ClinicalIntelligenceRightPanel, {
            ci: makeCi(),
            discussOpen: true,
            onCloseDiscuss: () => {},
            savedAt: null,
          }),
        ),
      )
    })

    expect(container.querySelector('.ci-discuss-rail')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('does not render discuss panel when discussOpen is false', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(
          TranslationProvider,
          null,
          createElement(ClinicalIntelligenceRightPanel, {
            ci: makeCi(),
            discussOpen: false,
            onCloseDiscuss: () => {},
            savedAt: null,
          }),
        ),
      )
    })

    expect(container.querySelector('.ci-discuss-rail')).toBeNull()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})

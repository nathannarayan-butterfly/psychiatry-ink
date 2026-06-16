import { beforeEach, describe, expect, it } from 'vitest'
import {
  acceptAiSuggestion,
  dismissAiSuggestion,
  loadAiSuggestions,
  saveAiSuggestions,
} from '../aiSuggestions'
import { loadAttestations } from '../attestationStorage'

const CASE = 'case-ai-1'

beforeEach(() => {
  localStorage.clear()
})

describe('butterfly AI-suggestion store', () => {
  it('persists results as pending, inferred suggestions (never attestations)', () => {
    saveAiSuggestions(CASE, 'alcohol_dependence', 'mock-model', [
      { criterionId: 'f10_2.craving', status: 'met', evidenceQuote: 'starkes Verlangen', confidence: 0.8 },
      { criterionId: 'f10_2.tolerance', status: 'unclear', evidenceQuote: null, confidence: 0.2 },
    ])

    const state = loadAiSuggestions(CASE)
    expect(state['f10_2.craving']).toMatchObject({
      status: 'met',
      provenance: 'pending_clinician_review',
      evidenceStrength: 'inferred',
    })
    // Suggestions must NOT silently become attestations / feed the evaluator.
    expect(loadAttestations(CASE)).toEqual({})
  })

  it('accepting a met/not_met suggestion promotes it to a clinician attestation', () => {
    saveAiSuggestions(CASE, 'alcohol_dependence', 'mock-model', [
      { criterionId: 'f10_2.craving', status: 'met', evidenceQuote: 'q', confidence: 0.8 },
    ])

    expect(acceptAiSuggestion(CASE, 'f10_2.craving')).toBe(true)
    // Now a clinician attestation exists and the suggestion is cleared.
    expect(loadAttestations(CASE)['f10_2.craving']).toBe('met')
    expect(loadAiSuggestions(CASE)['f10_2.craving']).toBeUndefined()
  })

  it('cannot accept an "unclear" suggestion', () => {
    saveAiSuggestions(CASE, 'alcohol_dependence', 'mock-model', [
      { criterionId: 'f10_2.tolerance', status: 'unclear', evidenceQuote: null, confidence: 0.1 },
    ])
    expect(acceptAiSuggestion(CASE, 'f10_2.tolerance')).toBe(false)
    expect(loadAttestations(CASE)).toEqual({})
  })

  it('dismiss removes a suggestion', () => {
    saveAiSuggestions(CASE, 'alcohol_dependence', 'mock-model', [
      { criterionId: 'f10_2.craving', status: 'met', evidenceQuote: 'q', confidence: 0.8 },
    ])
    dismissAiSuggestion(CASE, 'f10_2.craving')
    expect(loadAiSuggestions(CASE)['f10_2.craving']).toBeUndefined()
  })
})

/**
 * Butterfly AI-suggestion store.
 *
 * LLM extraction results land HERE as AI-SUGGESTED, pending clinician review —
 * NEVER as accepted facts. They are kept separate from the deterministic
 * attestation store so they never silently change a verdict. Only when a
 * clinician explicitly accepts a suggestion does it become a clinician
 * attestation (which then feeds the evaluator).
 */

import type { AiModelTier } from '../../types'
import type { ButterflyCriterionStatus } from '../../services/butterflyExtractApi'
import { setAttestation } from './attestationStorage'

export interface ButterflyAiSuggestion {
  criterionId: string
  disorderId: string
  status: ButterflyCriterionStatus
  evidenceQuote: string | null
  confidence: number
  model: string
  suggestedAt: string
  /**
   * AI model tier that produced this suggestion (Economical / Standard /
   * Gründlich). Optional for backward compatibility with suggestions stored
   * before tiers were tracked; used so a tier switch re-queries rather than
   * reusing another tier's result.
   */
  tier?: AiModelTier
  /** Provenance marker — advisory, awaiting clinician confirmation. */
  provenance: 'pending_clinician_review'
  /** Evidence is model-inferred, not structured/deterministic. */
  evidenceStrength: 'inferred'
}

export type ButterflyAiSuggestionState = Record<string, ButterflyAiSuggestion>

function storageKey(caseId: string): string {
  return `butterfly-ai-suggestions:${caseId}`
}

export function loadAiSuggestions(caseId: string): ButterflyAiSuggestionState {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ButterflyAiSuggestionState
  } catch {
    return {}
  }
}

function persist(caseId: string, state: ButterflyAiSuggestionState): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export interface IncomingAiSuggestion {
  criterionId: string
  status: ButterflyCriterionStatus
  evidenceQuote: string | null
  confidence: number
}

/**
 * Merge a batch of extraction results for one disorder into the store. Existing
 * suggestions for the same criteria are replaced with the fresh ones.
 */
export function saveAiSuggestions(
  caseId: string,
  disorderId: string,
  model: string,
  results: IncomingAiSuggestion[],
  tier?: AiModelTier,
): ButterflyAiSuggestionState {
  const state = loadAiSuggestions(caseId)
  const suggestedAt = new Date().toISOString()
  for (const result of results) {
    state[result.criterionId] = {
      criterionId: result.criterionId,
      disorderId,
      status: result.status,
      evidenceQuote: result.evidenceQuote,
      confidence: result.confidence,
      model,
      suggestedAt,
      tier,
      provenance: 'pending_clinician_review',
      evidenceStrength: 'inferred',
    }
  }
  persist(caseId, state)
  return state
}

/** Remove a suggestion (clinician dismissed/overrode it). */
export function dismissAiSuggestion(caseId: string, criterionId: string): ButterflyAiSuggestionState {
  const state = loadAiSuggestions(caseId)
  delete state[criterionId]
  persist(caseId, state)
  return state
}

/**
 * Accept an AI suggestion → promote it to a clinician attestation (which feeds
 * the deterministic evaluator) and drop it from the suggestion store. Only
 * met/not_met suggestions are acceptable; `unclear` cannot be accepted.
 */
export function acceptAiSuggestion(caseId: string, criterionId: string): boolean {
  const state = loadAiSuggestions(caseId)
  const suggestion = state[criterionId]
  if (!suggestion || (suggestion.status !== 'met' && suggestion.status !== 'not_met')) {
    return false
  }
  setAttestation(caseId, criterionId, suggestion.status)
  delete state[criterionId]
  persist(caseId, state)
  return true
}

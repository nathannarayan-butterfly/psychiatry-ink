/**
 * Clinical-question finding NOTES — PHI-safe, vault-only persistence.
 *
 * The short free-text "finding" a clinician records alongside a Ja/Nein answer
 * is PHI. Like clinical imprints, it is therefore held in an in-memory cache and
 * persisted EXCLUSIVELY through the encrypted workspace vault — never written to
 * plain localStorage. The non-PHI resolution (met/not_met) lives in the
 * clinician-attestation store, which feeds the deterministic evaluator.
 *
 * Section-neutral: notes are keyed by an opaque `questionId` and each record
 * carries its `sectionId`/`targetId`, so Medikation/Verlauf can reuse this store
 * unchanged.
 */

import { getActiveCaseId } from '../caseContext'
import type { ClinicalQuestionSectionId } from './types'

export interface ClinicalQuestionNote {
  questionId: string
  sectionId: ClinicalQuestionSectionId
  targetId: string
  /** PHI free-text finding. */
  note: string
  updatedAt: string
}

export type ClinicalQuestionNoteState = Record<string, ClinicalQuestionNote>

/** In-memory session cache — persisted only via the encrypted workspace vault. */
const noteCache = new Map<string, ClinicalQuestionNoteState>()

export type ClinicalQuestionNotePersistHook = (caseId: string) => void

let persistHook: ClinicalQuestionNotePersistHook | null = null

export function registerClinicalQuestionNotePersistHook(
  hook: ClinicalQuestionNotePersistHook | null,
): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadClinicalQuestionNoteState(caseId?: string): ClinicalQuestionNoteState {
  const resolved = resolveCaseId(caseId)
  const cached = noteCache.get(resolved)
  if (!cached) return {}
  return cached
}

export interface SetClinicalQuestionNoteInput {
  questionId: string
  sectionId: ClinicalQuestionSectionId
  targetId: string
  note: string
}

/**
 * Upsert a finding note. An empty/whitespace note clears the record (so a
 * cleared note never lingers as ciphertext). Triggers a vault re-save.
 */
export function setClinicalQuestionNote(
  input: SetClinicalQuestionNoteInput,
  caseId?: string,
): ClinicalQuestionNoteState {
  const resolved = resolveCaseId(caseId)
  const state = { ...loadClinicalQuestionNoteState(resolved) }
  const trimmed = input.note.trim()
  if (!trimmed) {
    delete state[input.questionId]
  } else {
    state[input.questionId] = {
      questionId: input.questionId,
      sectionId: input.sectionId,
      targetId: input.targetId,
      note: trimmed,
      updatedAt: new Date().toISOString(),
    }
  }
  noteCache.set(resolved, state)
  notifyPersist(resolved)
  return state
}

/** Remove a single note (e.g. when the clinician clears/re-opens the question). */
export function clearClinicalQuestionNote(questionId: string, caseId?: string): ClinicalQuestionNoteState {
  const resolved = resolveCaseId(caseId)
  const existing = loadClinicalQuestionNoteState(resolved)
  if (!existing[questionId]) return existing
  const state = { ...existing }
  delete state[questionId]
  noteCache.set(resolved, state)
  notifyPersist(resolved)
  return state
}

/** Apply a vault-restored note state WITHOUT re-triggering a save loop. */
export function applyClinicalQuestionNoteState(
  state: ClinicalQuestionNoteState | null | undefined,
  caseId?: string,
): void {
  if (!state) return
  noteCache.set(resolveCaseId(caseId), { ...state })
}

export function clearClinicalQuestionNoteCache(caseId?: string): void {
  if (caseId) {
    noteCache.delete(caseId)
    return
  }
  noteCache.clear()
}

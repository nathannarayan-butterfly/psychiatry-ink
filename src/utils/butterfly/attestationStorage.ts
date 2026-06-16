/**
 * Butterfly clinician attestations — the no-LLM bridge.
 *
 * When a criterion cannot be auto-derived from structured data, the clinician
 * can tick "erfüllt" / "nicht erfüllt" in the Butterfly panel. Those decisions
 * are stored per case and fed back into the deterministic evaluator (so the
 * verdict reflects clinician input, not a guess).
 *
 * Persistence mirrors the diagnosen archive: device-local `localStorage` as the
 * source of truth, also included in the encrypted workspace vault for sync. A
 * save schedules an ISDM rebuild so the persisted analysis + panel update.
 */

import type { AttestationMap, ClinicianAttestationValue } from '../diagnosisCriteria/context'

export interface ClinicianAttestationRecord {
  value: ClinicianAttestationValue
  attestedAt: string
}

export type ClinicianAttestationState = Record<string, ClinicianAttestationRecord>

function storageKey(caseId: string): string {
  return `butterfly-attestations:${caseId}`
}

export function loadAttestationState(caseId: string): ClinicianAttestationState {
  try {
    const raw = localStorage.getItem(storageKey(caseId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: ClinicianAttestationState = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === 'object' && 'value' in value) {
        const v = (value as ClinicianAttestationRecord).value
        if (v === 'met' || v === 'not_met') {
          out[key] = {
            value: v,
            attestedAt: (value as ClinicianAttestationRecord).attestedAt ?? new Date().toISOString(),
          }
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

/** Flat criterionId → value map consumed by the evaluator context. */
export function loadAttestations(caseId: string): AttestationMap {
  const state = loadAttestationState(caseId)
  const map: AttestationMap = {}
  for (const [criterionId, record] of Object.entries(state)) {
    map[criterionId] = record.value
  }
  return map
}

function persist(caseId: string, state: ClinicianAttestationState): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
  void import('../isdm').then(({ scheduleIsdmRebuild }) => {
    scheduleIsdmRebuild(caseId, 'attestation')
  })
}

/** Set (or clear, when `value` is null) a single criterion attestation. */
export function setAttestation(
  caseId: string,
  criterionId: string,
  value: ClinicianAttestationValue | null,
): ClinicianAttestationState {
  const state = loadAttestationState(caseId)
  if (value === null) {
    delete state[criterionId]
  } else {
    state[criterionId] = { value, attestedAt: new Date().toISOString() }
  }
  persist(caseId, state)
  return state
}

/** Apply a vault-restored attestation state without re-triggering a save loop. */
export function applyAttestationState(
  state: ClinicianAttestationState | null | undefined,
  caseId: string,
): void {
  if (!state) return
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(state))
  } catch {
    // ignore
  }
}

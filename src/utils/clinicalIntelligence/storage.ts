/**
 * Clinical Intelligence — per-case state persistence (localStorage).
 *
 * Each case gets its own state blob containing the latest run, rejected ids
 * and the audit trail. The store is intentionally local-first: CI does not
 * need server-side persistence in V1, and the de-identified evidence base it
 * consumes already lives in the workspace vault.
 */

import { safeGetItem, safeSetItem } from '../safeStorage'
import {
  ClinicalIntelligenceCaseStateSchema,
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceCaseState,
} from '../../types/clinicalIntelligence'

const STORAGE_KEY_BASE = 'psychiatry-ink:clinical-intelligence:case'
export const CLINICAL_INTELLIGENCE_CHANGED_EVENT = 'psychiatry-ink:clinical-intelligence-changed'

export interface ClinicalIntelligenceChangedDetail {
  caseId: string
  state: ClinicalIntelligenceCaseState
}

export function clinicalIntelligenceStorageKey(caseId: string): string {
  const trimmed = caseId.trim() || 'default'
  return `${STORAGE_KEY_BASE}:${trimmed}`
}

export function loadClinicalIntelligenceState(
  caseId: string,
): ClinicalIntelligenceCaseState {
  const raw = safeGetItem(clinicalIntelligenceStorageKey(caseId))
  if (!raw) return emptyClinicalIntelligenceCaseState(caseId)
  try {
    const parsed = ClinicalIntelligenceCaseStateSchema.safeParse(JSON.parse(raw) as unknown)
    if (parsed.success) return parsed.data
  } catch {
    // ignore — fall through to default
  }
  return emptyClinicalIntelligenceCaseState(caseId)
}

export function saveClinicalIntelligenceState(
  state: ClinicalIntelligenceCaseState,
): void {
  safeSetItem(
    clinicalIntelligenceStorageKey(state.caseId),
    JSON.stringify(state),
  )
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent<ClinicalIntelligenceChangedDetail>(
        CLINICAL_INTELLIGENCE_CHANGED_EVENT,
        { detail: { caseId: state.caseId, state } },
      ),
    )
  }
}

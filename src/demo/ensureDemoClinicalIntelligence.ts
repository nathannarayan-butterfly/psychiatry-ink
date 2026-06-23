/**
 * Restore pre-baked demo Clinical Intelligence when local state is missing a
 * displayable run, without overwriting a clinician's live pipeline result.
 */

import { buildDemoClinicalIntelligenceState } from './buildDemoClinicalIntelligence'
import { DEMO_CASE_ID } from './constants'
import { isDemoCase } from './demoReadOnly'
import {
  loadClinicalIntelligenceState,
  saveClinicalIntelligenceState,
} from '../utils/clinicalIntelligence/storage'
import { isDemoClinicalIntelligenceRun } from '../utils/clinicalIntelligence/localizeRunForDisplay'
import type { ClinicalIntelligenceCaseState } from '../types/clinicalIntelligence'

function hasDisplayableClinicalIntelligenceRun(state: ClinicalIntelligenceCaseState): boolean {
  const run = state.latestRun
  if (!run) return false
  return run.dimensional.activeDimensions.length > 0 || run.mechanism.activeMechanisms.length > 0
}

/** True when the clinician ran a live CI pipeline (not the pre-baked demo seed). */
export function hasClinicianConductedClinicalIntelligence(
  state: ClinicalIntelligenceCaseState,
): boolean {
  if (state.latestRun && !isDemoClinicalIntelligenceRun(state.latestRun)) {
    return true
  }
  return state.audit.some(
    (entry) =>
      entry.action === 'run-completed' &&
      entry.actor !== 'demo-seed' &&
      entry.targetKind === 'run',
  )
}

/**
 * Ensure the synthetic demo case has a displayable CI run when none exists.
 * Preserves clinician comments, discuss history, reject lists, and any live run.
 */
export function ensureDemoClinicalIntelligenceForCase(
  caseId: string,
  currentState?: ClinicalIntelligenceCaseState,
): ClinicalIntelligenceCaseState {
  if (!isDemoCase(caseId)) {
    return currentState ?? loadClinicalIntelligenceState(caseId)
  }

  const state = currentState ?? loadClinicalIntelligenceState(caseId)
  if (hasDisplayableClinicalIntelligenceRun(state)) return state
  if (hasClinicianConductedClinicalIntelligence(state)) return state

  const demo = buildDemoClinicalIntelligenceState()
  const merged: ClinicalIntelligenceCaseState = {
    ...demo,
    caseId: caseId.trim() || DEMO_CASE_ID,
    audit: [
      ...demo.audit,
      ...state.audit.filter(
        (entry) => !(entry.action === 'run-completed' && entry.actor === 'demo-seed'),
      ),
    ],
    clinicianComment: state.clinicianComment.trim()
      ? state.clinicianComment
      : demo.clinicianComment,
    discussMessages: state.discussMessages.length ? state.discussMessages : demo.discussMessages,
    rejectedDimensionIds: state.rejectedDimensionIds.length
      ? state.rejectedDimensionIds
      : demo.rejectedDimensionIds,
    rejectedMechanismIds: state.rejectedMechanismIds.length
      ? state.rejectedMechanismIds
      : demo.rejectedMechanismIds,
    savedAcceptedAt: state.savedAcceptedAt,
  }

  saveClinicalIntelligenceState(merged)
  return merged
}

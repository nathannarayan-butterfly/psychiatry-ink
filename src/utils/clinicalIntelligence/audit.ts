/**
 * Clinical Intelligence — audit trail helpers.
 *
 * Every accept / edit / reject of a CI finding (and every run lifecycle event)
 * is appended to a per-case audit log. The audit log is the only place CI
 * shows clinician decisions back to itself — rejected items must NOT be re-used
 * on the next run unless the clinician regenerates them.
 */

import type {
  CiAuditAction,
  CiAuditEntry,
  ClinicalIntelligenceCaseState,
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
  ClinicalIntelligenceRunResponse,
  DimensionalFinding,
  MechanismHypothesis,
} from '../../types/clinicalIntelligence'
import { emptyClinicalIntelligenceCaseState } from '../../types/clinicalIntelligence'

const MAX_AUDIT_ENTRIES = 500

function newAuditId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ci-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface AppendAuditInput {
  action: CiAuditAction
  targetKind: 'dimension' | 'mechanism' | 'run'
  targetId?: string
  notes?: string
  actor?: string
  timestamp?: string
}

export function appendAuditEntry(
  state: ClinicalIntelligenceCaseState,
  input: AppendAuditInput,
): ClinicalIntelligenceCaseState {
  const entry: CiAuditEntry = {
    id: newAuditId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    action: input.action,
    actor: input.actor ?? 'clinician',
    targetKind: input.targetKind,
    targetId: input.targetId ?? '',
    notes: input.notes ?? '',
  }
  const trimmed = [entry, ...state.audit].slice(0, MAX_AUDIT_ENTRIES)
  return { ...state, audit: trimmed }
}

export function recordRunStarted(
  state: ClinicalIntelligenceCaseState,
): ClinicalIntelligenceCaseState {
  return appendAuditEntry(state, {
    action: 'run-started',
    targetKind: 'run',
  })
}

export function recordRunCompleted(
  state: ClinicalIntelligenceCaseState,
  run: ClinicalIntelligenceRunResponse,
): ClinicalIntelligenceCaseState {
  return appendAuditEntry(state, {
    action: 'run-completed',
    targetKind: 'run',
    notes: `dimensions=${run.dimensional.activeDimensions.length}, mechanisms=${run.mechanism.activeMechanisms.length}`,
  })
}

export function recordRunFailed(
  state: ClinicalIntelligenceCaseState,
  reason: string,
): ClinicalIntelligenceCaseState {
  return appendAuditEntry(state, {
    action: 'run-failed',
    targetKind: 'run',
    notes: reason,
  })
}

export function recordEvidenceBaseMissing(
  state: ClinicalIntelligenceCaseState,
): ClinicalIntelligenceCaseState {
  return appendAuditEntry(state, {
    action: 'evidence-base-missing',
    targetKind: 'run',
  })
}

// ─── Dimension / mechanism review mutations ────────────────────────────────

function mapDimension(
  run: ClinicalIntelligenceRunResponse,
  dimensionId: ClinicalIntelligenceDimensionId,
  update: (finding: DimensionalFinding) => DimensionalFinding,
): ClinicalIntelligenceRunResponse {
  return {
    ...run,
    dimensional: {
      ...run.dimensional,
      activeDimensions: run.dimensional.activeDimensions.map((finding) =>
        finding.dimensionId === dimensionId ? update(finding) : finding,
      ),
    },
  }
}

function removeDimension(
  run: ClinicalIntelligenceRunResponse,
  dimensionId: ClinicalIntelligenceDimensionId,
): ClinicalIntelligenceRunResponse {
  return {
    ...run,
    dimensional: {
      ...run.dimensional,
      activeDimensions: run.dimensional.activeDimensions.filter(
        (finding) => finding.dimensionId !== dimensionId,
      ),
    },
  }
}

function mapMechanism(
  run: ClinicalIntelligenceRunResponse,
  mechanismId: ClinicalIntelligenceMechanismId,
  update: (finding: MechanismHypothesis) => MechanismHypothesis,
): ClinicalIntelligenceRunResponse {
  return {
    ...run,
    mechanism: {
      ...run.mechanism,
      activeMechanisms: run.mechanism.activeMechanisms.map((finding) =>
        finding.mechanismId === mechanismId ? update(finding) : finding,
      ),
    },
  }
}

function removeMechanism(
  run: ClinicalIntelligenceRunResponse,
  mechanismId: ClinicalIntelligenceMechanismId,
): ClinicalIntelligenceRunResponse {
  return {
    ...run,
    mechanism: {
      ...run.mechanism,
      activeMechanisms: run.mechanism.activeMechanisms.filter(
        (finding) => finding.mechanismId !== mechanismId,
      ),
    },
  }
}

export function acceptDimension(
  state: ClinicalIntelligenceCaseState,
  dimensionId: ClinicalIntelligenceDimensionId,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: mapDimension(state.latestRun, dimensionId, (finding) => ({
      ...finding,
      reviewStatus: 'accepted',
    })),
  }
  return appendAuditEntry(next, {
    action: 'dimension-accepted',
    targetKind: 'dimension',
    targetId: dimensionId,
  })
}

export function editDimension(
  state: ClinicalIntelligenceCaseState,
  dimensionId: ClinicalIntelligenceDimensionId,
  patch: Partial<Pick<DimensionalFinding, 'clinicalSummary' | 'longitudinalPattern' | 'uncertainty' | 'missingData' | 'severity' | 'confidence'>>,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: mapDimension(state.latestRun, dimensionId, (finding) => ({
      ...finding,
      ...patch,
      reviewStatus: 'edited',
    })),
  }
  const change = Object.keys(patch).join(',')
  return appendAuditEntry(next, {
    action: 'dimension-edited',
    targetKind: 'dimension',
    targetId: dimensionId,
    notes: change || 'edited',
  })
}

export function rejectDimension(
  state: ClinicalIntelligenceCaseState,
  dimensionId: ClinicalIntelligenceDimensionId,
  notes?: string,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const withRejected: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: removeDimension(state.latestRun, dimensionId),
    rejectedDimensionIds: state.rejectedDimensionIds.includes(dimensionId)
      ? state.rejectedDimensionIds
      : [...state.rejectedDimensionIds, dimensionId],
  }
  return appendAuditEntry(withRejected, {
    action: 'dimension-rejected',
    targetKind: 'dimension',
    targetId: dimensionId,
    notes: notes ?? '',
  })
}

/**
 * Bulk-accept every PENDING dimensional finding in the current run.
 *
 * Already accepted, edited or rejected findings are left untouched. Exploratory
 * items are not part of `activeDimensions` and therefore unaffected. Writes a
 * single `dimension-bulk-accepted` audit entry with the count of newly
 * accepted ids in `targetId` (comma-joined) and the total in `notes`.
 */
export function acceptAllPendingDimensions(
  state: ClinicalIntelligenceCaseState,
): { state: ClinicalIntelligenceCaseState; acceptedIds: ClinicalIntelligenceDimensionId[] } {
  if (!state.latestRun) return { state, acceptedIds: [] }
  const acceptedIds: ClinicalIntelligenceDimensionId[] = []
  const nextDims = state.latestRun.dimensional.activeDimensions.map((finding) => {
    if (finding.reviewStatus === 'pending') {
      acceptedIds.push(finding.dimensionId)
      return { ...finding, reviewStatus: 'accepted' as const }
    }
    return finding
  })
  if (acceptedIds.length === 0) return { state, acceptedIds }
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: {
      ...state.latestRun,
      dimensional: {
        ...state.latestRun.dimensional,
        activeDimensions: nextDims,
      },
    },
  }
  const withAudit = appendAuditEntry(next, {
    action: 'dimension-bulk-accepted',
    targetKind: 'dimension',
    targetId: acceptedIds.join(','),
    notes: `count=${acceptedIds.length}`,
  })
  return { state: withAudit, acceptedIds }
}

export function acceptMechanism(
  state: ClinicalIntelligenceCaseState,
  mechanismId: ClinicalIntelligenceMechanismId,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: mapMechanism(state.latestRun, mechanismId, (finding) => ({
      ...finding,
      reviewStatus: 'accepted',
    })),
  }
  return appendAuditEntry(next, {
    action: 'mechanism-accepted',
    targetKind: 'mechanism',
    targetId: mechanismId,
  })
}

export function editMechanism(
  state: ClinicalIntelligenceCaseState,
  mechanismId: ClinicalIntelligenceMechanismId,
  patch: Partial<Pick<MechanismHypothesis, 'clinicalImplication' | 'treatmentRelevance' | 'uncertainty' | 'confidence'>>,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: mapMechanism(state.latestRun, mechanismId, (finding) => ({
      ...finding,
      ...patch,
      reviewStatus: 'edited',
    })),
  }
  const change = Object.keys(patch).join(',')
  return appendAuditEntry(next, {
    action: 'mechanism-edited',
    targetKind: 'mechanism',
    targetId: mechanismId,
    notes: change || 'edited',
  })
}

export function rejectMechanism(
  state: ClinicalIntelligenceCaseState,
  mechanismId: ClinicalIntelligenceMechanismId,
  notes?: string,
): ClinicalIntelligenceCaseState {
  if (!state.latestRun) return state
  const withRejected: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: removeMechanism(state.latestRun, mechanismId),
    rejectedMechanismIds: state.rejectedMechanismIds.includes(mechanismId)
      ? state.rejectedMechanismIds
      : [...state.rejectedMechanismIds, mechanismId],
  }
  return appendAuditEntry(withRejected, {
    action: 'mechanism-rejected',
    targetKind: 'mechanism',
    targetId: mechanismId,
    notes: notes ?? '',
  })
}

/**
 * Bulk-accept every PENDING mechanism hypothesis. Mirrors
 * {@link acceptAllPendingDimensions}.
 */
export function acceptAllPendingMechanisms(
  state: ClinicalIntelligenceCaseState,
): { state: ClinicalIntelligenceCaseState; acceptedIds: ClinicalIntelligenceMechanismId[] } {
  if (!state.latestRun) return { state, acceptedIds: [] }
  const acceptedIds: ClinicalIntelligenceMechanismId[] = []
  const nextMechs = state.latestRun.mechanism.activeMechanisms.map((finding) => {
    if (finding.reviewStatus === 'pending') {
      acceptedIds.push(finding.mechanismId)
      return { ...finding, reviewStatus: 'accepted' as const }
    }
    return finding
  })
  if (acceptedIds.length === 0) return { state, acceptedIds }
  const next: ClinicalIntelligenceCaseState = {
    ...state,
    latestRun: {
      ...state.latestRun,
      mechanism: {
        ...state.latestRun.mechanism,
        activeMechanisms: nextMechs,
      },
    },
  }
  const withAudit = appendAuditEntry(next, {
    action: 'mechanism-bulk-accepted',
    targetKind: 'mechanism',
    targetId: acceptedIds.join(','),
    notes: `count=${acceptedIds.length}`,
  })
  return { state: withAudit, acceptedIds }
}

export function applyRunResult(
  state: ClinicalIntelligenceCaseState,
  run: ClinicalIntelligenceRunResponse,
): ClinicalIntelligenceCaseState {
  return recordRunCompleted({ ...state, latestRun: run }, run)
}

export function freshClinicalIntelligenceState(
  caseId: string,
): ClinicalIntelligenceCaseState {
  return emptyClinicalIntelligenceCaseState(caseId)
}

export function saveClinicianComment(
  state: ClinicalIntelligenceCaseState,
  comment: string,
): ClinicalIntelligenceCaseState {
  const trimmed = comment.trim().slice(0, 2_000)
  const next = { ...state, clinicianComment: trimmed }
  return appendAuditEntry(next, {
    action: 'clinician-comment-saved',
    targetKind: 'run',
    notes: trimmed ? `chars=${trimmed.length}` : 'cleared',
  })
}

export function saveAcceptedFindings(
  state: ClinicalIntelligenceCaseState,
  savedAt?: string,
): ClinicalIntelligenceCaseState {
  const timestamp = savedAt ?? new Date().toISOString()
  const next = {
    ...state,
    savedAcceptedAt: timestamp,
  }
  const run = state.latestRun
  const dimCount = run
    ? run.dimensional.activeDimensions.filter(
        (d) => d.reviewStatus === 'accepted' || d.reviewStatus === 'edited',
      ).length
    : 0
  const mechCount = run
    ? run.mechanism.activeMechanisms.filter(
        (m) => m.reviewStatus === 'accepted' || m.reviewStatus === 'edited',
      ).length
    : 0
  return appendAuditEntry(next, {
    action: 'accepted-findings-saved',
    targetKind: 'run',
    notes: `dimensions=${dimCount}, mechanisms=${mechCount}`,
  })
}

export function setDiscussMessages(
  state: ClinicalIntelligenceCaseState,
  messages: ClinicalIntelligenceCaseState['discussMessages'],
): ClinicalIntelligenceCaseState {
  return { ...state, discussMessages: messages.slice(-80) }
}

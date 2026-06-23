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
  CiAuditEntrySchema,
  CiDiscussMessageSchema,
  CLINICAL_INTELLIGENCE_DIMENSION_IDS,
  CLINICAL_INTELLIGENCE_MECHANISM_IDS,
  ClinicalIntelligenceCaseStateSchema,
  ClinicalIntelligenceRunResponseSchema,
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceCaseState,
  type ClinicalIntelligenceDimensionId,
  type ClinicalIntelligenceMechanismId,
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

function parseDimensionIds(value: unknown): ClinicalIntelligenceDimensionId[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(CLINICAL_INTELLIGENCE_DIMENSION_IDS)
  return value.filter(
    (id): id is ClinicalIntelligenceDimensionId =>
      typeof id === 'string' && allowed.has(id),
  )
}

function parseMechanismIds(value: unknown): ClinicalIntelligenceMechanismId[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(CLINICAL_INTELLIGENCE_MECHANISM_IDS)
  return value.filter(
    (id): id is ClinicalIntelligenceMechanismId =>
      typeof id === 'string' && allowed.has(id),
  )
}

/** Recover a usable run when the outer persisted state fails schema validation. */
export function salvageClinicalIntelligenceStateFromRaw(
  caseId: string,
  json: unknown,
): ClinicalIntelligenceCaseState | null {
  if (!json || typeof json !== 'object') return null
  const record = json as Record<string, unknown>

  const runParsed = ClinicalIntelligenceRunResponseSchema.safeParse(record.latestRun)
  if (!runParsed.success) return null

  const base = emptyClinicalIntelligenceCaseState(caseId)
  const audit: ClinicalIntelligenceCaseState['audit'] = []
  if (Array.isArray(record.audit)) {
    for (const entry of record.audit) {
      const parsed = CiAuditEntrySchema.safeParse(entry)
      if (parsed.success) audit.push(parsed.data)
    }
  }

  const discussMessages: ClinicalIntelligenceCaseState['discussMessages'] = []
  if (Array.isArray(record.discussMessages)) {
    for (const entry of record.discussMessages) {
      const parsed = CiDiscussMessageSchema.safeParse(entry)
      if (parsed.success) discussMessages.push(parsed.data)
    }
  }

  return {
    ...base,
    latestRun: runParsed.data,
    rejectedDimensionIds: parseDimensionIds(record.rejectedDimensionIds),
    rejectedMechanismIds: parseMechanismIds(record.rejectedMechanismIds),
    audit,
    clinicianComment:
      typeof record.clinicianComment === 'string'
        ? record.clinicianComment.slice(0, 2_000)
        : '',
    discussMessages,
    savedAcceptedAt:
      typeof record.savedAcceptedAt === 'string' ? record.savedAcceptedAt.slice(0, 40) : null,
  }
}

export function loadClinicalIntelligenceState(
  caseId: string,
): ClinicalIntelligenceCaseState {
  const raw = safeGetItem(clinicalIntelligenceStorageKey(caseId))
  if (!raw) return emptyClinicalIntelligenceCaseState(caseId)
  try {
    const json = JSON.parse(raw) as unknown
    const parsed = ClinicalIntelligenceCaseStateSchema.safeParse(json)
    if (parsed.success) return parsed.data
    const salvaged = salvageClinicalIntelligenceStateFromRaw(caseId, json)
    if (salvaged) return salvaged
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

import type {
  LabCorrelationFindingStatus,
  LabMedicationCorrelationStore,
  PatientMedicationLabCorrelationFinding,
} from '../../types/labMedicationCorrelation'
import { LAB_MED_CORRELATION_STORE_VERSION } from '../../types/labMedicationCorrelation'

const CLINICIAN_LOCKED_STATUSES = new Set<LabCorrelationFindingStatus>([
  'accepted',
  'rejected',
  'not_relevant',
  'pending_clinician_review',
])

/** Findings the clinician has resolved must survive automated re-runs. */
export function shouldPreserveLabMedCorrelationFinding(
  existing: PatientMedicationLabCorrelationFinding,
): boolean {
  if (CLINICIAN_LOCKED_STATUSES.has(existing.status)) return true
  if (existing.source === 'clinician_accepted') return true
  if (existing.clinicianNote?.trim()) return true
  return false
}

/** Befunde, die in der Labor-Medikament-Korrelation angezeigt werden. */
export function filterVisibleLabMedCorrelationFindings(
  findings: PatientMedicationLabCorrelationFinding[],
): PatientMedicationLabCorrelationFinding[] {
  return findings.filter((f) => f.status !== 'rejected' && f.status !== 'not_relevant')
}

const LS_PREFIX = 'psychiatry-ink:lab-med-correlations:'

const cache = new Map<string, LabMedicationCorrelationStore>()

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function emptyStore(caseId: string): LabMedicationCorrelationStore {
  return {
    version: LAB_MED_CORRELATION_STORE_VERSION,
    caseId,
    updatedAt: new Date().toISOString(),
    findings: [],
    aiRuns: [],
    kbSubmissionCandidates: [],
  }
}

export function loadLabMedCorrelationStore(caseId: string): LabMedicationCorrelationStore {
  const cached = cache.get(caseId)
  if (cached) return cached

  try {
    const raw = localStorage.getItem(lsKey(caseId))
    if (raw) {
      const parsed = JSON.parse(raw) as LabMedicationCorrelationStore
      const store: LabMedicationCorrelationStore = {
        ...emptyStore(caseId),
        ...parsed,
        version: LAB_MED_CORRELATION_STORE_VERSION,
        caseId,
      }
      cache.set(caseId, store)
      return store
    }
  } catch {
    // ignore corrupt storage
  }

  const fresh = emptyStore(caseId)
  cache.set(caseId, fresh)
  return fresh
}

export function saveLabMedCorrelationStore(store: LabMedicationCorrelationStore): void {
  const stamped: LabMedicationCorrelationStore = {
    ...store,
    version: LAB_MED_CORRELATION_STORE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  cache.set(store.caseId, stamped)
  try {
    localStorage.setItem(lsKey(store.caseId), JSON.stringify(stamped))
  } catch {
    // quota / private mode
  }
}

export function mergeLabMedCorrelationRunResult(
  caseId: string,
  findings: LabMedicationCorrelationStore['findings'],
  aiRuns: LabMedicationCorrelationStore['aiRuns'],
): LabMedicationCorrelationStore {
  const store = loadLabMedCorrelationStore(caseId)
  const findingByKey = new Map(store.findings.map((f) => [f.correlationKey, f]))
  for (const incoming of findings) {
    const existing = findingByKey.get(incoming.correlationKey)
    if (!existing) {
      findingByKey.set(incoming.correlationKey, incoming)
      continue
    }
    if (shouldPreserveLabMedCorrelationFinding(existing)) {
      continue
    }
    if (incoming.updatedAt >= existing.updatedAt) {
      findingByKey.set(incoming.correlationKey, incoming)
    }
  }

  const runById = new Map(store.aiRuns.map((r) => [r.id, r]))
  for (const run of aiRuns) {
    runById.set(run.id, run)
  }

  const next: LabMedicationCorrelationStore = {
    ...store,
    findings: [...findingByKey.values()].sort((a, b) => a.correlationKey.localeCompare(b.correlationKey)),
    aiRuns: [...runById.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }
  saveLabMedCorrelationStore(next)
  return next
}

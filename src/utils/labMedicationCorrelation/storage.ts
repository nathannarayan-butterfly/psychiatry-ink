import type { LabMedicationCorrelationStore } from '../../types/labMedicationCorrelation'
import { LAB_MED_CORRELATION_STORE_VERSION } from '../../types/labMedicationCorrelation'

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
  for (const finding of findings) {
    const existing = findingByKey.get(finding.correlationKey)
    if (!existing || finding.updatedAt >= existing.updatedAt) {
      findingByKey.set(finding.correlationKey, finding)
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

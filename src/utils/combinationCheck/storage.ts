import type {
  CombinationCheckStore,
  CombinationFindingStatus,
  PatientCombinationCheckFinding,
} from '../../types/combinationCheck'
import { COMBINATION_CHECK_STORE_VERSION } from '../../types/combinationCheck'

const CLINICIAN_LOCKED_STATUSES = new Set<CombinationFindingStatus>([
  'accepted',
  'not_relevant',
  'pending_clinician_review',
])

/** Findings the clinician has resolved or annotated must survive automated re-runs. */
export function shouldPreserveCombinationFinding(
  existing: PatientCombinationCheckFinding,
): boolean {
  if (CLINICIAN_LOCKED_STATUSES.has(existing.status)) return true
  if (existing.source === 'clinician_accepted') return true
  if (existing.clinicianNote?.trim()) return true
  return false
}

/** One run may return both a KB hit and an AI pending row for the same pair — keep the review row. */
export function dedupeIncomingCombinationFindings(
  findings: PatientCombinationCheckFinding[],
): PatientCombinationCheckFinding[] {
  const byKey = new Map<string, PatientCombinationCheckFinding>()
  for (const finding of findings) {
    const key = finding.combinationKey
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, finding)
      continue
    }
    if (finding.status === 'pending_clinician_review' && prev.status === 'verified_kb') {
      byKey.set(key, finding)
      continue
    }
    if (prev.status === 'pending_clinician_review' && finding.status === 'verified_kb') {
      continue
    }
    if (finding.updatedAt >= prev.updatedAt) {
      byKey.set(key, finding)
    }
  }
  return [...byKey.values()]
}

export function mergeCombinationFindingPair(
  existing: PatientCombinationCheckFinding,
  incoming: PatientCombinationCheckFinding,
): PatientCombinationCheckFinding {
  const carryNote = incoming.clinicianNote?.trim() ? incoming.clinicianNote : existing.clinicianNote

  if (existing.source === 'clinician_accepted' || existing.status === 'accepted') {
    return {
      ...existing,
      clinicianNote: carryNote,
      isRelevant: incoming.isRelevant ?? existing.isRelevant,
      updatedAt: incoming.updatedAt,
    }
  }

  return {
    ...incoming,
    id: existing.id,
    createdAt: existing.createdAt,
    clinicianNote: carryNote,
    isRelevant: incoming.isRelevant ?? existing.isRelevant,
  }
}

const LS_PREFIX = 'psychiatry-ink:combination-findings:'

const cache = new Map<string, CombinationCheckStore>()

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function emptyStore(caseId: string): CombinationCheckStore {
  return {
    version: COMBINATION_CHECK_STORE_VERSION,
    caseId,
    updatedAt: new Date().toISOString(),
    findings: [],
    aiRuns: [],
    kbSubmissionCandidates: [],
  }
}

export function loadCombinationCheckStore(caseId: string): CombinationCheckStore {
  const cached = cache.get(caseId)
  if (cached) return cached

  try {
    const raw = localStorage.getItem(lsKey(caseId))
    if (raw) {
      const parsed = JSON.parse(raw) as CombinationCheckStore
      const store: CombinationCheckStore = {
        ...emptyStore(caseId),
        ...parsed,
        version: COMBINATION_CHECK_STORE_VERSION,
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

export function saveCombinationCheckStore(store: CombinationCheckStore): void {
  const stamped: CombinationCheckStore = {
    ...store,
    version: COMBINATION_CHECK_STORE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  cache.set(store.caseId, stamped)
  try {
    localStorage.setItem(lsKey(store.caseId), JSON.stringify(stamped))
  } catch {
    // quota / private mode
  }
}

export function mergeCombinationCheckRunResult(
  caseId: string,
  findings: CombinationCheckStore['findings'],
  aiRuns: CombinationCheckStore['aiRuns'],
): CombinationCheckStore {
  const store = loadCombinationCheckStore(caseId)
  const findingByKey = new Map(store.findings.map((f) => [f.combinationKey, f]))
  const thoroughKeys = new Set(
    aiRuns.filter((run) => run.thorough).map((run) => run.combinationKey),
  )

  for (const incoming of dedupeIncomingCombinationFindings(findings)) {
    const existing = findingByKey.get(incoming.combinationKey)
    if (!existing) {
      findingByKey.set(incoming.combinationKey, incoming)
      continue
    }
    if (shouldPreserveCombinationFinding(existing)) {
      if (
        existing.status === 'pending_clinician_review' &&
        thoroughKeys.has(incoming.combinationKey)
      ) {
        findingByKey.set(
          incoming.combinationKey,
          mergeCombinationFindingPair(existing, incoming),
        )
      }
      continue
    }
    findingByKey.set(incoming.combinationKey, mergeCombinationFindingPair(existing, incoming))
  }

  const runById = new Map(store.aiRuns.map((r) => [r.id, r]))
  for (const run of aiRuns) {
    runById.set(run.id, run)
  }

  const next: CombinationCheckStore = {
    ...store,
    findings: [...findingByKey.values()].sort((a, b) => a.combinationKey.localeCompare(b.combinationKey)),
    aiRuns: [...runById.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }
  saveCombinationCheckStore(next)
  return next
}

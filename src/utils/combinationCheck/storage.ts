import type { CombinationCheckStore } from '../../types/combinationCheck'
import { COMBINATION_CHECK_STORE_VERSION } from '../../types/combinationCheck'

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
  for (const finding of findings) {
    const existing = findingByKey.get(finding.combinationKey)
    if (!existing || finding.updatedAt >= existing.updatedAt) {
      findingByKey.set(finding.combinationKey, finding)
    }
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

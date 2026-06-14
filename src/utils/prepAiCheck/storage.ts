import type { PrepAiCheckResponse } from '../../types/prepAiCheck'

const LS_PREFIX = 'psychiatry-ink:prep-ai-cache:'

const cache = new Map<string, PrepAiCheckCache>()

export interface PrepAiCheckCacheEntry {
  medicationId: string
  substance: string
  response: PrepAiCheckResponse
  cachedAt: string
}

export interface PrepAiCheckCache {
  version: 1
  caseId: string
  updatedAt: string
  entries: PrepAiCheckCacheEntry[]
}

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function emptyCache(caseId: string): PrepAiCheckCache {
  return {
    version: 1,
    caseId,
    updatedAt: new Date().toISOString(),
    entries: [],
  }
}

export function loadPrepAiCheckCache(caseId: string): PrepAiCheckCache {
  const cached = cache.get(caseId)
  if (cached) return cached

  try {
    const raw = localStorage.getItem(lsKey(caseId))
    if (raw) {
      const parsed = JSON.parse(raw) as PrepAiCheckCache
      const store: PrepAiCheckCache = {
        ...emptyCache(caseId),
        ...parsed,
        version: 1,
        caseId,
      }
      cache.set(caseId, store)
      return store
    }
  } catch {
    // ignore corrupt storage
  }

  const fresh = emptyCache(caseId)
  cache.set(caseId, fresh)
  return fresh
}

export function savePrepAiCheckCache(store: PrepAiCheckCache): void {
  const stamped: PrepAiCheckCache = {
    ...store,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  cache.set(store.caseId, stamped)
  try {
    localStorage.setItem(lsKey(store.caseId), JSON.stringify(stamped))
  } catch {
    // quota / private mode
  }
}

export function upsertPrepAiCheckCacheEntry(
  caseId: string,
  entry: PrepAiCheckCacheEntry,
): PrepAiCheckCache {
  const store = loadPrepAiCheckCache(caseId)
  const byMedId = new Map(store.entries.map((e) => [e.medicationId, e]))
  byMedId.set(entry.medicationId, entry)
  const next: PrepAiCheckCache = {
    ...store,
    entries: [...byMedId.values()].sort((a, b) => a.substance.localeCompare(b.substance)),
  }
  savePrepAiCheckCache(next)
  return next
}

export function getPrepAiCheckCachedResponse(
  caseId: string,
  medicationId: string,
): PrepAiCheckResponse | null {
  const store = loadPrepAiCheckCache(caseId)
  return store.entries.find((e) => e.medicationId === medicationId)?.response ?? null
}

export function applyPrepAiCheckCache(store: PrepAiCheckCache, caseId?: string): void {
  const id = caseId ?? store.caseId
  savePrepAiCheckCache({ ...store, caseId: id })
}

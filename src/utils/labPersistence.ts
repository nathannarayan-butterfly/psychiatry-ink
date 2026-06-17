import type { LabSnapshot, SavedLabGraph } from '../types/lab'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { scheduleLabGraphImprints } from './clinicalImprint'
import { safeSetItem } from './safeStorage'

const STORAGE_KEY = 'psychiatry-ink-lab-session'
const LAB_GRAPHS_KEY = 'psychiatry-ink:lab-graphs'
const ACTIVE_LAB_GRAPH_KEY = 'psychiatry-ink:active-lab-graph-id'

function labSessionKey(caseId?: string): string {
  return caseStorageKey(STORAGE_KEY, caseId)
}

function labGraphsListKey(caseId?: string): string {
  return caseStorageKey(LAB_GRAPHS_KEY, caseId)
}

function activeLabGraphKey(caseId?: string): string {
  return caseStorageKey(ACTIVE_LAB_GRAPH_KEY, caseId)
}

function normalizeLabSnapshot(raw: Partial<LabSnapshot>): LabSnapshot | null {
  if (!Array.isArray(raw.entries) || !Array.isArray(raw.markers)) return null
  return {
    entries: raw.entries,
    markers: raw.markers,
    selectedParameter: raw.selectedParameter ?? null,
    dateRangePreset: raw.dateRangePreset ?? 'all',
  }
}

function normalizeSavedLabGraph(raw: Partial<SavedLabGraph>, fallbackTitle: string): SavedLabGraph | null {
  if (!raw.id || typeof raw.id !== 'string') return null
  const snapshot = normalizeLabSnapshot(raw)
  if (!snapshot) return null
  return {
    id: raw.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallbackTitle,
    entries: snapshot.entries,
    markers: snapshot.markers,
    selectedParameter: snapshot.selectedParameter,
    dateRangePreset: snapshot.dateRangePreset,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

function migrateLegacySession(caseId?: string): SavedLabGraph[] {
  try {
    let raw = localStorage.getItem(labSessionKey(caseId))
    if (!raw && (caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      raw = localStorage.getItem(STORAGE_KEY)
    }
    if (!raw) return []
    const parsed = JSON.parse(raw) as LabSnapshot
    const snapshot = normalizeLabSnapshot(parsed)
    if (!snapshot) return []
    const migrated: SavedLabGraph = {
      id: crypto.randomUUID(),
      title: 'Labor 1',
      ...snapshot,
      updatedAt: new Date().toISOString(),
    }
    saveLabGraphsList([migrated], caseId)
    setActiveLabGraphId(migrated.id, caseId)
    try {
      localStorage.removeItem(labSessionKey(caseId))
      if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    return [migrated]
  } catch {
    return []
  }
}

export function loadLabGraphsList(caseId?: string): SavedLabGraph[] {
  try {
    const raw = localStorage.getItem(labGraphsListKey(caseId))
    if (!raw) return migrateLegacySession(caseId)
    const parsed = JSON.parse(raw) as Partial<SavedLabGraph>[]
    if (!Array.isArray(parsed)) return migrateLegacySession(caseId)
    const graphs = parsed
      .map((item, index) => normalizeSavedLabGraph(item, `Labor ${index + 1}`))
      .filter((item): item is SavedLabGraph => item !== null)
    return graphs.length > 0 ? graphs : migrateLegacySession(caseId)
  } catch {
    return migrateLegacySession(caseId)
  }
}

export function saveLabGraphsList(graphs: SavedLabGraph[], caseId?: string): void {
  safeSetItem(labGraphsListKey(caseId), JSON.stringify(graphs))
  scheduleLabGraphImprints(caseId ?? getActiveCaseId(), graphs)
}

export function getActiveLabGraphId(caseId?: string): string | null {
  try {
    return localStorage.getItem(activeLabGraphKey(caseId))
  } catch {
    return null
  }
}

export function setActiveLabGraphId(graphId: string | null, caseId?: string): void {
  try {
    if (graphId) {
      localStorage.setItem(activeLabGraphKey(caseId), graphId)
    } else {
      localStorage.removeItem(activeLabGraphKey(caseId))
    }
  } catch {
    // ignore
  }
}

export function countLabGraphs(caseId?: string): number {
  return loadLabGraphsList(caseId).length
}

export function loadLabSession(caseId?: string): LabSnapshot | null {
  const graphs = loadLabGraphsList(caseId)
  const activeId = getActiveLabGraphId(caseId)
  const active = activeId ? graphs.find((item) => item.id === activeId) : graphs[0]
  if (!active) return null
  return {
    entries: active.entries,
    markers: active.markers,
    selectedParameter: active.selectedParameter,
    dateRangePreset: active.dateRangePreset,
  }
}

export function saveLabSession(snapshot: LabSnapshot, caseId?: string): void {
  const graphs = loadLabGraphsList(caseId)
  const activeId = getActiveLabGraphId(caseId) ?? graphs[0]?.id
  if (!activeId) {
    const created: SavedLabGraph = {
      id: crypto.randomUUID(),
      title: 'Labor 1',
      ...snapshot,
      updatedAt: new Date().toISOString(),
    }
    saveLabGraphsList([created], caseId)
    setActiveLabGraphId(created.id, caseId)
    return
  }

  const next = graphs.map((item) =>
    item.id === activeId
      ? {
          ...item,
          ...snapshot,
          updatedAt: new Date().toISOString(),
        }
      : item,
  )
  if (!next.some((item) => item.id === activeId)) {
    next.push({
      id: activeId,
      title: `Labor ${next.length + 1}`,
      ...snapshot,
      updatedAt: new Date().toISOString(),
    })
  }
  saveLabGraphsList(next, caseId)
  setActiveLabGraphId(activeId, caseId)
}

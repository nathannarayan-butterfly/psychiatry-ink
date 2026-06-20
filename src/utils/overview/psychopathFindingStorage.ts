import type { PsychopathFindingEntry, PsychopathFindingState } from '../../types/psychopathFinding'
import { PSYCHOPATH_FINDING_STATE_VERSION } from '../../types/psychopathFinding'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'

const LS_PREFIX = 'psychiatry-ink:psychopath-finding:'

const findingCache = new Map<string, PsychopathFindingState>()
const localShadow = new Map<string, PsychopathFindingState>()

export type PsychopathFindingPersistHook = (caseId: string) => void
type PsychopathFindingListener = (caseId: string) => void

let persistHook: PsychopathFindingPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<PsychopathFindingListener>()

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

function emptyState(): PsychopathFindingState {
  return {
    version: PSYCHOPATH_FINDING_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    current: null,
    history: [],
  }
}

function isValidEntry(value: unknown): value is PsychopathFindingEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.date === 'string' &&
    typeof entry.text === 'string' &&
    typeof entry.source === 'string' &&
    typeof entry.savedAt === 'string'
  )
}

function normalizeState(raw: PsychopathFindingState | null | undefined): PsychopathFindingState {
  if (!raw || raw.version !== PSYCHOPATH_FINDING_STATE_VERSION) return emptyState()
  const current = raw.current && isValidEntry(raw.current) ? raw.current : null
  const history = Array.isArray(raw.history) ? raw.history.filter(isValidEntry) : []
  const aiStructured =
    raw.aiStructured &&
    typeof raw.aiStructured === 'object' &&
    (raw.aiStructured as { version?: unknown }).version === 1
      ? (raw.aiStructured as PsychopathFindingState['aiStructured'])
      : null
  return {
    version: PSYCHOPATH_FINDING_STATE_VERSION,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    current,
    history,
    aiStructured,
  }
}

function writeLocalStorage(caseId: string, state: PsychopathFindingState): void {
  localShadow.set(caseId, state)
  void writeEncryptedJson(lsKey(caseId), state)
}

function readLocalStorage(caseId: string): PsychopathFindingState | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribePsychopathFinding(listener: PsychopathFindingListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerPsychopathFindingPersistHook(hook: PsychopathFindingPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

export async function hydratePsychopathFindingFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<PsychopathFindingState>(lsKey(resolved))
    if (!persisted) return
    const normalized = normalizeState(persisted)
    localShadow.set(resolved, normalized)
    if (!findingCache.has(resolved)) findingCache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // Best-effort hydration.
  }
}

/** Whether psychopath finding state has content worth vault persistence. */
export function shouldPersistPsychopathFindingState(state: PsychopathFindingState): boolean {
  return Boolean(
    state.current?.text?.trim() ||
      state.history.length > 0 ||
      state.aiStructured?.sourceTextHash,
  )
}

export function loadPsychopathFindingState(caseId?: string): PsychopathFindingState {
  const resolved = resolveCaseId(caseId)
  const cached = findingCache.get(resolved)
  if (cached) return cached

  const persisted = readLocalStorage(resolved)
  if (persisted) {
    const normalized = normalizeState(persisted)
    findingCache.set(resolved, normalized)
    return normalized
  }

  const empty = emptyState()
  findingCache.set(resolved, empty)
  return empty
}

export function savePsychopathFindingState(state: PsychopathFindingState, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const stamped: PsychopathFindingState = {
    ...normalizeState(state),
    version: PSYCHOPATH_FINDING_STATE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  findingCache.set(resolved, stamped)
  writeLocalStorage(resolved, stamped)
  notifyListeners(resolved)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyPsychopathFindingState(
  state: PsychopathFindingState | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!state) return

  const normalized = normalizeState(state)
  const local = readLocalStorage(resolved)
  const vaultTime = normalized.updatedAt ? new Date(normalized.updatedAt).getTime() : 0
  const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0

  if (vaultTime >= localTime) {
    findingCache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else if (local) {
    findingCache.set(resolved, normalizeState(local))
  }

  notifyListeners(resolved)
}

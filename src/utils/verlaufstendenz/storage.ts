import {
  VERLAUFSTENDENZ_STATE_VERSION,
  type VerlaufstendenzClinicianOverride,
  type VerlaufstendenzComputed,
  type VerlaufstendenzState,
  type VerlaufstendenzTrend,
  type VerlaufstendenzWindowPreset,
} from '../../types/verlaufstendenz'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'

const LS_PREFIX = 'psychiatry-ink:verlaufstendenz:'

const stateCache = new Map<string, VerlaufstendenzState>()
const localShadow = new Map<string, VerlaufstendenzState>()

export type VerlaufstendenzPersistHook = (caseId: string) => void
type VerlaufstendenzListener = (caseId: string) => void

let persistHook: VerlaufstendenzPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<VerlaufstendenzListener>()

const VALID_TRENDS: VerlaufstendenzTrend[] = [
  'deutlich_gebessert',
  'leicht_gebessert',
  'stabil',
  'schwankend',
  'leicht_verschlechtert',
  'deutlich_verschlechtert',
  'kritisch_handlungsrelevant',
  'nicht_beurteilbar',
]

const VALID_WINDOWS: VerlaufstendenzWindowPreset[] = ['7d', '14d', 'admission', 'custom']

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

function emptyState(): VerlaufstendenzState {
  return {
    version: VERLAUFSTENDENZ_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    windowPreset: '14d',
    draft: null,
    approved: null,
  }
}

function isValidTrend(value: unknown): value is VerlaufstendenzTrend {
  return typeof value === 'string' && VALID_TRENDS.includes(value as VerlaufstendenzTrend)
}

function isValidWindow(value: unknown): value is VerlaufstendenzWindowPreset {
  return typeof value === 'string' && VALID_WINDOWS.includes(value as VerlaufstendenzWindowPreset)
}

function isValidComputed(value: unknown): value is VerlaufstendenzComputed {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isValidTrend(v.trend) && typeof v.rationaleSentence === 'string'
}

function isValidOverride(value: unknown): value is VerlaufstendenzClinicianOverride {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    isValidTrend(v.trend) &&
    typeof v.rationaleSentence === 'string' &&
    typeof v.acceptedAt === 'string' &&
    isValidWindow(v.windowPreset)
  )
}

function normalizeState(raw: VerlaufstendenzState | null | undefined): VerlaufstendenzState {
  if (!raw || raw.version !== VERLAUFSTENDENZ_STATE_VERSION) return emptyState()
  return {
    version: VERLAUFSTENDENZ_STATE_VERSION,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    windowPreset: isValidWindow(raw.windowPreset) ? raw.windowPreset : '14d',
    customWindowStart: typeof raw.customWindowStart === 'string' ? raw.customWindowStart : undefined,
    customWindowEnd: typeof raw.customWindowEnd === 'string' ? raw.customWindowEnd : undefined,
    draft: isValidComputed(raw.draft) ? raw.draft : null,
    approved: isValidOverride(raw.approved) ? raw.approved : null,
  }
}

function writeLocalStorage(caseId: string, state: VerlaufstendenzState): void {
  localShadow.set(caseId, state)
  void writeEncryptedJson(lsKey(caseId), state)
}

function readLocalStorage(caseId: string): VerlaufstendenzState | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeVerlaufstendenz(listener: VerlaufstendenzListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerVerlaufstendenzPersistHook(hook: VerlaufstendenzPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

export async function hydrateVerlaufstendenzFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<VerlaufstendenzState>(lsKey(resolved))
    if (!persisted) return
    const normalized = normalizeState(persisted)
    localShadow.set(resolved, normalized)
    if (!stateCache.has(resolved)) stateCache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // Best-effort hydration.
  }
}

export function shouldPersistVerlaufstendenzState(state: VerlaufstendenzState): boolean {
  return Boolean(state.approved || state.draft)
}

export function loadVerlaufstendenzState(caseId?: string): VerlaufstendenzState {
  const resolved = resolveCaseId(caseId)
  const cached = stateCache.get(resolved)
  if (cached) return cached

  const persisted = readLocalStorage(resolved)
  if (persisted) {
    const normalized = normalizeState(persisted)
    stateCache.set(resolved, normalized)
    return normalized
  }

  const empty = emptyState()
  stateCache.set(resolved, empty)
  return empty
}

export function saveVerlaufstendenzState(state: VerlaufstendenzState, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const stamped: VerlaufstendenzState = {
    ...normalizeState(state),
    version: VERLAUFSTENDENZ_STATE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  stateCache.set(resolved, stamped)
  writeLocalStorage(resolved, stamped)
  notifyListeners(resolved)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyVerlaufstendenzState(
  state: VerlaufstendenzState | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!state) return

  const normalized = normalizeState(state)
  const local = readLocalStorage(resolved)
  const vaultTime = normalized.updatedAt ? new Date(normalized.updatedAt).getTime() : 0
  const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0

  if (vaultTime >= localTime) {
    stateCache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else if (local) {
    stateCache.set(resolved, normalizeState(local))
  }

  notifyListeners(resolved)
}

export function setVerlaufstendenzWindow(
  windowPreset: VerlaufstendenzWindowPreset,
  caseId?: string,
  custom?: { start?: string; end?: string },
): VerlaufstendenzState {
  const state = loadVerlaufstendenzState(caseId)
  const next: VerlaufstendenzState = {
    ...state,
    windowPreset,
    customWindowStart: custom?.start,
    customWindowEnd: custom?.end,
  }
  saveVerlaufstendenzState(next, caseId)
  return next
}

export function acceptVerlaufstendenzDraft(
  draft: VerlaufstendenzComputed,
  caseId?: string,
): VerlaufstendenzState {
  const state = loadVerlaufstendenzState(caseId)
  const next: VerlaufstendenzState = {
    ...state,
    draft,
    approved: {
      trend: draft.trend,
      rationaleSentence: draft.rationaleSentence,
      acceptedAt: new Date().toISOString(),
      windowPreset: draft.windowPreset,
    },
  }
  saveVerlaufstendenzState(next, caseId)
  return next
}

export function overrideVerlaufstendenz(
  trend: VerlaufstendenzTrend,
  rationaleSentence: string,
  caseId?: string,
): VerlaufstendenzState {
  const state = loadVerlaufstendenzState(caseId)
  const next: VerlaufstendenzState = {
    ...state,
    approved: {
      trend,
      rationaleSentence: rationaleSentence.trim(),
      acceptedAt: new Date().toISOString(),
      windowPreset: state.windowPreset,
      customWindowStart: state.customWindowStart,
      customWindowEnd: state.customWindowEnd,
    },
  }
  saveVerlaufstendenzState(next, caseId)
  return next
}

export function clearVerlaufstendenzOverride(caseId?: string): VerlaufstendenzState {
  const state = loadVerlaufstendenzState(caseId)
  const next: VerlaufstendenzState = { ...state, approved: null }
  saveVerlaufstendenzState(next, caseId)
  return next
}

export function updateVerlaufstendenzDraft(
  draft: VerlaufstendenzComputed,
  caseId?: string,
): VerlaufstendenzState {
  const state = loadVerlaufstendenzState(caseId)
  const next: VerlaufstendenzState = { ...state, draft }
  saveVerlaufstendenzState(next, caseId)
  return next
}

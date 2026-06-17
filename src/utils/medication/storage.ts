import type { MedicationPlanState } from '../../types/medicationPlan'
import {
  createEmptyMedicationPlanState,
  MEDICATION_PLAN_STATE_VERSION,
} from '../../types/medicationPlan'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'
import { scheduleMedicationStateImprints } from './imprint'
import { ensureMedicationPlanState } from './planOps'

/** In-memory session cache — backed by encrypted localStorage for crash/close durability. */
const planCache = new Map<string, MedicationPlanState>()

/**
 * Synchronous decrypted mirror of the encrypted localStorage durability copy. Because
 * Web Crypto is async, `readLocalStorage`/`writeLocalStorage` operate on this shadow
 * (keeping the existing synchronous merge logic intact) while the on-disk bytes are
 * ciphertext. The shadow is filled by `hydrateMedicationPlanFromEncryptedLocal` on load.
 */
const localShadow = new Map<string, MedicationPlanState>()

const LS_PREFIX = 'psychiatry-ink:medication-plan:'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, state: MedicationPlanState): void {
  localShadow.set(caseId, state)
  // Persist the durability copy encrypted-at-rest (async, best-effort).
  void writeEncryptedJson(lsKey(caseId), state)
}

function readLocalStorage(caseId: string): MedicationPlanState | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) the durability copy into the
 * synchronous shadow + in-memory cache. Must run before the workspace vault applies its
 * snapshot so the newer-wins merge can compare against the locally-persisted state.
 */
export async function hydrateMedicationPlanFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<MedicationPlanState>(lsKey(resolved))
    if (!persisted) return
    const normalized = ensureMedicationPlanState(persisted, resolved)
    localShadow.set(resolved, normalized)
    if (!planCache.has(resolved)) planCache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // Hydration is best-effort; the vault remains the authoritative source.
  }
}

export type MedicationPlanPersistHook = (caseId: string) => void
type MedicationPlanListener = (caseId: string) => void

let persistHook: MedicationPlanPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<MedicationPlanListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeMedicationPlanState(listener: MedicationPlanListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerMedicationPlanPersistHook(hook: MedicationPlanPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadMedicationPlanState(caseId?: string): MedicationPlanState | null {
  const resolved = resolveCaseId(caseId)
  const cached = planCache.get(resolved)
  if (cached) return ensureMedicationPlanState(cached, resolved)

  // Fall back to localStorage when the in-memory cache is cold (e.g. after page reload
  // before the vault has finished decrypting, or when the vault save was missed on close).
  const persisted = readLocalStorage(resolved)
  if (persisted) {
    const normalized = ensureMedicationPlanState(persisted, resolved)
    planCache.set(resolved, normalized)
    return normalized
  }

  return null
}

export function saveMedicationPlanState(state: MedicationPlanState, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const stamped: MedicationPlanState = {
    ...ensureMedicationPlanState(state, resolved),
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  planCache.set(resolved, stamped)

  // Write-through to localStorage immediately so data survives a fast patient close
  // or page reload before the vault debounce fires.
  writeLocalStorage(resolved, stamped)

  notifyListeners(resolved)
  scheduleMedicationStateImprints(resolved, stamped)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyMedicationPlanState(
  state: MedicationPlanState | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!state) {
    planCache.delete(resolved)
    return
  }
  const normalized = ensureMedicationPlanState(state, resolved)

  // Only overwrite a newer localStorage entry with the vault state when the vault
  // is actually more recent — this prevents an older vault snapshot from wiping
  // medications that were saved locally but not yet flushed into the vault.
  const local = readLocalStorage(resolved)
  const vaultTime = normalized.updatedAt ? new Date(normalized.updatedAt).getTime() : 0
  const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0

  if (vaultTime >= localTime) {
    planCache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else {
    // Local data is newer — keep the local version in cache and leave localStorage intact.
    planCache.set(resolved, ensureMedicationPlanState(local!, resolved))
  }

  notifyListeners(resolved)
}

export function getOrCreateMedicationPlanState(caseId?: string): MedicationPlanState {
  const resolved = resolveCaseId(caseId)
  return loadMedicationPlanState(resolved) ?? createEmptyMedicationPlanState(resolved)
}

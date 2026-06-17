/**
 * Sozialtherapie storage — per-case array with localStorage write-through.
 *
 * Mirrors the medication / complementary-therapy storage pattern: an in-memory session
 * cache backed by localStorage for crash/close durability, plus a debounced persist hook
 * that an external consumer (e.g. the workspace vault) may register to flush the data.
 * Reconciliation is newer-wins, compared by the most recent `updatedAt` across targets.
 *
 * Persistence here is localStorage-first by design so it does not contend with the vault
 * payload version owned by other Therapie features.
 */

import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import { ensureSozialtherapieTargets } from '../../types/sozialtherapie'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'

/** In-memory session cache — backed by encrypted localStorage for crash/close durability. */
const cache = new Map<string, SozialtherapieTarget[]>()

/**
 * Synchronous decrypted mirror of the encrypted localStorage durability copy (see the
 * matching note in `medication/storage.ts`). This store is localStorage-only (not part of
 * the workspace vault payload), so hydration is its sole load path. Filled by
 * `hydrateSozialtherapieFromEncryptedLocal` on load.
 */
const localShadow = new Map<string, SozialtherapieTarget[]>()

const LS_PREFIX = 'psychiatry-ink:sozialtherapie:'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, targets: SozialtherapieTarget[]): void {
  localShadow.set(caseId, targets)
  void writeEncryptedJson(lsKey(caseId), targets)
}

function readLocalStorage(caseId: string): SozialtherapieTarget[] | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) the durability copy into the
 * synchronous shadow + in-memory cache. As this store is not vault-mirrored, this is the
 * authoritative load path after a page reload.
 */
export async function hydrateSozialtherapieFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<SozialtherapieTarget[]>(lsKey(resolved))
    if (!persisted) return
    const normalized = ensureSozialtherapieTargets(persisted)
    localShadow.set(resolved, normalized)
    if (!cache.has(resolved)) cache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // Hydration is best-effort.
  }
}

function latestUpdatedAt(targets: SozialtherapieTarget[]): number {
  return targets.reduce((max, t) => {
    const time = t.updatedAt ? new Date(t.updatedAt).getTime() : 0
    return time > max ? time : max
  }, 0)
}

export type SozialtherapiePersistHook = (caseId: string) => void
type SozialtherapieListener = (caseId: string) => void

let persistHook: SozialtherapiePersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<SozialtherapieListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeSozialtherapie(listener: SozialtherapieListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerSozialtherapiePersistHook(hook: SozialtherapiePersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadSozialtherapie(caseId?: string): SozialtherapieTarget[] {
  const resolved = resolveCaseId(caseId)
  const cached = cache.get(resolved)
  if (cached) return cached

  // Fall back to localStorage when the in-memory cache is cold (e.g. after a page reload).
  const persisted = readLocalStorage(resolved)
  if (persisted) {
    cache.set(resolved, persisted)
    return persisted
  }

  return []
}

export function saveSozialtherapie(targets: SozialtherapieTarget[], caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const normalized = ensureSozialtherapieTargets(targets)
  cache.set(resolved, normalized)

  // Write-through to localStorage immediately so data survives a fast patient close
  // or page reload before any debounced flush fires.
  writeLocalStorage(resolved, normalized)

  notifyListeners(resolved)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applySozialtherapie(
  targets: SozialtherapieTarget[] | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!targets) {
    // Leave any locally-cached data intact — an absent external field must not wipe local data.
    return
  }
  const normalized = ensureSozialtherapieTargets(targets)

  // Only overwrite a newer localStorage entry when the incoming snapshot is actually more
  // recent — prevents an older snapshot from wiping targets saved locally.
  const local = readLocalStorage(resolved)
  const incomingTime = latestUpdatedAt(normalized)
  const localTime = local ? latestUpdatedAt(local) : 0

  if (incomingTime >= localTime) {
    cache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else if (local) {
    cache.set(resolved, local)
  }

  notifyListeners(resolved)
}

/**
 * Weitere Therapieverfahren storage — per-case array with localStorage write-through.
 *
 * Mirrors the complementary-therapy storage pattern: an in-memory session cache backed by
 * localStorage for crash/close durability, plus a debounced persist hook that lets the
 * workspace vault flush the data into the encrypted blob. Reconciliation is newer-wins,
 * compared by the most recent `updatedAt` across the stored entries.
 */

import type { WeitereTherapie } from '../../types/weitereTherapie'
import { ensureWeitereTherapien } from '../../types/weitereTherapie'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'

/** In-memory session cache — backed by encrypted localStorage for crash/close durability. */
const cache = new Map<string, WeitereTherapie[]>()

/**
 * Synchronous decrypted mirror of the encrypted localStorage durability copy (see the
 * matching note in `medication/storage.ts`). Filled by
 * `hydrateWeitereTherapieFromEncryptedLocal` on load.
 */
const localShadow = new Map<string, WeitereTherapie[]>()

const LS_PREFIX = 'psychiatry-ink:weitere-therapie:'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, entries: WeitereTherapie[]): void {
  localShadow.set(caseId, entries)
  void writeEncryptedJson(lsKey(caseId), entries)
}

function readLocalStorage(caseId: string): WeitereTherapie[] | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) the durability copy into the
 * synchronous shadow + in-memory cache before the workspace vault applies its snapshot.
 */
export async function hydrateWeitereTherapieFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<WeitereTherapie[]>(lsKey(resolved))
    if (!persisted) return
    const normalized = ensureWeitereTherapien(persisted)
    localShadow.set(resolved, normalized)
    if (!cache.has(resolved)) cache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // Hydration is best-effort; the vault remains the authoritative source.
  }
}

function latestUpdatedAt(entries: WeitereTherapie[]): number {
  return entries.reduce((max, t) => {
    const time = t.updatedAt ? new Date(t.updatedAt).getTime() : 0
    return time > max ? time : max
  }, 0)
}

export type WeitereTherapiePersistHook = (caseId: string) => void
type WeitereTherapieListener = (caseId: string) => void

let persistHook: WeitereTherapiePersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<WeitereTherapieListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeWeitereTherapie(listener: WeitereTherapieListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerWeitereTherapiePersistHook(hook: WeitereTherapiePersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadWeitereTherapie(caseId?: string): WeitereTherapie[] {
  const resolved = resolveCaseId(caseId)
  const cached = cache.get(resolved)
  if (cached) return cached

  // Fall back to localStorage when the in-memory cache is cold (e.g. after a page reload
  // before the vault has finished decrypting, or when the vault save was missed on close).
  const persisted = readLocalStorage(resolved)
  if (persisted) {
    cache.set(resolved, persisted)
    return persisted
  }

  return []
}

export function saveWeitereTherapie(entries: WeitereTherapie[], caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const normalized = ensureWeitereTherapien(entries)
  cache.set(resolved, normalized)

  // Write-through to localStorage immediately so data survives a fast patient close
  // or page reload before the vault debounce fires.
  writeLocalStorage(resolved, normalized)

  notifyListeners(resolved)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyWeitereTherapie(
  entries: WeitereTherapie[] | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!entries) {
    // Leave any locally-cached data intact — an absent vault field must not wipe local data.
    return
  }
  const normalized = ensureWeitereTherapien(entries)

  // Only overwrite a newer localStorage entry with the vault state when the vault is
  // actually more recent — prevents an older vault snapshot from wiping entries saved
  // locally but not yet flushed into the vault.
  const local = readLocalStorage(resolved)
  const vaultTime = latestUpdatedAt(normalized)
  const localTime = local ? latestUpdatedAt(local) : 0

  if (vaultTime >= localTime) {
    cache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else if (local) {
    cache.set(resolved, local)
  }

  notifyListeners(resolved)
}

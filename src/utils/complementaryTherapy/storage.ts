/**
 * Complementary therapies storage — per-case array with localStorage write-through.
 *
 * Mirrors the medication/psychotherapy storage pattern: an in-memory session cache backed
 * by localStorage for crash/close durability, plus a debounced persist hook that lets the
 * workspace vault flush the data into the encrypted blob. Reconciliation is newer-wins,
 * compared by the most recent `updatedAt` across the stored therapies.
 */

import type { ComplementaryTherapy } from '../../types/complementaryTherapy'
import { ensureComplementaryTherapies } from '../../types/complementaryTherapy'
import { getActiveCaseId } from '../caseContext'

/** In-memory session cache — backed by localStorage for crash/close durability. */
const cache = new Map<string, ComplementaryTherapy[]>()

const LS_PREFIX = 'psychiatry-ink:complementary-therapies:'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, therapies: ComplementaryTherapy[]): void {
  try {
    localStorage.setItem(lsKey(caseId), JSON.stringify(therapies))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

function readLocalStorage(caseId: string): ComplementaryTherapy[] | null {
  try {
    const raw = localStorage.getItem(lsKey(caseId))
    if (!raw) return null
    return ensureComplementaryTherapies(JSON.parse(raw))
  } catch {
    return null
  }
}

function latestUpdatedAt(therapies: ComplementaryTherapy[]): number {
  return therapies.reduce((max, t) => {
    const time = t.updatedAt ? new Date(t.updatedAt).getTime() : 0
    return time > max ? time : max
  }, 0)
}

export type ComplementaryTherapiesPersistHook = (caseId: string) => void
type ComplementaryTherapiesListener = (caseId: string) => void

let persistHook: ComplementaryTherapiesPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<ComplementaryTherapiesListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeComplementaryTherapies(
  listener: ComplementaryTherapiesListener,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerComplementaryTherapiesPersistHook(
  hook: ComplementaryTherapiesPersistHook | null,
): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadComplementaryTherapies(caseId?: string): ComplementaryTherapy[] {
  const resolved = resolveCaseId(caseId)
  const cached = cache.get(resolved)
  if (cached) return cached

  // Fall back to localStorage when the in-memory cache is cold (e.g. after page reload
  // before the vault has finished decrypting, or when the vault save was missed on close).
  const persisted = readLocalStorage(resolved)
  if (persisted) {
    cache.set(resolved, persisted)
    return persisted
  }

  return []
}

export function saveComplementaryTherapies(
  therapies: ComplementaryTherapy[],
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  const normalized = ensureComplementaryTherapies(therapies)
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

export function applyComplementaryTherapies(
  therapies: ComplementaryTherapy[] | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!therapies) {
    // Leave any locally-cached data intact — an absent vault field must not wipe local data.
    return
  }
  const normalized = ensureComplementaryTherapies(therapies)

  // Only overwrite a newer localStorage entry with the vault state when the vault is
  // actually more recent — prevents an older vault snapshot from wiping therapies saved
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

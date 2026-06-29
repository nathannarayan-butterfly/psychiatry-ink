/**
 * Cross-user device-data isolation.
 *
 * Patient / case / notes data is persisted on the device in localStorage,
 * sessionStorage and IndexedDB (the encrypted vault DB `psychiatry-ink-crypto`
 * and the imported-files DB `psychiatry-ink:imported-files`). None of it was
 * namespaced by the authenticated user, and the device RSA key that decrypts the
 * encrypted-at-rest caches is itself shared — so a *different* user signing in on
 * the same browser could read the previous user's clinical data (a P0 isolation
 * failure).
 *
 * This module fixes that by keying off the opaque authenticated user id and
 * purging ALL device-local clinical data:
 *   1. on logout, and
 *   2. when a DIFFERENT user id is observed at auth resolution (the safety net
 *      for sessions that ended without a clean logout).
 *
 * Device UI preferences / non-patient config (see {@link isPreservedDevicePreferenceKey})
 * and the active Supabase session token are deliberately preserved so a purge
 * never logs out the new user or wipes legitimately shared appearance settings.
 */

import { isPreservedDevicePreferenceKey } from './devicePreferences'
import { safeGetItem, safeRemoveItem, safeSetItem } from './safeStorage'
import { resetActiveCaseId } from './caseContext'
import { resetRegistryShadow } from './caseRegistryStorage'
import { resetCaseRegistryCache } from '../hooks/useCaseRegistry'

/**
 * Opaque id of the user whose clinical data currently lives on this device.
 * Stores ONLY the Supabase user id (a random uuid) — never PHI. Preserved across
 * a purge so a different-user switch is still detectable after the previous
 * user's data has been cleared.
 */
export const ACTIVE_USER_ID_KEY = 'psychiatry-ink:active-user-id'

/** Clinical IndexedDB databases that hold patient/case data or its decryption keys. */
const CLINICAL_IDB_NAMES = [
  'psychiatry-ink-crypto',
  'psychiatry-ink:imported-files',
] as const

function isSupabaseAuthTokenKey(key: string): boolean {
  return key.startsWith('sb-') && key.includes('-auth-token')
}

export function getStoredActiveUserId(): string | null {
  return safeGetItem(ACTIVE_USER_ID_KEY)
}

export function setStoredActiveUserId(userId: string): void {
  safeSetItem(ACTIVE_USER_ID_KEY, userId)
}

export function clearStoredActiveUserId(): void {
  safeRemoveItem(ACTIVE_USER_ID_KEY)
}

/**
 * Remove every localStorage key that is not preserved device config, the active
 * Supabase session token, or the {@link ACTIVE_USER_ID_KEY} marker. This is the
 * inverse of the device-preferences allow-list: anything not explicitly safe to
 * keep is treated as (potential) clinical data and dropped.
 */
function clearClinicalLocalStorage(): void {
  if (typeof localStorage === 'undefined') return
  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue
    if (key === ACTIVE_USER_ID_KEY) continue
    if (isPreservedDevicePreferenceKey(key)) continue
    if (isSupabaseAuthTokenKey(key)) continue
    keysToRemove.push(key)
  }
  for (const key of keysToRemove) safeRemoveItem(key)
}

function deleteClinicalIndexedDbs(): void {
  if (typeof indexedDB === 'undefined') return
  for (const name of CLINICAL_IDB_NAMES) {
    try {
      const request = indexedDB.deleteDatabase(name)
      // A purge must never block on an open connection: vault helpers close their
      // connection per transaction, so deletion normally completes immediately;
      // if something still holds it open we let the delete run when it can.
      request.onblocked = () => {}
    } catch {
      // ignore — not in a browser or IndexedDB unavailable
    }
  }
}

/**
 * Purge all device-local clinical data (patient/case registry, dokumente archive,
 * notes incl. the global Notizen + standalone scratch cases, lab graphs, timelines,
 * the encrypted vault + imported files, and every in-memory cache mirroring them).
 *
 * Synchronous for the readable surfaces (localStorage, sessionStorage, in-memory
 * caches) so the leak is closed before control returns; the IndexedDB deletes are
 * fired best-effort and finish shortly after (the ciphertext they would decrypt is
 * already gone from localStorage).
 */
export function purgeClinicalDeviceData(): void {
  clearClinicalLocalStorage()
  try {
    sessionStorage.clear()
  } catch {
    // ignore — not in a browser or storage disabled
  }
  resetActiveCaseId()
  resetRegistryShadow()
  resetCaseRegistryCache()
  deleteClinicalIndexedDbs()
}

/**
 * Reconcile the device's stored "active user" against the just-resolved auth user.
 *
 * Returns `true` when a DIFFERENT user was detected and the previous user's data
 * was purged — the caller should then hard-reload so every module cache and the
 * React tree are rebuilt from the now-clean storage. Returns `false` otherwise
 * (same user, first-known login, or signed-out).
 */
export function reconcileActiveUser(userId: string | null): boolean {
  if (!userId) return false

  const previous = getStoredActiveUserId()
  if (previous && previous !== userId) {
    // Record the new owner BEFORE purging/reloading so a reload can never loop.
    setStoredActiveUserId(userId)
    purgeClinicalDeviceData()
    return true
  }

  setStoredActiveUserId(userId)
  return false
}

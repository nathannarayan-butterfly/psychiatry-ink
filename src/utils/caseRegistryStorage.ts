import type { LocalCaseMeta } from '../hooks/useCaseRegistry'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from './encryptedLocalStore'

export const REGISTRY_KEY = 'psychiatry-ink:case-registry'

/**
 * Synchronous decrypted mirror of the encrypted-at-rest registry (patient identifiers /
 * case titles). Web Crypto is async, so `loadRegistryMapFromStorage` reads this shadow while
 * the on-disk bytes are ciphertext. The shadow is populated by `saveRegistryMapToStorage`
 * and, on a cold load, by `hydrateCaseRegistryFromEncryptedLocal` (awaited at the top of
 * `hydrateCaseRegistry` before any synchronous registry read happens). `null` means
 * "not yet hydrated" so callers never read a falsely-empty map and overwrite it.
 */
let registryShadow: Record<string, LocalCaseMeta> | null = null
/** False until the encrypted (or legacy plaintext) registry has been read at least once. */
let registryShadowHydrated = false

/** Whether the synchronous shadow has been populated from encrypted local storage. */
export function isRegistryShadowHydrated(): boolean {
  return registryShadowHydrated
}

/** Mark shadow ready so subsequent saves persist ciphertext (e.g. after cloud restore). */
export function markRegistryShadowHydrated(): void {
  registryShadowHydrated = true
}

/**
 * Drop the in-memory decrypted registry mirror. Called when device-local clinical
 * data is purged on an auth identity change so a different user can never read the
 * previous user's case identifiers from this process's RAM (the on-disk ciphertext
 * is cleared separately). The next read re-hydrates from the now-clean storage.
 */
export function resetRegistryShadow(): void {
  registryShadow = null
  registryShadowHydrated = false
}

export function loadRegistryMapFromStorage(): Record<string, LocalCaseMeta> {
  return registryShadow ? { ...registryShadow } : {}
}

export function saveRegistryMapToStorage(map: Record<string, LocalCaseMeta>): void {
  registryShadow = { ...map }
  // Never overwrite ciphertext until hydration has read the on-disk registry — otherwise a
  // pre-hydration upsert would persist a falsely-empty map and wipe patient identifiers.
  if (!registryShadowHydrated) return
  void writeEncryptedJson(REGISTRY_KEY, map)
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) the registry into the synchronous
 * shadow. Must be awaited before the first synchronous `loadRegistryMapFromStorage` read so the
 * encrypted data is not lost — `hydrateCaseRegistry` calls this first.
 */
export async function hydrateCaseRegistryFromEncryptedLocal(): Promise<void> {
  try {
    const persisted = await readOrMigrateEncryptedJson<Record<string, LocalCaseMeta>>(REGISTRY_KEY)
    if (persisted && typeof persisted === 'object') {
      registryShadow = persisted
    } else if (registryShadow === null) {
      registryShadow = {}
    }
  } catch {
    if (registryShadow === null) registryShadow = {}
  } finally {
    registryShadowHydrated = true
  }
}

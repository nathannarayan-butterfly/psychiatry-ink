/**
 * Encrypted-at-rest localStorage helpers for PHI/clinical caches.
 *
 * Background: several feature caches keep a synchronous localStorage write-through
 * copy of clinical data for crash/close durability. Historically that copy was stored
 * as PLAINTEXT, which contradicts the product's "encrypted at rest on the device"
 * promise (the encrypted workspace vault in IndexedDB was the only ciphertext).
 *
 * These helpers let those caches persist the durability copy as ciphertext using the
 * SAME device crypto as the workspace vault (RSA-OAEP-wrapped AES-GCM via the local
 * key material in IndexedDB — see {@link encryptJsonPayload}/{@link decryptJsonPayload}).
 * Because Web Crypto is asynchronous, callers keep an in-memory (synchronous) cache as
 * the read source and use these async helpers only for persistence/hydration.
 *
 * Stored envelope shape: a value is written under its existing localStorage key as
 * `"enc:v1:" + JSON.stringify({ v: 1, blob })`. The `enc:v1:` prefix lets us cheaply
 * distinguish encrypted entries from legacy plaintext entries written before this
 * migration, so we can migrate plaintext → ciphertext exactly once, in place.
 */

import {
  decryptJsonPayload,
  encryptJsonPayload,
  type EncryptedVaultBlob,
} from './cryptoVault'
import { safeGetItem, safeSetItem } from './safeStorage'

/** Marker prefix identifying an encrypted-at-rest localStorage envelope. */
export const ENCRYPTED_STORE_PREFIX = 'enc:v1:'

interface EncryptedEnvelope {
  v: 1
  blob: EncryptedVaultBlob
}

/** True when `raw` is one of our encrypted envelopes (vs. legacy plaintext / null). */
export function isEncryptedEnvelope(raw: string | null | undefined): raw is string {
  return typeof raw === 'string' && raw.startsWith(ENCRYPTED_STORE_PREFIX)
}

/**
 * Encrypt `value` and persist it to localStorage under `key` as ciphertext.
 * Best-effort: returns `false` (without throwing) on encryption or storage failure,
 * mirroring {@link safeSetItem} so a persistence error never crashes the UI.
 */
export async function writeEncryptedJson<T>(key: string, value: T): Promise<boolean> {
  try {
    const blob = await encryptJsonPayload(value)
    const envelope: EncryptedEnvelope = { v: 1, blob }
    return safeSetItem(key, ENCRYPTED_STORE_PREFIX + JSON.stringify(envelope))
  } catch (error) {
    console.warn(`[encrypted-storage] encrypt failed for "${key}"`, error)
    return false
  }
}

/**
 * Read and decrypt an encrypted value previously written by {@link writeEncryptedJson}.
 * Returns `null` on a miss, on a legacy plaintext entry (use
 * {@link readLegacyPlaintextJson}), or on any decrypt/parse failure.
 */
export async function readEncryptedJson<T>(key: string): Promise<T | null> {
  const raw = safeGetItem(key)
  if (!isEncryptedEnvelope(raw)) return null
  try {
    const envelope = JSON.parse(raw.slice(ENCRYPTED_STORE_PREFIX.length)) as EncryptedEnvelope
    if (!envelope || typeof envelope !== 'object' || !envelope.blob) return null
    return await decryptJsonPayload<T>(envelope.blob)
  } catch (error) {
    console.warn(`[encrypted-storage] decrypt failed for "${key}"`, error)
    return null
  }
}

/**
 * Read a *legacy plaintext* value still stored under `key` (written before the
 * encryption migration). Returns `null` when the entry is absent, already encrypted,
 * or not valid JSON.
 */
export function readLegacyPlaintextJson<T>(key: string): T | null {
  const raw = safeGetItem(key)
  if (raw === null || isEncryptedEnvelope(raw)) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Hydrate one PHI cache key:
 * 1. Prefer the encrypted value.
 * 2. Otherwise, migrate a legacy plaintext entry to ciphertext exactly once — read it,
 *    re-persist it encrypted under the SAME key (overwriting the plaintext so none is
 *    left behind), and return it.
 *
 * Returns the decrypted/migrated value, or `null` when no data exists.
 */
export async function readOrMigrateEncryptedJson<T>(key: string): Promise<T | null> {
  const encrypted = await readEncryptedJson<T>(key)
  if (encrypted !== null) return encrypted

  const legacy = readLegacyPlaintextJson<T>(key)
  if (legacy === null) return null

  // Re-persist the legacy plaintext as ciphertext under the same key. The plaintext is
  // overwritten in place; if the encrypted write fails we still return the value (the
  // caller keeps working) and migration is retried on the next hydration.
  await writeEncryptedJson(key, legacy)
  return legacy
}

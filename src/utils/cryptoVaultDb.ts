/**
 * Single source of truth for the `psychiatry-ink-crypto` IndexedDB schema.
 *
 * BACKGROUND — production bug 2026-06-30 ("'vault' is not a known object
 * store name"):
 *
 * Multiple modules used to open the same database at version 1 with their
 * own private `onupgradeneeded` handlers, each of which only created the
 * subset of object stores that module cared about:
 *   - `cryptoVault.ts`              → both `keys` + `vault`
 *   - `passphraseRecovery.ts`       → only `keys`
 *   - `medicationEducation/*`,
 *     `guidedEntry/guidedEntryVault.ts`,
 *     `documentTemplate/templateInstancesVault.ts`,
 *     `dischargeSummary/storage.ts`,
 *     `arztbrief/storage.ts`,
 *     `generatedDocumentsVault.ts`  → only `vault`
 *   - `clearCaseStorage.ts`,
 *     `demo/clearDemoCaseStorage.ts` → no upgrade handler at all
 *
 * Whichever module opened the DB FIRST won the schema at version 1.
 * Subsequent opens at the same version don't trigger `onupgradeneeded`, so
 * the missing stores stayed missing. Users whose first interaction was a
 * "keys-only" opener (e.g. passphrase backup setup) ended up with a DB
 * containing `keys` but no `vault` — any later `db.transaction('vault')`
 * then threw the production error.
 *
 * FIX:
 *   1. Bump the schema version to 2.
 *   2. Every consumer calls this shared `openCryptoVaultDb()` instead of
 *      its private opener. The upgrade handler unconditionally creates BOTH
 *      stores when missing, so the DB ends up in a consistent shape no
 *      matter which module opens it first AND existing v1 databases get
 *      upgraded on the next open.
 *
 * The upgrade handler is idempotent and handles `oldVersion === 0` (fresh
 * DB) and `oldVersion === 1` (legacy half-schema) without dropping any
 * existing data — `createObjectStore` is only called when the store is not
 * already present.
 */

export const CRYPTO_DB_NAME = 'psychiatry-ink-crypto'
/**
 * Schema version. Bump this AND extend the upgrade handler below whenever a
 * new object store is added. Never decrease.
 */
export const CRYPTO_DB_VERSION = 2
export const CRYPTO_KEYS_STORE = 'keys'
export const CRYPTO_VAULT_STORE = 'vault'

/**
 * Open the shared crypto IndexedDB, creating any missing object stores via
 * the upgrade handler. Safe to call from any module — the handler is
 * idempotent across all schema versions that have ever shipped.
 */
export function openCryptoVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CRYPTO_DB_NAME, CRYPTO_DB_VERSION)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onblocked = () => {
      // Another tab is holding the previous version open; the open() will
      // resolve once they close. We surface the condition so caller logs
      // make the cause obvious; do not reject.
      console.warn(
        '[crypto-vault] IndexedDB upgrade blocked — another tab is holding the DB open',
      )
    }
    request.onupgradeneeded = () => {
      const db = request.result
      // Idempotent — `createObjectStore` is only invoked when the store is
      // not already present, so legacy databases keep their existing data.
      if (!db.objectStoreNames.contains(CRYPTO_KEYS_STORE)) {
        db.createObjectStore(CRYPTO_KEYS_STORE)
      }
      if (!db.objectStoreNames.contains(CRYPTO_VAULT_STORE)) {
        db.createObjectStore(CRYPTO_VAULT_STORE)
      }
    }
  })
}

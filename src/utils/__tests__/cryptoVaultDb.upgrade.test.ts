// @vitest-environment node
//
// Regression test for the production bug:
//   "IDBDatabase.transaction: 'vault' is not a known object store name"
//
// Before the fix, every module that opened the `psychiatry-ink-crypto`
// IndexedDB had its own private `onupgradeneeded` that only created the
// subset of stores it cared about. Whichever module won the race for
// `oldVersion === 0` decided the schema at version 1, and any other module
// that needed a different store later failed because the version no longer
// triggered an upgrade callback.
//
// `openCryptoVaultDb()` is the single source of truth now: it opens the
// shared DB at version 2 and ALWAYS creates both `keys` and `vault` if
// missing. These tests prove three scenarios:
//
//   1. Fresh DB (oldVersion === 0): both stores end up present.
//   2. Legacy v1 DB with only `keys` (the user's exact stuck state): the
//      upgrade to v2 creates `vault` without dropping pre-existing rows.
//   3. Legacy v1 DB with only `vault`: symmetric — the upgrade creates
//      `keys` and preserves existing vault rows.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CRYPTO_DB_NAME,
  CRYPTO_DB_VERSION,
  CRYPTO_KEYS_STORE,
  CRYPTO_VAULT_STORE,
  openCryptoVaultDb,
} from '../cryptoVaultDb'

function deleteDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(CRYPTO_DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

function openLegacyV1WithStores(stores: readonly string[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CRYPTO_DB_NAME, 1)
    request.onerror = () => reject(request.error ?? new Error('open v1 failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
  })
}

function putRow(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('put failed'))
  })
}

function getRow<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('get failed'))
  })
}

describe('cryptoVaultDb — shared upgrade handler', () => {
  beforeEach(async () => {
    await deleteDb()
  })

  afterEach(async () => {
    await deleteDb()
  })

  it('creates both keys and vault stores in a fresh database', async () => {
    const db = await openCryptoVaultDb()
    try {
      expect(db.version).toBe(CRYPTO_DB_VERSION)
      expect(db.objectStoreNames.contains(CRYPTO_KEYS_STORE)).toBe(true)
      expect(db.objectStoreNames.contains(CRYPTO_VAULT_STORE)).toBe(true)
    } finally {
      db.close()
    }
  })

  it("upgrades a legacy v1 DB that only has 'keys' — repro of the production bug", async () => {
    // Simulate the user's stuck state: a previous build's
    // `passphraseRecovery.openDb()` (or any keys-only opener) ran first and
    // pinned the DB at version 1 with only the `keys` store.
    const legacy = await openLegacyV1WithStores([CRYPTO_KEYS_STORE])
    expect(legacy.objectStoreNames.contains(CRYPTO_KEYS_STORE)).toBe(true)
    expect(legacy.objectStoreNames.contains(CRYPTO_VAULT_STORE)).toBe(false)
    await putRow(legacy, CRYPTO_KEYS_STORE, 'passphrase-backup', { token: 'preserved' })
    legacy.close()

    const upgraded = await openCryptoVaultDb()
    try {
      expect(upgraded.version).toBe(CRYPTO_DB_VERSION)
      expect(upgraded.objectStoreNames.contains(CRYPTO_KEYS_STORE)).toBe(true)
      expect(upgraded.objectStoreNames.contains(CRYPTO_VAULT_STORE)).toBe(true)

      const preserved = await getRow<{ token: string }>(
        upgraded,
        CRYPTO_KEYS_STORE,
        'passphrase-backup',
      )
      expect(preserved?.token).toBe('preserved')

      await expect(
        putRow(upgraded, CRYPTO_VAULT_STORE, 'workspace:abc', { ciphertext: 'x' }),
      ).resolves.toBeUndefined()
    } finally {
      upgraded.close()
    }
  })

  it("upgrades a legacy v1 DB that only has 'vault'", async () => {
    const legacy = await openLegacyV1WithStores([CRYPTO_VAULT_STORE])
    expect(legacy.objectStoreNames.contains(CRYPTO_KEYS_STORE)).toBe(false)
    expect(legacy.objectStoreNames.contains(CRYPTO_VAULT_STORE)).toBe(true)
    await putRow(legacy, CRYPTO_VAULT_STORE, 'arztbrief-docs:abc', { kept: true })
    legacy.close()

    const upgraded = await openCryptoVaultDb()
    try {
      expect(upgraded.version).toBe(CRYPTO_DB_VERSION)
      expect(upgraded.objectStoreNames.contains(CRYPTO_KEYS_STORE)).toBe(true)
      expect(upgraded.objectStoreNames.contains(CRYPTO_VAULT_STORE)).toBe(true)

      const preserved = await getRow<{ kept: boolean }>(
        upgraded,
        CRYPTO_VAULT_STORE,
        'arztbrief-docs:abc',
      )
      expect(preserved?.kept).toBe(true)
    } finally {
      upgraded.close()
    }
  })

  it('is idempotent: re-opening an already-current DB does not throw or reset data', async () => {
    const first = await openCryptoVaultDb()
    await putRow(first, CRYPTO_VAULT_STORE, 'medication-education-docs:abc', { v: 1 })
    first.close()

    const second = await openCryptoVaultDb()
    try {
      expect(second.version).toBe(CRYPTO_DB_VERSION)
      const round = await getRow<{ v: number }>(
        second,
        CRYPTO_VAULT_STORE,
        'medication-education-docs:abc',
      )
      expect(round?.v).toBe(1)
    } finally {
      second.close()
    }
  })
})

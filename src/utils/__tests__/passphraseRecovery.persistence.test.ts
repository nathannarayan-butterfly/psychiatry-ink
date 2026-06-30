// @vitest-environment node
//
// Proves the registration passphrase choice actually persists and is HONORED:
// the passphrase set at signup wraps the account's RSA private key, and that
// wrapped key backup must round-trip so the same passphrase can recover the key
// (and therefore decrypt previously-encrypted data) on a fresh session/device.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createPassphraseBackup,
  getPassphraseBackup,
  restorePrivateKeyFromPassphrase,
  serializePassphraseBackup,
} from '../passphraseRecovery'
import {
  encryptJsonPayload,
  decryptJsonPayload,
  ensureKeyMaterial,
  type StoredKeyMaterial,
} from '../cryptoVault'
import {
  CRYPTO_DB_NAME,
  CRYPTO_KEYS_STORE as KEYS_STORE,
  openCryptoVaultDb,
} from '../cryptoVaultDb'

const IDB_NAME = CRYPTO_DB_NAME

function openDb(): Promise<IDBDatabase> {
  return openCryptoVaultDb()
}

/** Simulate a brand-new device: forget the locally stored RSA key material. */
async function wipeLocalKeyMaterial(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readwrite')
    tx.objectStore(KEYS_STORE).delete('primary')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function readPrimary(): Promise<StoredKeyMaterial | null> {
  const db = await openDb()
  const result = await new Promise<StoredKeyMaterial | null>((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly')
    const req = tx.objectStore(KEYS_STORE).get('primary')
    req.onsuccess = () => resolve((req.result as StoredKeyMaterial | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

async function clearDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(IDB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

const VALID_PASSPHRASE = 'correct horse battery staple'

describe('passphrase recovery — persistence of the signup passphrase choice', () => {
  beforeEach(async () => {
    await clearDb()
  })

  afterEach(async () => {
    await clearDb()
  })

  it('recovers the account key on a fresh device and decrypts data encrypted before', async () => {
    // Device A: account key generated, sensitive payload encrypted to it.
    const original = await ensureKeyMaterial()
    const secret = { name: 'Erika Mustermann', geburtsdatum: '1980-01-01' }
    const blob = await encryptJsonPayload(secret)

    // User sets a passphrase at signup → wrapped key backup is produced.
    const backup = await createPassphraseBackup(VALID_PASSPHRASE)
    expect(backup.salt).toBeTruthy()
    expect(backup.iv).toBeTruthy()
    expect(backup.ciphertext).toBeTruthy()
    expect(backup.iterations).toBe(310_000)

    // New device / cleared browser: no local private key remains.
    await wipeLocalKeyMaterial()
    expect(await readPrimary()).toBeNull()

    // Entering the same passphrase restores the *same* account key...
    const restored = await restorePrivateKeyFromPassphrase(VALID_PASSPHRASE, backup)
    expect(restored.privateKeyJwk.d).toBe(original.privateKeyJwk.d)
    expect(restored.publicKeyJwk.n).toBe(original.publicKeyJwk.n)

    // ...and the previously-encrypted data is readable again.
    const decrypted = await decryptJsonPayload<typeof secret>(blob)
    expect(decrypted).toEqual(secret)
  })

  it('rejects an incorrect passphrase (no silent key corruption)', async () => {
    await ensureKeyMaterial()
    const backup = await createPassphraseBackup(VALID_PASSPHRASE)
    await wipeLocalKeyMaterial()

    await expect(
      restorePrivateKeyFromPassphrase('totally-wrong-passphrase', backup),
    ).rejects.toBeDefined()
  })

  it('persists the wrapped key backup locally (IndexedDB) for subsequent loads', async () => {
    await ensureKeyMaterial()
    const created = await createPassphraseBackup(VALID_PASSPHRASE)
    const fetched = await getPassphraseBackup()
    expect(fetched).toEqual(created)
  })

  it('never stores the private key in plaintext in the backup', async () => {
    const material = await ensureKeyMaterial()
    const backup = await createPassphraseBackup(VALID_PASSPHRASE)

    // The backup is ciphertext + crypto params only — no private exponent leak.
    expect(Object.keys(backup).sort()).toEqual(
      ['ciphertext', 'iterations', 'iv', 'salt', 'version'].sort(),
    )
    const serialized = serializePassphraseBackup(backup)
    expect(material.privateKeyJwk.d).toBeTruthy()
    expect(serialized).not.toContain(material.privateKeyJwk.d as string)
  })

  it('decrypts a backup created with a non-default iteration count (regression)', async () => {
    // Guards the fix: restore must use the iteration count stored in the backup,
    // not the current PBKDF2_ITERATIONS constant. Build a backup whose iterations
    // differ from the constant and confirm it still decrypts.
    const material = await ensureKeyMaterial()
    const customIterations = 120_000

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(VALID_PASSPHRASE),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: customIterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(JSON.stringify(material.privateKeyJwk)),
    )

    const toB64 = (buf: ArrayBuffer) => {
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (const b of bytes) binary += String.fromCharCode(b)
      return btoa(binary)
    }

    const legacyBackup = {
      version: 1,
      salt: toB64(salt.buffer),
      iv: toB64(iv.buffer),
      ciphertext: toB64(ciphertext),
      iterations: customIterations,
    }

    await wipeLocalKeyMaterial()
    const restored = await restorePrivateKeyFromPassphrase(VALID_PASSPHRASE, legacyBackup)
    expect(restored.privateKeyJwk.d).toBe(material.privateKeyJwk.d)
  })
})

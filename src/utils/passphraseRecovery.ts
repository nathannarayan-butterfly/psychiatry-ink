/**
 * Optional passphrase recovery — wraps RSA private key JWK with PBKDF2-derived AES key.
 *
 * Loss of passphrase AND device key = unrecoverable (documented in settings UI).
 */

import {
  derivePublicJwkFromPrivate,
  ensureKeyMaterial,
  getOrCreateDeviceId,
  type EncryptedVaultBlob,
  type StoredKeyMaterial,
} from './cryptoVault'
import { assertPassphraseValidForSetup } from './passphrasePolicy'

const IDB_NAME = 'psychiatry-ink-crypto'
const IDB_VERSION = 1
const KEYS_STORE = 'keys'
const RECOVERY_KEY = 'passphrase-backup'

const PBKDF2_ITERATIONS = 310_000

export interface PassphraseKeyBackup {
  version: number
  salt: string
  iv: string
  ciphertext: string
  iterations: number
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(KEYS_STORE)) db.createObjectStore(KEYS_STORE)
    }
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly')
    const store = tx.objectStore(KEYS_STORE)
    const request = store.get(key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
    tx.oncomplete = () => db.close()
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readwrite')
    const store = tx.objectStore(KEYS_STORE)
    const request = store.put(value, key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'))
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
  })
}

async function deriveAesKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function createPassphraseBackup(passphrase: string): Promise<PassphraseKeyBackup> {
  assertPassphraseValidForSetup(passphrase)

  const material = await ensureKeyMaterial()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveAesKeyFromPassphrase(passphrase, salt)
  const encoded = new TextEncoder().encode(JSON.stringify(material.privateKeyJwk))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)

  const backup: PassphraseKeyBackup = {
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
    iterations: PBKDF2_ITERATIONS,
  }

  await idbSet(RECOVERY_KEY, backup)
  return backup
}

export async function getPassphraseBackup(): Promise<PassphraseKeyBackup | null> {
  return idbGet<PassphraseKeyBackup>(RECOVERY_KEY)
}

export async function restorePrivateKeyFromPassphrase(
  passphrase: string,
  backup?: PassphraseKeyBackup,
): Promise<StoredKeyMaterial> {
  const stored = backup ?? (await getPassphraseBackup())
  if (!stored) throw new Error('No passphrase backup found')

  const salt = new Uint8Array(base64ToBuffer(stored.salt))
  const iv = new Uint8Array(base64ToBuffer(stored.iv))
  // Derive with the iteration count the backup was created with — not the
  // current constant. Otherwise bumping PBKDF2_ITERATIONS in a future release
  // would make every existing passphrase key backup permanently undecryptable,
  // silently breaking the passphrase-recovery path the user set up at signup.
  const iterations =
    typeof stored.iterations === 'number' && stored.iterations > 0
      ? stored.iterations
      : PBKDF2_ITERATIONS
  const aesKey = await deriveAesKeyFromPassphrase(passphrase, salt, iterations)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    base64ToBuffer(stored.ciphertext),
  )
  const privateKeyJwk = JSON.parse(new TextDecoder().decode(plaintext)) as JsonWebKey

  // The backup stores only the private key. Derive the matching public key from
  // it (RSA private JWK carries n/e) so the restored pair is internally
  // consistent. Calling ensureKeyMaterial() here would generate a NEW, unrelated
  // public key on a fresh device and keep it alongside the restored private key —
  // every subsequently-encrypted blob would then be wrapped to a public key the
  // restored private key can never unwrap, silently corrupting new data.
  const publicKeyJwk = derivePublicJwkFromPrivate(privateKeyJwk)
  const restored: StoredKeyMaterial = {
    publicKeyJwk,
    privateKeyJwk,
    deviceId: getOrCreateDeviceId(),
  }
  await idbSet('primary', restored)
  // Persist the (already-encrypted) backup locally so this device is recognised as
  // holding the account key on subsequent loads — otherwise the new-device unlock
  // prompt would keep reappearing every login even after a successful restore.
  await idbSet(RECOVERY_KEY, stored)
  return restored
}

export function serializePassphraseBackup(backup: PassphraseKeyBackup): string {
  return JSON.stringify(backup, null, 2)
}

export function parsePassphraseBackup(json: string): PassphraseKeyBackup {
  const parsed = JSON.parse(json) as PassphraseKeyBackup
  if (
    typeof parsed.salt !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error('Invalid passphrase backup format')
  }
  return parsed
}

export function downloadPassphraseBackupFile(
  backup: PassphraseKeyBackup,
  filename = 'key-recovery.json',
): void {
  const content = serializePassphraseBackup(backup)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Re-export for type compatibility with vault blobs (unused for passphrase path). */
export type { EncryptedVaultBlob }

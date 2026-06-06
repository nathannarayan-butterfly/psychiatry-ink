/**
 * Client-side encrypted patient metadata vault.
 *
 * Crypto flow (all in browser via Web Crypto API):
 * 1. RSA-OAEP 2048 key pair generated on first use; private key stays in IndexedDB.
 * 2. Patient `{ name, geburtsdatum }` encrypted with AES-GCM-256 (random IV per save).
 * 3. AES key wrapped (RSA-OAEP) with the user's public key → stored as `wrappedKey`.
 * 4. Exportable vault file: `{ version, ciphertext, iv, wrappedKey }` (base64 fields).
 * 5. Server receives public key JWK only (when privacy tier = `full`) — never name/DOB.
 */

import { DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { allowsPublicKeyRegistration, type PrivacyTier } from '../data/privacyRegions'

export const VAULT_VERSION = 1

/** Local-only patient identifiers — never in cloud snapshots. */
export interface PatientMetadata {
  name: string
  geburtsdatum: string
  updatedAt: string
}

interface LegacyPatientMetadata {
  name?: string
  age?: string
  geburtsdatum?: string
  updatedAt?: string
}

export interface LoadedPatientMetadata {
  metadata: PatientMetadata
  /** Present when migrating vaults that stored age locally; move to clinical payload. */
  migratedAge?: string
}

export interface EncryptedVaultBlob {
  version: number
  ciphertext: string
  iv: string
  wrappedKey: string
}

export interface StoredKeyMaterial {
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
  deviceId: string
}

const IDB_NAME = 'psychiatry-ink-crypto'
const IDB_VERSION = 1
const KEYS_STORE = 'keys'
const VAULT_STORE = 'vault'
const DEVICE_ID_KEY = 'psychiatry-ink-device-id'

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
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE)
    }
  })
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
    tx.oncomplete = () => db.close()
  })
}

async function idbSet(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value, key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'))
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
  })
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function importRsaKeyPair(publicKeyJwk: JsonWebKey, privateKeyJwk: JsonWebKey) {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey('jwk', publicKeyJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, [
      'encrypt',
      'wrapKey',
    ]),
    crypto.subtle.importKey('jwk', privateKeyJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, [
      'decrypt',
      'unwrapKey',
    ]),
  ])
  return { publicKey, privateKey }
}

async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  )
}

/** Ensure RSA key pair exists in IndexedDB; returns JWK material + device id. */
export async function ensureKeyMaterial(): Promise<StoredKeyMaterial> {
  const cached = await idbGet<StoredKeyMaterial>(KEYS_STORE, 'primary')
  if (cached?.publicKeyJwk && cached?.privateKeyJwk) {
    return { ...cached, deviceId: cached.deviceId ?? getOrCreateDeviceId() }
  }

  const pair = await generateRsaKeyPair()
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.privateKey),
  ])

  const material: StoredKeyMaterial = {
    publicKeyJwk,
    privateKeyJwk,
    deviceId: getOrCreateDeviceId(),
  }
  await idbSet(KEYS_STORE, 'primary', material)
  return material
}

/** Encrypt arbitrary JSON with RSA-wrapped AES-GCM (same pattern as patient vault). */
export async function encryptJsonPayload<T>(payload: T): Promise<EncryptedVaultBlob> {
  const material = await ensureKeyMaterial()
  const { publicKey } = await importRsaKeyPair(material.publicKeyJwk, material.privateKeyJwk)
  return encryptWithPublicKey(payload, publicKey)
}

/** Decrypt JSON blob encrypted with the local RSA key pair. */
export async function decryptJsonPayload<T>(blob: EncryptedVaultBlob): Promise<T> {
  const material = await ensureKeyMaterial()
  const { privateKey } = await importRsaKeyPair(material.publicKeyJwk, material.privateKeyJwk)
  return decryptWithPrivateKey<T>(blob, privateKey)
}

function workspaceVaultIdbKey(caseId?: string): string {
  return `workspace:${caseId ?? getActiveCaseId()}`
}

function patientVaultIdbKey(caseId?: string): string {
  return `patient:${caseId ?? getActiveCaseId()}`
}

export async function getWorkspaceVaultBlob(caseId?: string): Promise<EncryptedVaultBlob | null> {
  const scoped = await idbGet<EncryptedVaultBlob>(VAULT_STORE, workspaceVaultIdbKey(caseId))
  if (scoped) return scoped
  if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
    return idbGet<EncryptedVaultBlob>(VAULT_STORE, 'workspace')
  }
  return null
}

export async function saveWorkspaceVaultBlob(
  blob: EncryptedVaultBlob,
  caseId?: string,
): Promise<void> {
  await idbSet(VAULT_STORE, workspaceVaultIdbKey(caseId), blob)
}

async function encryptWithPublicKey<T>(payload: T, publicKey: CryptoKey): Promise<EncryptedVaultBlob> {
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)
  const wrappedKey = await crypto.subtle.wrapKey('raw', aesKey, publicKey, { name: 'RSA-OAEP' })

  return {
    version: VAULT_VERSION,
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    wrappedKey: bufferToBase64(wrappedKey),
  }
}

async function decryptWithPrivateKey<T>(blob: EncryptedVaultBlob, privateKey: CryptoKey): Promise<T> {
  const aesKey = await crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(blob.wrappedKey),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(blob.iv)) },
    aesKey,
    base64ToBuffer(blob.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

async function encryptMetadata(
  metadata: PatientMetadata,
  publicKey: CryptoKey,
): Promise<EncryptedVaultBlob> {
  return encryptWithPublicKey(metadata, publicKey)
}

function normalizePatientMetadata(raw: LegacyPatientMetadata): LoadedPatientMetadata {
  const migratedAge = raw.age?.trim() || undefined
  return {
    metadata: {
      name: raw.name ?? '',
      geburtsdatum: raw.geburtsdatum ?? '',
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    },
    migratedAge,
  }
}

async function decryptMetadata(
  blob: EncryptedVaultBlob,
  privateKey: CryptoKey,
): Promise<LoadedPatientMetadata> {
  const raw = await decryptWithPrivateKey<LegacyPatientMetadata>(blob, privateKey)
  return normalizePatientMetadata(raw)
}

export async function savePatientMetadata(
  metadata: PatientMetadata,
  caseId?: string,
): Promise<EncryptedVaultBlob> {
  const material = await ensureKeyMaterial()
  const { publicKey } = await importRsaKeyPair(material.publicKeyJwk, material.privateKeyJwk)
  const blob = await encryptMetadata(metadata, publicKey)
  await idbSet(VAULT_STORE, patientVaultIdbKey(caseId), blob)
  return blob
}

export async function loadPatientMetadata(caseId?: string): Promise<LoadedPatientMetadata | null> {
  let blob = await idbGet<EncryptedVaultBlob>(VAULT_STORE, patientVaultIdbKey(caseId))
  if (!blob && (caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
    blob = await idbGet<EncryptedVaultBlob>(VAULT_STORE, 'active')
  }
  if (!blob) return null

  const material = await ensureKeyMaterial()
  const { privateKey } = await importRsaKeyPair(material.publicKeyJwk, material.privateKeyJwk)
  try {
    return await decryptMetadata(blob, privateKey)
  } catch {
    return null
  }
}

export async function importVaultBlob(
  blob: EncryptedVaultBlob,
  caseId?: string,
): Promise<LoadedPatientMetadata> {
  const material = await ensureKeyMaterial()
  const { privateKey } = await importRsaKeyPair(material.publicKeyJwk, material.privateKeyJwk)
  const loaded = await decryptMetadata(blob, privateKey)
  await idbSet(VAULT_STORE, patientVaultIdbKey(caseId), blob)
  return loaded
}

export function serializeVaultBlob(blob: EncryptedVaultBlob): string {
  return JSON.stringify(blob, null, 2)
}

export function parseVaultBlob(json: string): EncryptedVaultBlob {
  const parsed = JSON.parse(json) as EncryptedVaultBlob
  if (
    typeof parsed.version !== 'number' ||
    typeof parsed.ciphertext !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.wrappedKey !== 'string'
  ) {
    throw new Error('Invalid vault file format')
  }
  return parsed
}

export function downloadVaultFile(blob: EncryptedVaultBlob, filename = 'patient-vault.json'): void {
  const content = serializeVaultBlob(blob)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function getActiveVaultBlob(caseId?: string): Promise<EncryptedVaultBlob | null> {
  const scoped = await idbGet<EncryptedVaultBlob>(VAULT_STORE, patientVaultIdbKey(caseId))
  if (scoped) return scoped
  if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
    return idbGet<EncryptedVaultBlob>(VAULT_STORE, 'active')
  }
  return null
}

/** Register public key on server when privacy tier allows (stub for future encrypted sync). */
export async function registerPublicKeyIfAllowed(
  tier: PrivacyTier,
  countryCode: string,
  apiBase = '',
): Promise<{ registered: boolean; reason?: string }> {
  if (!allowsPublicKeyRegistration(tier)) {
    return { registered: false, reason: 'tier_local_only' }
  }

  const material = await ensureKeyMaterial()
  const response = await fetch(`${apiBase}/api/crypto/public-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: material.deviceId,
      publicKeyJwk: material.publicKeyJwk,
      countryCode,
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    return { registered: false, reason: detail?.error ?? `http_${response.status}` }
  }

  return { registered: true }
}

/**
 * Client-side end-to-end encryption (E2EE) for transferred case packages.
 *
 * Identified package payloads are encrypted in the browser with a random,
 * per-package AES-GCM key. The ciphertext is uploaded to Supabase; the key is
 * NEVER sent to the server. Instead it is delivered out-of-band inside the
 * invite-link URL fragment (everything after `#`, which browsers do not send in
 * HTTP requests). The recipient's browser reads the key from the fragment and
 * decrypts locally.
 *
 * The server/DB therefore only ever stores ciphertext for identified content.
 */

export const E2EE_VERSION = 'aes-gcm-256-v1'

export interface EncryptedEnvelope {
  enc: typeof E2EE_VERSION
  /** base64url-encoded AES-GCM ciphertext (includes auth tag). */
  ciphertext: string
  /** base64url-encoded 12-byte IV. */
  iv: string
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    record.enc === E2EE_VERSION &&
    typeof record.ciphertext === 'string' &&
    typeof record.iv === 'string'
  )
}

export async function generatePackageKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return bytesToBase64Url(new Uint8Array(raw))
}

export async function importKeyFromBase64Url(value: string): Promise<CryptoKey> {
  const bytes = base64UrlToBytes(value)
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptJson(key: CryptoKey, data: unknown): Promise<EncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    enc: E2EE_VERSION,
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    iv: bytesToBase64Url(iv),
  }
}

export async function decryptJson<T>(key: CryptoKey, envelope: EncryptedEnvelope): Promise<T> {
  const iv = base64UrlToBytes(envelope.iv)
  const ciphertext = base64UrlToBytes(envelope.ciphertext)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

/** Build the invite-link fragment carrying the decryption key out-of-band. */
export function buildKeyFragment(keyBase64Url: string): string {
  return `#key=${keyBase64Url}`
}

/** Read the decryption key from a URL fragment (defaults to the current hash). */
export function readKeyFromFragment(
  hash: string = typeof window !== 'undefined' ? window.location.hash : '',
): string | null {
  if (!hash) return null
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const key = params.get('key')
  return key && key.trim() ? key.trim() : null
}

const STORAGE_PREFIX_DISCUSS = 'dc:e2ee:'
const STORAGE_PREFIX_KONSIL = 'ks:e2ee:'

export function discussKeyStorageId(discussionId: string): string {
  return `${STORAGE_PREFIX_DISCUSS}${discussionId}`
}

export function konsilKeyStorageId(requestId: string): string {
  return `${STORAGE_PREFIX_KONSIL}${requestId}`
}

/** Persist the raw key (base64url) locally so the creator/recipient can decrypt later. */
export function persistKeyBase64Url(storageId: string, keyBase64Url: string): void {
  try {
    localStorage.setItem(storageId, keyBase64Url)
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

export function loadKeyBase64Url(storageId: string): string | null {
  try {
    return localStorage.getItem(storageId)
  } catch {
    return null
  }
}

/**
 * Resolve a decryption key for a stored resource: prefer the URL fragment (a
 * freshly-opened invite link), otherwise fall back to a previously-persisted
 * local key. When a fragment key is found it is persisted so later views work.
 */
export async function resolveKey(storageId: string): Promise<CryptoKey | null> {
  const fromFragment = readKeyFromFragment()
  if (fromFragment) {
    persistKeyBase64Url(storageId, fromFragment)
    return importKeyFromBase64Url(fromFragment)
  }
  const stored = loadKeyBase64Url(storageId)
  if (stored) return importKeyFromBase64Url(stored)
  return null
}

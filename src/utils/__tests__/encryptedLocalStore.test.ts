// @vitest-environment node
//
// Runs in the `node` env so Web Crypto (`globalThis.crypto.subtle`) is the real Node
// implementation — jsdom's WebCrypto has a cross-realm ArrayBuffer limitation (see the
// note in accountBackupCrypto.test.ts). We mock only the device-key layer
// (`encryptJsonPayload`/`decryptJsonPayload`, which otherwise need IndexedDB-backed RSA
// material) with a real AES-GCM round-trip, so the envelope/prefix/migration logic of
// encryptedLocalStore is exercised against genuine encryption.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../cryptoVault', () => {
  const subtle = globalThis.crypto.subtle
  let keyPromise: Promise<CryptoKey> | null = null
  const getKey = () => {
    if (!keyPromise) {
      keyPromise = subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ])
    }
    return keyPromise
  }
  const toB64 = (buf: ArrayBuffer) => Buffer.from(new Uint8Array(buf)).toString('base64')
  const fromB64 = (s: string) => Uint8Array.from(Buffer.from(s, 'base64'))

  return {
    encryptJsonPayload: async (payload: unknown) => {
      const key = await getKey()
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
      const data = new TextEncoder().encode(JSON.stringify(payload))
      const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
      return { version: 1, ciphertext: toB64(ciphertext), iv: toB64(iv.buffer), wrappedKey: '' }
    },
    decryptJsonPayload: async (blob: { ciphertext: string; iv: string }) => {
      const key = await getKey()
      const plaintext = await subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(blob.iv) },
        key,
        fromB64(blob.ciphertext),
      )
      return JSON.parse(new TextDecoder().decode(plaintext))
    },
  }
})

import {
  ENCRYPTED_STORE_PREFIX,
  isEncryptedEnvelope,
  readEncryptedJson,
  readLegacyPlaintextJson,
  readOrMigrateEncryptedJson,
  writeEncryptedJson,
} from '../encryptedLocalStore'

function installLocalStorage(): void {
  const store = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
  ;(globalThis as { localStorage: Storage }).localStorage = shim
}

const KEY = 'psychiatry-ink:medication-plan:case-123'

describe('encryptedLocalStore', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('round-trips a JSON value through encryption at rest', async () => {
    const value = { meds: ['sertraline 50mg', 'lorazepam 1mg'], notes: 'PHI clinical text' }

    const ok = await writeEncryptedJson(KEY, value)
    expect(ok).toBe(true)

    const stored = localStorage.getItem(KEY)
    expect(stored).not.toBeNull()
    expect(isEncryptedEnvelope(stored)).toBe(true)
    // The clinical free-text must NOT appear in plaintext at rest.
    expect(stored).not.toContain('sertraline')
    expect(stored).not.toContain('PHI clinical text')

    const decrypted = await readEncryptedJson<typeof value>(KEY)
    expect(decrypted).toEqual(value)
  })

  it('returns null for a missing key', async () => {
    expect(await readEncryptedJson('does-not-exist')).toBeNull()
  })

  it('returns null (does not throw) for a corrupt encrypted envelope', async () => {
    localStorage.setItem(KEY, `${ENCRYPTED_STORE_PREFIX}{"v":1,"blob":{"ciphertext":"AAAA","iv":"AAAA","wrappedKey":"","version":1}}`)
    expect(await readEncryptedJson(KEY)).toBeNull()
  })

  it('detects encrypted vs. legacy plaintext entries', async () => {
    localStorage.setItem(KEY, JSON.stringify({ plain: true }))
    expect(isEncryptedEnvelope(localStorage.getItem(KEY))).toBe(false)
    expect(readLegacyPlaintextJson<{ plain: boolean }>(KEY)).toEqual({ plain: true })
    await expect(readEncryptedJson(KEY)).resolves.toBeNull()
  })

  it('migrates a legacy plaintext entry to ciphertext exactly once, leaving no plaintext', async () => {
    const legacy = { meds: ['quetiapine 25mg'], notes: 'legacy PHI' }
    localStorage.setItem(KEY, JSON.stringify(legacy))

    // First hydration migrates the plaintext.
    const migrated = await readOrMigrateEncryptedJson<typeof legacy>(KEY)
    expect(migrated).toEqual(legacy)

    const stored = localStorage.getItem(KEY)
    expect(isEncryptedEnvelope(stored)).toBe(true)
    expect(stored).not.toContain('quetiapine')
    expect(stored).not.toContain('legacy PHI')

    // Subsequent reads decrypt the (now encrypted) value without re-migrating.
    expect(await readEncryptedJson<typeof legacy>(KEY)).toEqual(legacy)
    expect(await readOrMigrateEncryptedJson<typeof legacy>(KEY)).toEqual(legacy)
  })
})

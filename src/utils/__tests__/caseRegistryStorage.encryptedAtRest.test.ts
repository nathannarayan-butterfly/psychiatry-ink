// @vitest-environment node
//
// Store-level coverage for the encrypted-at-rest migration of the case registry (patient
// identifiers / case titles). Runs in the `node` env for real Web Crypto; the device-key
// layer is mocked with a real AES-GCM round-trip.
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

import { ENCRYPTED_STORE_PREFIX } from '../encryptedLocalStore'
import type { LocalCaseMeta } from '../../hooks/useCaseRegistry'
import {
  hydrateCaseRegistryFromEncryptedLocal,
  loadRegistryMapFromStorage,
  REGISTRY_KEY,
  saveRegistryMapToStorage,
} from '../caseRegistryStorage'

function installLocalStorage(): void {
  ;(globalThis as { window?: typeof globalThis }).window = globalThis
  const store = new Map<string, string>()
  ;(globalThis as { localStorage: Storage }).localStorage = {
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
}

function makeMeta(caseId: string, nachname: string): LocalCaseMeta {
  const now = new Date().toISOString()
  return { caseId, localVorname: 'Erika', localNachname: nachname, createdAt: now, lastOpened: now }
}

describe('caseRegistryStorage — encrypted at rest', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists the registry (patient identifiers) as ciphertext, never plaintext', async () => {
    await hydrateCaseRegistryFromEncryptedLocal()
    const map = { 'case-1': makeMeta('case-1', 'Mustermann') }
    saveRegistryMapToStorage(map)

    // The synchronous shadow read returns the saved map immediately.
    expect(loadRegistryMapFromStorage()).toEqual(map)

    for (let i = 0; i < 50 && localStorage.getItem(REGISTRY_KEY) === null; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    const raw = localStorage.getItem(REGISTRY_KEY)
    expect(raw).not.toBeNull()
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Mustermann')
    expect(raw).not.toContain('Erika')
  })

  it('migrates a legacy plaintext registry to ciphertext on hydration and preserves the data', async () => {
    const map = { 'case-2': makeMeta('case-2', 'Beispiel') }
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(map))

    await hydrateCaseRegistryFromEncryptedLocal()

    expect(loadRegistryMapFromStorage()).toEqual(map)

    const raw = localStorage.getItem(REGISTRY_KEY)
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Beispiel')
    expect(raw).not.toContain('Erika')
  })
})

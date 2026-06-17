// @vitest-environment node
//
// Store-level coverage for the encrypted-at-rest migration of the diagnoses PHI cache.
// Runs in the `node` env for real Web Crypto; the device-key layer is mocked with a real
// AES-GCM round-trip (the production RSA-in-IndexedDB path is exercised by the running app).
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

// Keep `saveDiagnosen` side-effect free: the imprint indexer and ISDM rebuild are exercised
// elsewhere and would otherwise pull heavy graph modules into this store-level test.
vi.mock('../clinicalImprint', () => ({ scheduleDiagnosisImprints: vi.fn() }))
vi.mock('../isdm', () => ({ scheduleIsdmRebuild: vi.fn() }))
vi.mock('../../services/diagnosisReferenceApi', () => ({ fetchCrosswalkByIcd10: vi.fn() }))

import { ENCRYPTED_STORE_PREFIX } from '../encryptedLocalStore'
import {
  hydrateDiagnosenFromEncryptedLocal,
  loadDiagnosen,
  saveDiagnosen,
  type DiagnoseEntry,
} from '../diagnosenArchive'

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

function makeEntry(label: string): DiagnoseEntry {
  const now = new Date().toISOString()
  return {
    id: `id-${label}`,
    icd10: { code: 'F20.0', label, overridden: true },
    icd11: { code: '', label: '', overridden: false },
    dsm: { code: '', label: '', overridden: false },
    createdAt: now,
    updatedAt: now,
  }
}

describe('diagnosenArchive — encrypted at rest', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists saved diagnoses as ciphertext, never plaintext', async () => {
    const caseId = 'dx-save'
    saveDiagnosen(caseId, [makeEntry('Paranoide Schizophrenie')])

    // Save is synchronous against the shadow; the encrypted write is fire-and-forget.
    expect(loadDiagnosen(caseId)).toHaveLength(1)

    const key = `diagnosen:${caseId}`
    for (let i = 0; i < 50 && localStorage.getItem(key) === null; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    const raw = localStorage.getItem(key)
    expect(raw).not.toBeNull()
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Paranoide Schizophrenie')
  })

  it('migrates a legacy plaintext entry to ciphertext on hydration and preserves the data', async () => {
    const caseId = 'dx-legacy'
    const legacy = [makeEntry('Schwere depressive Episode')]
    localStorage.setItem(`diagnosen:${caseId}`, JSON.stringify(legacy))

    await hydrateDiagnosenFromEncryptedLocal(caseId)

    expect(loadDiagnosen(caseId)).toEqual(legacy)

    const raw = localStorage.getItem(`diagnosen:${caseId}`)
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Schwere depressive Episode')
  })
})

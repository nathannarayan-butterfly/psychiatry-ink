// @vitest-environment node
//
// Store-level coverage for the encrypted-at-rest migration of a PHI localStorage cache.
// Runs in the `node` env for real Web Crypto; the device-key layer is mocked with a real
// AES-GCM round-trip (the production RSA-in-IndexedDB path is exercised by the running app).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../cryptoVault', () => {
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

import { ENCRYPTED_STORE_PREFIX } from '../../encryptedLocalStore'
import type { SozialtherapieTarget } from '../../../types/sozialtherapie'
import {
  hydrateSozialtherapieFromEncryptedLocal,
  loadSozialtherapie,
  saveSozialtherapie,
} from '../storage'

function installLocalStorage(): void {
  // The store schedules a debounced persist via `window.setTimeout`; alias `window` to the
  // node globals so the timer API is available.
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

function makeTarget(area: string, notes: string): SozialtherapieTarget {
  const now = new Date().toISOString()
  return {
    id: `id-${area}`,
    area,
    status: 'open',
    goal: '',
    currentMeasure: '',
    responsibleRole: '',
    tasks: [],
    notes,
    nextSteps: '',
    dates: '',
    createdAt: now,
    updatedAt: now,
  }
}

const LS_PREFIX = 'psychiatry-ink:sozialtherapie:'

describe('sozialtherapie storage — encrypted at rest', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists saved targets as ciphertext, never plaintext', async () => {
    const caseId = 'soz-save'
    saveSozialtherapie([makeTarget('wohnen', 'Patient lives alone, needs supported housing')], caseId)

    // The async encrypted write is fire-and-forget; poll until the ciphertext lands.
    const key = `${LS_PREFIX}${caseId}`
    for (let i = 0; i < 50 && localStorage.getItem(key) === null; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    const raw = localStorage.getItem(key)
    expect(raw).not.toBeNull()
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('supported housing')
    expect(raw).not.toContain('wohnen')
  })

  it('migrates a legacy plaintext entry to ciphertext on hydration and preserves the data', async () => {
    const caseId = 'soz-legacy'
    const legacy = [makeTarget('finanzen', 'Debt counselling referral pending')]
    localStorage.setItem(`${LS_PREFIX}${caseId}`, JSON.stringify(legacy))

    await hydrateSozialtherapieFromEncryptedLocal(caseId)

    // Data is preserved and now served from the in-memory cache...
    expect(loadSozialtherapie(caseId)).toEqual(legacy)

    // ...and the on-disk copy has been rewritten as ciphertext with no plaintext left behind.
    const raw = localStorage.getItem(`${LS_PREFIX}${caseId}`)
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Debt counselling')
    expect(raw).not.toContain('finanzen')
  })
})

// @vitest-environment node
//
// Store-level coverage for the encrypted-at-rest migration of the document-snapshot PHI cache
// (the largest clinical free-text exposure). Runs in the `node` env for real Web Crypto; the
// device-key layer is mocked with a real AES-GCM round-trip.
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

// The imprint indexer is exercised elsewhere; stub it so this store-level test stays isolated.
vi.mock('../clinicalImprint', () => ({ scheduleDocumentSnapshotImprints: vi.fn() }))

import { ENCRYPTED_STORE_PREFIX } from '../encryptedLocalStore'
import {
  hydrateNotionDocumentsFromEncryptedLocal,
  loadNotionDocumentSnapshot,
  notionDocumentSnapshotKey,
  saveNotionDocumentSnapshot,
  type NotionDocumentSnapshot,
} from '../notionDocumentActions'

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

function makeSnapshot(text: string): NotionDocumentSnapshot {
  return {
    documentTypeId: 'aufnahme',
    pageHeading: 'Aufnahmebefund',
    sectionContents: { aufnahmeanlass: text },
    savedAt: new Date().toISOString(),
  }
}

const SECRET = 'Patient berichtet von akuter Suizidalität'

describe('notionDocumentActions — encrypted at rest', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists saved document section text as ciphertext, never plaintext', async () => {
    const caseId = 'doc-save'
    saveNotionDocumentSnapshot(makeSnapshot(SECRET), caseId)

    // Save is synchronous against the shadow; the encrypted write is fire-and-forget.
    expect(loadNotionDocumentSnapshot('aufnahme', caseId)?.sectionContents.aufnahmeanlass).toBe(SECRET)

    const key = notionDocumentSnapshotKey('aufnahme', caseId)
    for (let i = 0; i < 50 && localStorage.getItem(key) === null; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    const raw = localStorage.getItem(key)
    expect(raw).not.toBeNull()
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Suizidalität')
  })

  it('migrates a legacy plaintext snapshot to ciphertext on hydration and preserves the data', async () => {
    const caseId = 'doc-legacy'
    const legacy = makeSnapshot(SECRET)
    const key = notionDocumentSnapshotKey('aufnahme', caseId)
    localStorage.setItem(key, JSON.stringify(legacy))

    await hydrateNotionDocumentsFromEncryptedLocal(caseId)

    expect(loadNotionDocumentSnapshot('aufnahme', caseId)).toEqual(legacy)

    const raw = localStorage.getItem(key)
    expect(raw!.startsWith(ENCRYPTED_STORE_PREFIX)).toBe(true)
    expect(raw).not.toContain('Suizidalität')
    expect(raw).not.toContain('Aufnahmebefund')
  })

  it('round-trips the Vidieren (finalize) status alongside section content', async () => {
    const caseId = 'doc-finalized'
    const snapshot: NotionDocumentSnapshot = {
      ...makeSnapshot(SECRET),
      status: 'finalized',
      finalizedAt: '2026-07-01T12:00:00.000Z',
      finalizedBy: 'Dr. Test',
    }
    saveNotionDocumentSnapshot(snapshot, caseId)

    const loaded = loadNotionDocumentSnapshot('aufnahme', caseId)
    expect(loaded?.status).toBe('finalized')
    expect(loaded?.finalizedAt).toBe('2026-07-01T12:00:00.000Z')
    expect(loaded?.finalizedBy).toBe('Dr. Test')
  })
})

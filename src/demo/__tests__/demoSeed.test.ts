import { describe, expect, it, beforeEach, vi } from 'vitest'
import { buildDemoPatientFixture } from '../buildDemoFixture'
import { seedDemoPatient } from '../seedDemoPatient'
import { resetDemoPatient } from '../ensureDemoPatient'
import { demoCaseIdForLocale } from '../constants'
import { ensureCaseRegistryHydrated, getCaseMeta } from '../../hooks/useCaseRegistry'

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
    length: storage.size,
  })
  vi.stubGlobal('sessionStorage', {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid',
    subtle: {},
    getRandomValues: (arr: Uint8Array) => arr,
  })
  vi.stubGlobal('indexedDB', {
    open: () => ({
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: {
        transaction: () => ({
          objectStore: () => ({
            get: (_key: string) => ({ onsuccess: null, onerror: null, result: undefined }),
            put: (_val: unknown, _key: string) => ({ onsuccess: null, onerror: null }),
            delete: (_key: string) => ({ onsuccess: null, onerror: null }),
          }),
          oncomplete: null,
          onerror: null,
        }),
      },
    }),
  })
})

vi.mock('../../utils/workspaceVault', () => ({
  WORKSPACE_PAYLOAD_VERSION: 8,
  applyClinicalPayload: vi.fn(),
  saveEncryptedWorkspace: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../utils/befundArchive', () => ({
  saveDiagnostikBefunde: vi.fn(),
}))

vi.mock('../../utils/sozialtherapie/storage', () => ({
  saveSozialtherapie: vi.fn(),
}))

vi.mock('../../utils/verlaufFeed', () => ({
  saveVerlaufFeed: vi.fn(),
  saveVerlaufAnnotations: vi.fn(),
}))

vi.mock('../../utils/generatedDocumentsVault', () => ({
  saveGeneratedDocument: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/calendarStore', () => ({
  listLocalCalendarItems: vi.fn().mockResolvedValue([]),
  calendarStorageKey: (scope: { userId: string }) => `psychiatry-ink:calendar:${scope.userId}`,
}))

vi.mock('../../services/patientRegistryApi', () => ({
  createPatientOnApi: vi.fn().mockResolvedValue({}),
  upsertPatientOnApi: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../demo/demoUserState', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../demo/demoUserState')>()
  return {
    ...actual,
    patchDemoUserState: vi.fn(),
  }
})

vi.mock('../../utils/cryptoVault', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/cryptoVault')>()
  // Round-trip stubs: encrypt/decrypt stash the value in `ciphertext` so that
  // `writeEncryptedJson` → `readEncryptedJson` can round-trip in tests without
  // real Web Crypto. Without the matching `decryptJsonPayload` mock, the
  // case-registry blob written by `upsertCaseMeta` could not be read back and
  // assertions on `getCaseMeta(...)` would see `undefined`.
  return {
    ...actual,
    savePatientMetadata: vi.fn().mockResolvedValue({}),
    ensureKeyMaterial: vi.fn().mockResolvedValue({
      publicKeyJwk: {},
      privateKeyJwk: {},
      deviceId: 'dev',
    }),
    encryptJsonPayload: vi.fn(async (value: unknown) => ({
      version: 1,
      ciphertext: JSON.stringify(value),
      iv: 'y',
      wrappedKey: 'z',
    })),
    decryptJsonPayload: vi.fn(async (blob: { ciphertext: string }) =>
      JSON.parse(blob.ciphertext),
    ),
    saveWorkspaceVaultBlob: vi.fn().mockResolvedValue(undefined),
  }
})

describe('seedDemoPatient', () => {
  it('creates demo registry entry with markers', async () => {
    // `upsertCaseMeta` triggers an async case-registry hydrate when the
    // synchronous shadow has not been populated yet. Awaiting here makes the
    // post-seed `getCaseMeta` read deterministic across test runs.
    await ensureCaseRegistryHydrated()

    const result = await seedDemoPatient({ userId: 'user-1', skipValidation: false, force: true, locale: 'en' })
    expect(result.ok).toBe(true)
    expect(result.caseId).toBe(demoCaseIdForLocale('en'))
    expect(result.counts.verlaufEntries).toBeGreaterThanOrEqual(12)

    const caseId = demoCaseIdForLocale('en')
    const meta = getCaseMeta(caseId)
    expect(meta?.isDemoPatient).toBe(true)
    expect(meta?.localNachname).toBe('Demo')
  })
})

vi.mock('../clearDemoCaseStorage', () => ({
  clearDemoCaseStorage: vi.fn().mockResolvedValue(undefined),
}))

describe('resetDemoPatient', () => {
  it('clears and re-seeds demo-only storage', async () => {
    await seedDemoPatient({ userId: 'user-1', force: true, locale: 'en' })
    const caseId = demoCaseIdForLocale('en')
    storage.set(`diagnosen:${caseId}`, JSON.stringify([{ id: 'x' }]))

    await resetDemoPatient({ userId: 'user-1', force: true, locale: 'en' })

    expect(getCaseMeta(caseId)?.isDemoPatient).toBe(true)
    expect(getCaseMeta(caseId)?.localNachname).toBe('Demo')
  })
})

describe('fixture module coverage', () => {
  it('loads without crash for QA modules', () => {
    const f = buildDemoPatientFixture()
    expect(f.modulePlaceholders.consultation).toBeDefined()
    expect(f.modulePlaceholders.discussCase).toBeDefined()
  })
})

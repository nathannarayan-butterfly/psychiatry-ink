import { describe, expect, it, beforeEach, vi } from 'vitest'
import { buildDemoPatientFixture } from '../buildDemoFixture'
import { seedDemoPatient } from '../seedDemoPatient'
import { resetDemoPatient } from '../ensureDemoPatient'
import { DEMO_CASE_ID } from '../constants'
import { getCaseMeta } from '../../hooks/useCaseRegistry'

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

vi.mock('../../demo/demoUserState', () => ({
  patchDemoUserState: vi.fn(),
}))

vi.mock('../../utils/cryptoVault', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/cryptoVault')>()
  return {
    ...actual,
    savePatientMetadata: vi.fn().mockResolvedValue({}),
    ensureKeyMaterial: vi.fn().mockResolvedValue({
      publicKeyJwk: {},
      privateKeyJwk: {},
      deviceId: 'dev',
    }),
    encryptJsonPayload: vi.fn().mockResolvedValue({
      version: 1,
      ciphertext: 'x',
      iv: 'y',
      wrappedKey: 'z',
    }),
    saveWorkspaceVaultBlob: vi.fn().mockResolvedValue(undefined),
  }
})

describe('seedDemoPatient', () => {
  it('creates demo registry entry with markers', async () => {
    const result = await seedDemoPatient({ userId: 'user-1', skipValidation: false, force: true })
    expect(result.ok).toBe(true)
    expect(result.caseId).toBe(DEMO_CASE_ID)

    const meta = getCaseMeta(DEMO_CASE_ID)
    expect(meta?.isDemoPatient).toBe(true)
    expect(meta?.localNachname).toBe('Demo')
    expect(result.counts.verlaufEntries).toBeGreaterThanOrEqual(12)
  })
})

vi.mock('../clearDemoCaseStorage', () => ({
  clearDemoCaseStorage: vi.fn().mockResolvedValue(undefined),
}))

describe('resetDemoPatient', () => {
  it('clears and re-seeds demo-only storage', async () => {
    await seedDemoPatient({ userId: 'user-1', force: true })
    storage.set(`diagnosen:${DEMO_CASE_ID}`, JSON.stringify([{ id: 'x' }]))

    await resetDemoPatient({ userId: 'user-1', force: true })

    expect(getCaseMeta(DEMO_CASE_ID)?.isDemoPatient).toBe(true)
    expect(getCaseMeta(DEMO_CASE_ID)?.localNachname).toBe('Demo')
  })
})

describe('fixture module coverage', () => {
  it('loads without crash for QA modules', () => {
    const f = buildDemoPatientFixture()
    expect(f.modulePlaceholders.consultation).toBeDefined()
    expect(f.modulePlaceholders.discussCase).toBeDefined()
  })
})

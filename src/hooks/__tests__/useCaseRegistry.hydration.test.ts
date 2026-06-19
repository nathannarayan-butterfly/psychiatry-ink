// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/caseRegistryStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/caseRegistryStorage')>()
  let shadow: Record<string, unknown> | null = null
  let shadowHydrated = false

  return {
    ...actual,
    isRegistryShadowHydrated: () => shadowHydrated,
    loadRegistryMapFromStorage: () => (shadow ? { ...shadow } : {}),
    saveRegistryMapToStorage: (map: Record<string, unknown>) => {
      shadow = { ...map }
      if (!shadowHydrated) return
      actual.saveRegistryMapToStorage(map as never)
    },
    hydrateCaseRegistryFromEncryptedLocal: async () => {
      shadow = {
        'existing-case': {
          caseId: 'existing-case',
          localNachname: 'Araya',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastOpened: '2024-01-01T00:00:00.000Z',
        },
      }
      shadowHydrated = true
    },
  }
})

vi.mock('../../services/patientRegistryApi', () => ({
  fetchPatientsFromApi: vi.fn(async () => []),
  createPatientOnApi: vi.fn(async (meta: { caseId: string }) => meta),
  upsertPatientOnApi: vi.fn(async (meta: { caseId: string }) => meta),
}))

describe('useCaseRegistry — pre-hydration upsert safety', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('does not clobber existing registry entries when upsert runs before hydration', async () => {
    const mod = await import('../useCaseRegistry')

    mod.upsertCaseMeta('new-case', { lastOpened: '2024-06-01T00:00:00.000Z' })
    await mod.ensureCaseRegistryHydrated()

    expect(mod.getCaseMeta('existing-case')?.localNachname).toBe('Araya')
    expect(mod.getCaseMeta('new-case')?.lastOpened).toBe('2024-06-01T00:00:00.000Z')
  })
})

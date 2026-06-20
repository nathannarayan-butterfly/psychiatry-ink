import { beforeEach, describe, expect, it, vi } from 'vitest'

const clearDemoCaseStorage = vi.fn(async () => {})
const deleteImportedFilesForCase = vi.fn(async () => {})
const loadRegistryMapFromStorage = vi.fn(() => ({
  'case-1': { caseId: 'case-1', createdAt: '2026-01-01', lastOpened: '2026-01-01' },
  'case-2': { caseId: 'case-2', createdAt: '2026-01-02', lastOpened: '2026-01-02' },
  'DEMO-CASE-0001': {
    caseId: 'DEMO-CASE-0001',
    isDemoPatient: true,
    createdAt: '2026-01-01',
    lastOpened: '2026-01-01',
  },
}))
const saveRegistryMapToStorage = vi.fn()
const replaceRegistryMap = vi.fn()
const deletePatientOnApi = vi.fn(async () => {})
const scheduleAccountRegistryUpload = vi.fn()

vi.mock('../../demo', () => ({
  isDemoCase: (caseId: string) => caseId === 'DEMO-CASE-0001',
  removeDemoPatient: vi.fn(),
  archiveDemoPatient: vi.fn(),
}))
vi.mock('../../demo/clearDemoCaseStorage', () => ({ clearDemoCaseStorage }))
vi.mock('../documentImport/importedFileStore', () => ({ deleteImportedFilesForCase }))
vi.mock('../caseRegistryStorage', () => ({
  loadRegistryMapFromStorage,
  saveRegistryMapToStorage,
}))
vi.mock('../../hooks/useCaseRegistry', () => ({ replaceRegistryMap }))
vi.mock('../../services/patientRegistryApi', () => ({ deletePatientOnApi }))
vi.mock('../accountBackup', () => ({ scheduleAccountRegistryUpload }))

describe('purgeNonDemoPatientCases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes every case except the synthetic demo case', async () => {
    const { purgeNonDemoPatientCases } = await import('../casePatientLifecycle')

    const removed = await purgeNonDemoPatientCases('user-1')

    expect(removed).toEqual(['case-1', 'case-2'])
    expect(clearDemoCaseStorage).toHaveBeenCalledTimes(2)
    expect(deletePatientOnApi).toHaveBeenCalledWith('case-1')
    expect(deletePatientOnApi).toHaveBeenCalledWith('case-2')
  })
})

describe('deletePatientCasePermanently', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears local storage, imported files, registry, and schedules cloud registry sync', async () => {
    const { deletePatientCasePermanently } = await import('../casePatientLifecycle')

    await deletePatientCasePermanently('case-1', 'user-1')

    expect(clearDemoCaseStorage).toHaveBeenCalledWith('case-1')
    expect(deleteImportedFilesForCase).toHaveBeenCalledWith('case-1')
    expect(saveRegistryMapToStorage).toHaveBeenCalledWith({
      'case-2': { caseId: 'case-2', createdAt: '2026-01-02', lastOpened: '2026-01-02' },
      'DEMO-CASE-0001': {
        caseId: 'DEMO-CASE-0001',
        isDemoPatient: true,
        createdAt: '2026-01-01',
        lastOpened: '2026-01-01',
      },
    })
    expect(replaceRegistryMap).toHaveBeenCalledWith({
      'case-2': { caseId: 'case-2', createdAt: '2026-01-02', lastOpened: '2026-01-02' },
      'DEMO-CASE-0001': {
        caseId: 'DEMO-CASE-0001',
        isDemoPatient: true,
        createdAt: '2026-01-01',
        lastOpened: '2026-01-01',
      },
    })
    expect(scheduleAccountRegistryUpload).toHaveBeenCalled()
    expect(deletePatientOnApi).toHaveBeenCalledWith('case-1')
  })
})

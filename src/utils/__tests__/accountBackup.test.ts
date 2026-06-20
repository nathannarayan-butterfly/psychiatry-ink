// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalCaseMeta } from '../../hooks/useCaseRegistry'

const fetchAccountBackupStatus = vi.fn()
const fetchRegistryBackupFromServer = vi.fn()
const uploadRegistryBackupToServer = vi.fn()
const loadRegistryMapFromStorage = vi.fn<() => Record<string, LocalCaseMeta>>(() => ({}))
const replaceRegistryMap = vi.fn()
const ensureCaseRegistryHydrated = vi.fn(async () => {})
const syncPrivacyIdentifierStorage = vi.fn()
const decryptJsonWithPassphrase = vi.fn()
const encryptJsonWithPassphrase = vi.fn()
const getAccountBackupPassphrase = vi.fn(() => null as string | null)

vi.mock('../../services/accountBackupApi', () => ({
  fetchAccountBackupStatus,
  fetchKeyBackupFromServer: vi.fn(),
  fetchRegistryBackupFromServer,
  uploadKeyBackupToServer: vi.fn(),
  uploadRegistryBackupToServer,
}))

vi.mock('../caseRegistryStorage', () => ({
  loadRegistryMapFromStorage,
}))

vi.mock('../../hooks/useCaseRegistry', () => ({
  ensureCaseRegistryHydrated,
  replaceRegistryMap,
}))

vi.mock('../../hooks/usePrivacySettings', () => ({
  syncPrivacyIdentifierStorage,
}))

vi.mock('../accountBackupCrypto', () => ({
  decryptJsonWithPassphrase,
  encryptJsonWithPassphrase,
}))

vi.mock('../accountBackupSession', () => ({
  getAccountBackupPassphrase,
  isAccountBackupUnlocked: vi.fn(() => false),
  setAccountBackupUnlocked: vi.fn(),
  clearAccountBackupUnlock: vi.fn(),
}))

vi.mock('../identifierStorage', () => ({
  usesAccountIdentifierSync: vi.fn(() => false),
}))

vi.mock('../cryptoVault', () => ({
  getActiveVaultBlob: vi.fn(async () => null),
  importVaultBlob: vi.fn(),
  getOrCreateDeviceId: vi.fn(() => 'device-1'),
}))

vi.mock('../passphraseRecovery', () => ({
  getPassphraseBackup: vi.fn(),
  createPassphraseBackup: vi.fn(),
  restorePrivateKeyFromPassphrase: vi.fn(),
}))

vi.mock('../../services/authHeaders', () => ({
  getAuthHeaders: vi.fn(async () => ({})),
}))

vi.mock('../../services/apiClient', () => ({
  API_BASE: 'http://test',
}))

describe('accountBackup — registry restore after storage clear', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    loadRegistryMapFromStorage.mockReturnValue({})
    fetchAccountBackupStatus.mockResolvedValue({ hasRegistryBackup: true, hasKeyBackup: true })
    fetchRegistryBackupFromServer.mockResolvedValue({
      version: 1,
      salt: 's',
      iv: 'i',
      ciphertext: 'c',
      iterations: 310_000,
    })
    decryptJsonWithPassphrase.mockResolvedValue({
      version: 2,
      identifiers: {
        'case-1': {
          caseId: 'case-1',
          localVorname: 'Erika',
          localNachname: 'Mustermann',
        },
      },
      patientVaults: {},
    })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('restores registry from account even when local identifier mode reset to device', { timeout: 30000 }, async () => {
    const { tryAutoRestoreRegistryFromAccount } = await import('../accountBackup')

    const restored = await tryAutoRestoreRegistryFromAccount('test-passphrase')

    expect(restored).toBe(1)
    expect(replaceRegistryMap).toHaveBeenCalled()
    expect(syncPrivacyIdentifierStorage).toHaveBeenCalledWith('account')
  })

  it('reports restore needed when server backup exists but local map has no names', async () => {
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })

    const { isAccountRegistryRestoreNeeded } = await import('../accountBackup')
    await expect(isAccountRegistryRestoreNeeded()).resolves.toBe(true)
  })

  it('does not upload an empty identifier payload over an existing server backup', async () => {
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })

    const { usesAccountIdentifierSync } = await import('../identifierStorage')
    vi.mocked(usesAccountIdentifierSync).mockReturnValue(true)

    const mod = await import('../accountBackup')
    await mod.uploadAccountCloudBackup('test-passphrase')

    expect(uploadRegistryBackupToServer).not.toHaveBeenCalled()
  })
})

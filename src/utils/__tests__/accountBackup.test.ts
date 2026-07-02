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

const decryptJsonPayload = vi.fn()
const encryptJsonPayload = vi.fn(async () => ({
  version: 1,
  ciphertext: 'c',
  iv: 'i',
  wrappedKey: 'wk',
}))

vi.mock('../cryptoVault', () => ({
  getActiveVaultBlob: vi.fn(async () => null),
  importVaultBlob: vi.fn(),
  getOrCreateDeviceId: vi.fn(() => 'device-1'),
  saveWorkspaceVaultBlob: vi.fn(),
  decryptJsonPayload,
  encryptJsonPayload,
}))

let linkedUserId: string | null = null
vi.mock('../accountKeyLink', () => ({
  markAccountKeyLinked: vi.fn(),
  isAccountKeyLinked: vi.fn(() => Boolean(linkedUserId)),
  getLinkedAccountUserId: vi.fn(() => linkedUserId),
  clearAccountKeyLink: vi.fn(),
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

describe('accountBackup — cross-device identifier merge (nicht-zugeordnet fix)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    linkedUserId = null
    fetchAccountBackupStatus.mockResolvedValue({ hasRegistryBackup: true, hasKeyBackup: true })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('merges identifiers for a NEW case even when the device already has a named patient', async () => {
    // Regression: the old wholesale skip ("device has any identifiers → skip")
    // left cases created on another device permanently "nicht zugeordnet".
    loadRegistryMapFromStorage.mockReturnValue({
      'case-old': {
        caseId: 'case-old',
        localVorname: 'Max',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
      'case-new': {
        caseId: 'case-new',
        createdAt: '2024-02-01T00:00:00.000Z',
        lastOpened: '2024-02-01T00:00:00.000Z',
      },
    })
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
        'case-new': { caseId: 'case-new', localVorname: 'Erika', localNachname: 'Mustermann' },
      },
      patientVaults: {},
    })

    const { tryAutoRestoreRegistryFromAccount } = await import('../accountBackup')
    const gained = await tryAutoRestoreRegistryFromAccount('test-passphrase')

    expect(gained).toBe(1)
    const mergedMap = replaceRegistryMap.mock.calls[0][0] as Record<string, LocalCaseMeta>
    expect(mergedMap['case-new'].localVorname).toBe('Erika')
    expect(mergedMap['case-old'].localVorname).toBe('Max')
  })

  it('never overwrites local non-empty identifiers with backup values', async () => {
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        localVorname: 'Lokal',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })
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
        'case-1': { caseId: 'case-1', localVorname: 'Backup', localNachname: 'Nachname' },
      },
      patientVaults: {},
    })

    const { tryAutoRestoreRegistryFromAccount } = await import('../accountBackup')
    const gained = await tryAutoRestoreRegistryFromAccount('test-passphrase')

    const mergedMap = replaceRegistryMap.mock.calls[0][0] as Record<string, LocalCaseMeta>
    expect(mergedMap['case-1'].localVorname).toBe('Lokal')
    expect(mergedMap['case-1'].localNachname).toBe('Nachname')
    expect(gained).toBe(1)
  })

  it('tryRestoreRegistryWithDeviceKey decrypts v2 blobs without a passphrase on linked devices', async () => {
    linkedUserId = 'user-1'
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })
    fetchRegistryBackupFromServer.mockResolvedValue({
      version: 2,
      salt: 'wrapped-key',
      iv: 'i',
      ciphertext: 'c',
      iterations: 0,
    })
    decryptJsonPayload.mockResolvedValue({
      version: 2,
      identifiers: { 'case-1': { caseId: 'case-1', localVorname: 'Erika' } },
      patientVaults: {},
    })

    const { tryRestoreRegistryWithDeviceKey } = await import('../accountBackup')
    const gained = await tryRestoreRegistryWithDeviceKey()

    expect(gained).toBe(1)
    expect(decryptJsonPayload).toHaveBeenCalledWith(
      expect.objectContaining({ wrappedKey: 'wrapped-key' }),
    )
    expect(decryptJsonWithPassphrase).not.toHaveBeenCalled()
  })

  it('tryRestoreRegistryWithDeviceKey returns null for legacy v1 blobs (passphrase still required)', async () => {
    linkedUserId = 'user-1'
    fetchRegistryBackupFromServer.mockResolvedValue({
      version: 1,
      salt: 's',
      iv: 'i',
      ciphertext: 'c',
      iterations: 310_000,
    })

    const { tryRestoreRegistryWithDeviceKey } = await import('../accountBackup')
    await expect(tryRestoreRegistryWithDeviceKey()).resolves.toBeNull()
  })

  it('restore-needed detects a single ID-only case among named ones', async () => {
    loadRegistryMapFromStorage.mockReturnValue({
      'case-old': {
        caseId: 'case-old',
        localVorname: 'Max',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
      'case-new': {
        caseId: 'case-new',
        createdAt: '2024-02-01T00:00:00.000Z',
        lastOpened: '2024-02-01T00:00:00.000Z',
      },
    })

    const { isAccountRegistryRestoreNeeded } = await import('../accountBackup')
    await expect(isAccountRegistryRestoreNeeded()).resolves.toBe(true)
  })

  it('uploads the v2 (account-key-wrapped) registry backup without a passphrase session', async () => {
    linkedUserId = 'user-1'
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        localVorname: 'Erika',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })
    const { usesAccountIdentifierSync } = await import('../identifierStorage')
    vi.mocked(usesAccountIdentifierSync).mockReturnValue(true)

    const mod = await import('../accountBackup')
    await mod.uploadAccountCloudBackup('test-passphrase')

    expect(uploadRegistryBackupToServer).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2, salt: 'wk' }),
    )
    expect(encryptJsonWithPassphrase).not.toHaveBeenCalled()
  })
})

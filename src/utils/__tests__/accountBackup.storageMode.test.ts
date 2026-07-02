// @vitest-environment node
//
// Proves the signup storage-mode choice (device vs account) is HONORED when the
// passphrase backup is set up: the passphrase-wrapped key is always uploaded,
// but the encrypted patient-identifier registry is uploaded only in account
// mode (zero-knowledge: device-only identifiers never leave the device).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalCaseMeta } from '../../hooks/useCaseRegistry'

const uploadKeyBackupToServer = vi.fn(async () => {})
const uploadRegistryBackupToServer = vi.fn(async () => {})
const fetchAccountBackupStatus = vi.fn(async () => ({
  hasKeyBackup: false,
  hasRegistryBackup: false,
}))
const loadRegistryMapFromStorage = vi.fn<() => Record<string, LocalCaseMeta>>(() => ({}))
const usesAccountIdentifierSync = vi.fn(() => false)
const encryptJsonWithPassphrase = vi.fn(async () => ({
  version: 1,
  salt: 's',
  iv: 'i',
  ciphertext: 'c',
  iterations: 310_000,
}))
const createPassphraseBackup = vi.fn(async () => ({
  version: 1,
  salt: 's',
  iv: 'i',
  ciphertext: 'c',
  iterations: 310_000,
}))
const getPassphraseBackup = vi.fn(async () => null)
// Registry backups are now wrapped with the account RSA key (envelope v2), not
// the passphrase — see uploadIdentifierBackupIfEnabled.
const encryptJsonPayload = vi.fn(async () => ({
  version: 1,
  ciphertext: 'c',
  iv: 'i',
  wrappedKey: 'wk',
}))

vi.mock('../../services/accountBackupApi', () => ({
  fetchAccountBackupStatus,
  fetchKeyBackupFromServer: vi.fn(),
  fetchRegistryBackupFromServer: vi.fn(),
  uploadKeyBackupToServer,
  uploadRegistryBackupToServer,
}))

vi.mock('../caseRegistryStorage', () => ({ loadRegistryMapFromStorage }))

vi.mock('../../hooks/useCaseRegistry', () => ({
  ensureCaseRegistryHydrated: vi.fn(async () => {}),
  replaceRegistryMap: vi.fn(),
}))

vi.mock('../../hooks/usePrivacySettings', () => ({ syncPrivacyIdentifierStorage: vi.fn() }))

vi.mock('../accountBackupCrypto', () => ({
  decryptJsonWithPassphrase: vi.fn(),
  encryptJsonWithPassphrase,
}))

vi.mock('../accountBackupSession', () => ({
  getAccountBackupPassphrase: vi.fn(() => null),
  isAccountBackupUnlocked: vi.fn(() => false),
  setAccountBackupUnlocked: vi.fn(),
  clearAccountBackupUnlock: vi.fn(),
}))

vi.mock('../identifierStorage', () => ({
  usesAccountIdentifierSync,
  markIdentifierStorageAcknowledged: vi.fn(),
}))

vi.mock('../cryptoVault', () => ({
  getActiveVaultBlob: vi.fn(async () => null),
  importVaultBlob: vi.fn(),
  getOrCreateDeviceId: vi.fn(() => 'device-1'),
  saveWorkspaceVaultBlob: vi.fn(),
  encryptJsonPayload,
  decryptJsonPayload: vi.fn(),
}))

vi.mock('../passphraseRecovery', () => ({
  getPassphraseBackup,
  createPassphraseBackup,
  restorePrivateKeyFromPassphrase: vi.fn(),
}))

vi.mock('../accountKeyLink', () => ({
  markAccountKeyLinked: vi.fn(),
  isAccountKeyLinked: vi.fn(() => false),
  // setupAccountCloudBackup marks the device linked before the identifier
  // upload; the guard reads this getter.
  getLinkedAccountUserId: vi.fn(() => 'user-1'),
}))

vi.mock('../../services/authHeaders', () => ({ getAuthHeaders: vi.fn(async () => ({})) }))
vi.mock('../../services/apiClient', () => ({ API_BASE: 'http://test' }))

describe('setupAccountCloudBackup — honors the signup storage-mode choice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadRegistryMapFromStorage.mockReturnValue({})
    fetchAccountBackupStatus.mockResolvedValue({ hasKeyBackup: false, hasRegistryBackup: false })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('device mode: uploads the key backup but NEVER the identifier registry', async () => {
    usesAccountIdentifierSync.mockReturnValue(false)
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        localVorname: 'Erika',
        localNachname: 'Mustermann',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })

    const mod = await import('../accountBackup')
    await mod.setupAccountCloudBackup('correct horse battery staple', 'user-1')

    expect(uploadKeyBackupToServer).toHaveBeenCalledTimes(1)
    expect(uploadRegistryBackupToServer).not.toHaveBeenCalled()
  })

  it('account mode: uploads BOTH the key backup and the encrypted identifier registry', async () => {
    usesAccountIdentifierSync.mockReturnValue(true)
    loadRegistryMapFromStorage.mockReturnValue({
      'case-1': {
        caseId: 'case-1',
        localVorname: 'Erika',
        localNachname: 'Mustermann',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastOpened: '2024-01-01T00:00:00.000Z',
      },
    })

    const mod = await import('../accountBackup')
    await mod.setupAccountCloudBackup('correct horse battery staple', 'user-1')

    expect(uploadKeyBackupToServer).toHaveBeenCalledTimes(1)
    expect(encryptJsonPayload).toHaveBeenCalledTimes(1)
    expect(uploadRegistryBackupToServer).toHaveBeenCalledTimes(1)
    // v2 envelope: RSA-wrapped AES key rides in the `salt` field.
    expect(uploadRegistryBackupToServer).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2, salt: 'wk' }),
    )
  })
})

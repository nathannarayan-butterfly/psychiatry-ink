import { API_BASE } from '../services/apiClient'
import {
  fetchAccountBackupStatus,
  fetchKeyBackupFromServer,
  fetchRegistryBackupFromServer,
  uploadKeyBackupToServer,
  uploadRegistryBackupToServer,
} from '../services/accountBackupApi'
import { getAuthHeaders } from '../services/authHeaders'
import type { LocalCaseMeta } from '../hooks/useCaseRegistry'
import { loadRegistryMapFromStorage } from './caseRegistryStorage'
import {
  decryptJsonWithPassphrase,
  encryptJsonWithPassphrase,
  type PassphraseEncryptedBlob,
} from './accountBackupCrypto'
import {
  clearAccountBackupUnlock,
  getAccountBackupPassphrase,
  isAccountBackupUnlocked,
  setAccountBackupUnlocked,
} from './accountBackupSession'
import {
  getActiveVaultBlob,
  getOrCreateDeviceId,
  importVaultBlob,
  saveWorkspaceVaultBlob,
  type EncryptedVaultBlob,
} from './cryptoVault'
import { usesAccountIdentifierSync } from './identifierStorage'
import {
  createPassphraseBackup,
  getPassphraseBackup,
  restorePrivateKeyFromPassphrase,
  type PassphraseKeyBackup,
} from './passphraseRecovery'
import {
  applyWorkspacePayloadAsync,
  decryptWorkspaceBlob,
} from './workspaceVault'

export const ACCOUNT_IDENTIFIER_BACKUP_VERSION = 2

/** Name + DOB only — diagnoses live in the clinical case file (workspace snapshot). */
export interface PatientIdentifierRecord {
  caseId: string
  localName?: string
  localVorname?: string
  localNachname?: string
  localGeburtsdatum?: string
}

export interface AccountIdentifierBackupPayload {
  version: number
  identifiers: Record<string, PatientIdentifierRecord>
  patientVaults: Record<string, EncryptedVaultBlob>
}

/** @deprecated v1 bundle — identifiers extracted on restore; diagnoses ignored. */
interface LegacyAccountLocalBackupPayload {
  version?: number
  registry?: Record<string, LocalCaseMeta>
  diagnoses?: unknown
  patientVaults?: Record<string, EncryptedVaultBlob>
}

let identifierUploadTimer: number | null = null

export function isAccountCloudSyncEnabled(): boolean {
  return isAccountBackupUnlocked()
}

function pickIdentifierRecord(meta: LocalCaseMeta): PatientIdentifierRecord {
  return {
    caseId: meta.caseId,
    localName: meta.localName,
    localVorname: meta.localVorname,
    localNachname: meta.localNachname,
    localGeburtsdatum: meta.localGeburtsdatum,
  }
}

function getRegistryMapSnapshot(): Record<string, LocalCaseMeta> {
  return loadRegistryMapFromStorage()
}

async function collectIdentifierBackupPayload(): Promise<AccountIdentifierBackupPayload> {
  const registry = getRegistryMapSnapshot()
  const identifiers: Record<string, PatientIdentifierRecord> = {}
  const patientVaults: Record<string, EncryptedVaultBlob> = {}

  for (const meta of Object.values(registry)) {
    identifiers[meta.caseId] = pickIdentifierRecord(meta)
    const vaultBlob = await getActiveVaultBlob(meta.caseId)
    if (vaultBlob) patientVaults[meta.caseId] = vaultBlob
  }

  return {
    version: ACCOUNT_IDENTIFIER_BACKUP_VERSION,
    identifiers,
    patientVaults,
  }
}

function isIdentifierPayloadV2(raw: unknown): raw is AccountIdentifierBackupPayload {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      'identifiers' in raw &&
      typeof (raw as AccountIdentifierBackupPayload).identifiers === 'object',
  )
}

function normalizeIdentifierPayload(raw: unknown): AccountIdentifierBackupPayload {
  if (isIdentifierPayloadV2(raw)) {
    return {
      version: raw.version ?? ACCOUNT_IDENTIFIER_BACKUP_VERSION,
      identifiers: raw.identifiers,
      patientVaults: raw.patientVaults ?? {},
    }
  }

  const legacy = raw as LegacyAccountLocalBackupPayload
  const identifiers: Record<string, PatientIdentifierRecord> = {}
  for (const [caseId, meta] of Object.entries(legacy.registry ?? {})) {
    if (!meta) continue
    identifiers[caseId] = pickIdentifierRecord({ ...meta, caseId })
  }

  return {
    version: ACCOUNT_IDENTIFIER_BACKUP_VERSION,
    identifiers,
    patientVaults: legacy.patientVaults ?? {},
  }
}

export function registryMapHasIdentifierFields(map: Record<string, LocalCaseMeta>): boolean {
  return Object.values(map).some(
    (meta) =>
      Boolean(meta.localName?.trim()) ||
      Boolean(meta.localVorname?.trim()) ||
      Boolean(meta.localNachname?.trim()) ||
      Boolean(meta.localGeburtsdatum?.trim()),
  )
}

function payloadHasIdentifierFields(payload: AccountIdentifierBackupPayload): boolean {
  return Object.values(payload.identifiers ?? {}).some(
    (record) =>
      Boolean(record.localName?.trim()) ||
      Boolean(record.localVorname?.trim()) ||
      Boolean(record.localNachname?.trim()) ||
      Boolean(record.localGeburtsdatum?.trim()),
  )
}

async function shouldSyncIdentifierBackupToAccount(): Promise<boolean> {
  if (usesAccountIdentifierSync()) return true
  const status = await fetchAccountBackupStatus()
  return Boolean(status?.hasRegistryBackup)
}

async function applyIdentifierBackupPayload(payload: AccountIdentifierBackupPayload): Promise<void> {
  const { replaceRegistryMap } = await import('../hooks/useCaseRegistry')
  const current = loadRegistryMapFromStorage()

  for (const record of Object.values(payload.identifiers ?? {})) {
    const existing = current[record.caseId]
    current[record.caseId] = {
      ...existing,
      caseId: record.caseId,
      localName: record.localName ?? existing?.localName,
      localVorname: record.localVorname ?? existing?.localVorname,
      localNachname: record.localNachname ?? existing?.localNachname,
      localGeburtsdatum: record.localGeburtsdatum ?? existing?.localGeburtsdatum,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastOpened: existing?.lastOpened ?? new Date().toISOString(),
    }
  }

  replaceRegistryMap(current)

  for (const [caseId, blob] of Object.entries(payload.patientVaults ?? {})) {
    try {
      await importVaultBlob(blob, caseId)
    } catch (error) {
      console.warn('[account-backup] patient vault restore failed', caseId, error)
    }
  }
}

async function resolveKeyBackup(): Promise<PassphraseKeyBackup> {
  const remote = await fetchKeyBackupFromServer()
  if (remote) return remote
  const local = await getPassphraseBackup()
  if (local) return local
  throw new Error('No key backup found')
}

async function uploadIdentifierBackupIfEnabled(passphrase: string): Promise<void> {
  if (!(await shouldSyncIdentifierBackupToAccount())) return

  const payload = await collectIdentifierBackupPayload()
  if (!payloadHasIdentifierFields(payload)) {
    const status = await fetchAccountBackupStatus()
    if (status?.hasRegistryBackup) return
  }

  const encrypted = await encryptJsonWithPassphrase(passphrase, payload)
  await uploadRegistryBackupToServer(encrypted)
}

/** Upload passphrase-wrapped key; identifier ciphertext only when account mode is selected. */
export async function uploadAccountCloudBackup(passphrase: string): Promise<void> {
  let keyBackup = await getPassphraseBackup()
  if (!keyBackup) {
    keyBackup = await createPassphraseBackup(passphrase)
  }
  await uploadKeyBackupToServer(keyBackup)
  await uploadIdentifierBackupIfEnabled(passphrase)
}

/** Create passphrase backup and upload per user identifier storage choice. */
export async function setupAccountCloudBackup(passphrase: string): Promise<PassphraseKeyBackup> {
  const backup = await createPassphraseBackup(passphrase)
  await uploadKeyBackupToServer(backup)
  await uploadIdentifierBackupIfEnabled(passphrase)
  setAccountBackupUnlocked(passphrase)
  await tryAutoRestoreRegistryFromAccount(passphrase)
  return backup
}

async function fetchRemoteWorkspaceSnapshot(
  deviceId: string,
  countryCode: string,
  caseId: string,
): Promise<EncryptedVaultBlob | null> {
  const params = new URLSearchParams({ deviceId, countryCode, caseId })
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/workspace/snapshot?${params}`, { headers })
  if (response.status === 404) return null
  if (!response.ok) return null

  const data = (await response.json()) as {
    ciphertext: string
    iv: string
    wrappedKey: string
    version: number
  }

  return {
    version: data.version,
    ciphertext: data.ciphertext,
    iv: data.iv,
    wrappedKey: data.wrappedKey,
  }
}

async function listRemoteWorkspaceCaseIds(
  deviceId: string,
  countryCode: string,
): Promise<string[]> {
  const params = new URLSearchParams({ deviceId, countryCode })
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/workspace/cases?${params}`, { headers })
  if (!response.ok) return []

  const data = (await response.json()) as { cases?: { caseId: string }[] }
  return (data.cases ?? []).map((item) => item.caseId)
}

/** Pull encrypted clinical case files (incl. diagnoses) for all known cases. */
export async function pullWorkspaceSnapshotsFromCloud(countryCode: string): Promise<number> {
  const deviceId = getOrCreateDeviceId()
  const caseIds = new Set<string>([
    ...Object.keys(getRegistryMapSnapshot()),
    ...(await listRemoteWorkspaceCaseIds(deviceId, countryCode)),
  ])

  let restored = 0
  for (const caseId of caseIds) {
    const blob = await fetchRemoteWorkspaceSnapshot(deviceId, countryCode, caseId)
    if (!blob) continue
    try {
      const payload = await decryptWorkspaceBlob(blob)
      await saveWorkspaceVaultBlob(blob, caseId)
      await applyWorkspacePayloadAsync(payload, caseId)
      restored += 1
    } catch (error) {
      console.warn('[account-backup] workspace restore failed', caseId, error)
    }
  }
  return restored
}

export interface AccountCloudRestoreResult {
  identifierCases: number
  workspaceCases: number
  identifiersFromAccount: boolean
}

/**
 * Restore encrypted patient identifiers from the account registry backup when local
 * names/DOB are missing (e.g. after clearing browser storage). Also re-applies the
 * account identifier storage preference from server state.
 */
export async function tryAutoRestoreRegistryFromAccount(passphrase: string): Promise<number> {
  const status = await fetchAccountBackupStatus()
  if (!status?.hasRegistryBackup) return 0

  const { ensureCaseRegistryHydrated } = await import('../hooks/useCaseRegistry')
  await ensureCaseRegistryHydrated()
  if (registryMapHasIdentifierFields(loadRegistryMapFromStorage())) return 0

  const registryBlob = await fetchRegistryBackupFromServer()
  if (!registryBlob) return 0

  const raw = await decryptJsonWithPassphrase<unknown>(passphrase, registryBlob)
  const payload = normalizeIdentifierPayload(raw)
  await applyIdentifierBackupPayload(payload)

  const { syncPrivacyIdentifierStorage } = await import('../hooks/usePrivacySettings')
  syncPrivacyIdentifierStorage('account')

  return Object.keys(payload.identifiers ?? {}).length
}

/** When the account has a registry backup, prefer account identifier storage locally. */
export async function inferAccountIdentifierStorageFromServer(): Promise<void> {
  const status = await fetchAccountBackupStatus()
  if (!status?.hasRegistryBackup) return
  const { syncPrivacyIdentifierStorage } = await import('../hooks/usePrivacySettings')
  syncPrivacyIdentifierStorage('account')
}

/** True when server holds an identifier backup but this browser lacks decrypted names/DOB. */
export async function isAccountRegistryRestoreNeeded(): Promise<boolean> {
  const status = await fetchAccountBackupStatus()
  if (!status?.hasRegistryBackup) return false

  const { ensureCaseRegistryHydrated } = await import('../hooks/useCaseRegistry')
  await ensureCaseRegistryHydrated()
  return !registryMapHasIdentifierFields(loadRegistryMapFromStorage())
}

/**
 * Passphrase unlock: restore key + clinical case files from account.
 * Patient identifiers are restored from the account registry backup whenever one exists,
 * regardless of the local identifier storage preference (which may reset after clearing
 * browser storage).
 */
export async function restoreAccountCloudBackup(
  passphrase: string,
  countryCode: string,
): Promise<AccountCloudRestoreResult> {
  const keyBackup = await resolveKeyBackup()
  await restorePrivateKeyFromPassphrase(passphrase, keyBackup)
  setAccountBackupUnlocked(passphrase)

  const identifierCases = await tryAutoRestoreRegistryFromAccount(passphrase)
  const status = await fetchAccountBackupStatus()
  const identifiersFromAccount = identifierCases > 0 || Boolean(status?.hasRegistryBackup)

  const workspaceCases = await pullWorkspaceSnapshotsFromCloud(countryCode)
  return {
    identifierCases,
    workspaceCases,
    identifiersFromAccount,
  }
}

/** Debounced identifier re-upload (name/DOB only) when account mode + active passphrase session. */
export function scheduleAccountRegistryUpload(): void {
  const passphrase = getAccountBackupPassphrase()
  if (!passphrase) return

  if (identifierUploadTimer !== null) window.clearTimeout(identifierUploadTimer)
  identifierUploadTimer = window.setTimeout(() => {
    identifierUploadTimer = null
    void (async () => {
      if (!(await shouldSyncIdentifierBackupToAccount())) return
      await uploadIdentifierBackupIfEnabled(passphrase)
    })().catch((error) => {
      console.warn('[account-backup] identifier upload failed', error)
    })
  }, 2000)
}

export function lockAccountCloudBackup(): void {
  clearAccountBackupUnlock()
}

export type { PassphraseEncryptedBlob }

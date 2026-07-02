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
import { DEFAULT_CASE_ID } from './caseContext'
import { loadRegistryMapFromStorage } from './caseRegistryStorage'
import {
  decryptJsonWithPassphrase,
  type PassphraseEncryptedBlob,
} from './accountBackupCrypto'
import {
  clearAccountBackupUnlock,
  isAccountBackupUnlocked,
  setAccountBackupUnlocked,
} from './accountBackupSession'
import {
  decryptJsonPayload,
  encryptJsonPayload,
  getActiveVaultBlob,
  getOrCreateDeviceId,
  importVaultBlob,
  saveWorkspaceVaultBlob,
  type EncryptedVaultBlob,
} from './cryptoVault'
import {
  getLinkedAccountUserId,
  isAccountKeyLinked,
  markAccountKeyLinked,
} from './accountKeyLink'
import {
  markIdentifierStorageAcknowledged,
  usesAccountIdentifierSync,
} from './identifierStorage'
import {
  createPassphraseBackup,
  getPassphraseBackup,
  restorePrivateKeyFromPassphrase,
  type PassphraseKeyBackup,
} from './passphraseRecovery'
import {
  activateUnlockStep,
  completeUnlockStep,
  failUnlockStep,
  finishPassphraseUnlock,
  startPassphraseUnlock,
  updateUnlockStepCount,
} from './passphraseUnlockProgress'
import {
  applyWorkspacePayloadAsync,
  decryptWorkspaceBlob,
} from './workspaceVault'

export const ACCOUNT_IDENTIFIER_BACKUP_VERSION = 2

/**
 * Registry-backup ENVELOPE versions (the transport blob, not the inner payload):
 *  - v1: passphrase-derived AES-GCM (PBKDF2 salt in `salt`). Upload requires the
 *    passphrase, which lives only in memory — so identifier edits made in a later
 *    session silently never reached the server (the cross-device "nicht
 *    zugeordnet" bug).
 *  - v2: account-RSA-wrapped AES-GCM — the same model as workspace snapshots.
 *    The `salt` field carries the RSA-wrapped AES key (the table column is
 *    reused; no server/schema change). Any linked device can upload without the
 *    passphrase, and any device that completed key restore can decrypt.
 */
export const REGISTRY_BLOB_VERSION_PASSPHRASE = 1
export const REGISTRY_BLOB_VERSION_RSA = 2

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
  return Object.values(map).some((meta) => caseMetaHasIdentifierFields(meta))
}

export function caseMetaHasIdentifierFields(meta: LocalCaseMeta): boolean {
  return (
    Boolean(meta.localName?.trim()) ||
    Boolean(meta.localVorname?.trim()) ||
    Boolean(meta.localNachname?.trim()) ||
    Boolean(meta.localGeburtsdatum?.trim())
  )
}

/** True when a real (non-default, non-demo) case has no identifier fields at all. */
export function registryMapHasCaseMissingIdentifiers(
  map: Record<string, LocalCaseMeta>,
): boolean {
  return Object.values(map).some(
    (meta) =>
      meta.caseId !== DEFAULT_CASE_ID &&
      !meta.isDemoPatient &&
      !caseMetaHasIdentifierFields(meta),
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

/**
 * Merge backup identifiers into the local registry PER CASE. Local non-empty
 * values win (never clobber what the clinician sees on this device); backup
 * values fill every gap. Returns how many cases gained at least one identifier
 * field — the restore counter shown to the user.
 */
async function applyIdentifierBackupPayload(
  payload: AccountIdentifierBackupPayload,
): Promise<number> {
  const { replaceRegistryMap } = await import('../hooks/useCaseRegistry')
  const current = loadRegistryMapFromStorage()
  let gainedCases = 0

  for (const record of Object.values(payload.identifiers ?? {})) {
    const existing = current[record.caseId]
    const merged: LocalCaseMeta = {
      ...existing,
      caseId: record.caseId,
      localName: existing?.localName?.trim() ? existing.localName : record.localName,
      localVorname: existing?.localVorname?.trim() ? existing.localVorname : record.localVorname,
      localNachname: existing?.localNachname?.trim()
        ? existing.localNachname
        : record.localNachname,
      localGeburtsdatum: existing?.localGeburtsdatum?.trim()
        ? existing.localGeburtsdatum
        : record.localGeburtsdatum,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastOpened: existing?.lastOpened ?? new Date().toISOString(),
    }
    const gained =
      (Boolean(merged.localName?.trim()) && !existing?.localName?.trim()) ||
      (Boolean(merged.localVorname?.trim()) && !existing?.localVorname?.trim()) ||
      (Boolean(merged.localNachname?.trim()) && !existing?.localNachname?.trim()) ||
      (Boolean(merged.localGeburtsdatum?.trim()) && !existing?.localGeburtsdatum?.trim())
    if (gained) gainedCases += 1
    current[record.caseId] = merged
  }

  replaceRegistryMap(current)

  for (const [caseId, blob] of Object.entries(payload.patientVaults ?? {})) {
    try {
      await importVaultBlob(blob, caseId)
    } catch (error) {
      console.warn('[account-backup] patient vault restore failed', caseId, error)
    }
  }

  return gainedCases
}

/**
 * Decrypt a registry-backup blob of either envelope version. v2 needs only the
 * account private key (must already be restored/linked on this device); v1
 * needs the passphrase. Throws when the required secret is unavailable.
 */
async function decryptRegistryBackupBlob(
  blob: PassphraseEncryptedBlob,
  passphrase?: string | null,
): Promise<AccountIdentifierBackupPayload> {
  if (blob.version === REGISTRY_BLOB_VERSION_RSA) {
    const raw = await decryptJsonPayload<unknown>({
      version: 1,
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      wrappedKey: blob.salt,
    })
    return normalizeIdentifierPayload(raw)
  }
  if (!passphrase) throw new Error('Passphrase required for registry backup v1')
  const raw = await decryptJsonWithPassphrase<unknown>(passphrase, blob)
  return normalizeIdentifierPayload(raw)
}

async function resolveKeyBackup(): Promise<PassphraseKeyBackup> {
  const remote = await fetchKeyBackupFromServer()
  if (remote) return remote
  const local = await getPassphraseBackup()
  if (local) return local
  throw new Error('No key backup found')
}

/**
 * Encrypt + upload the identifier backup with the ACCOUNT key (envelope v2).
 * No passphrase needed — that was the cross-device sync hole: the passphrase
 * only lives in memory, so identifier edits in any later session were never
 * backed up and new patients appeared as "nicht zugeordnet" on other devices.
 *
 * Guard: uploads only when this browser is LINKED to the account key. A fresh
 * device auto-generates a throwaway RSA pair; uploading a backup wrapped with
 * that pair would clobber the account backup with one no other device can read.
 */
async function uploadIdentifierBackupIfEnabled(): Promise<void> {
  // Same migration safeguard as isKeyRestoreNeeded: a local passphrase backup
  // proves this device created the account key even if the link marker predates it.
  const holdsAccountKey =
    getLinkedAccountUserId() !== null || Boolean(await getPassphraseBackup())
  if (!holdsAccountKey) return
  if (!(await shouldSyncIdentifierBackupToAccount())) return

  const payload = await collectIdentifierBackupPayload()
  if (!payloadHasIdentifierFields(payload)) {
    const status = await fetchAccountBackupStatus()
    if (status?.hasRegistryBackup) return
  }

  const vaultBlob = await encryptJsonPayload(payload)
  await uploadRegistryBackupToServer({
    version: REGISTRY_BLOB_VERSION_RSA,
    // v2 envelope: the `salt` field carries the RSA-wrapped AES key (column reuse).
    salt: vaultBlob.wrappedKey,
    iv: vaultBlob.iv,
    ciphertext: vaultBlob.ciphertext,
    iterations: 0,
  })
}

/** Upload passphrase-wrapped key; identifier ciphertext only when account mode is selected. */
export async function uploadAccountCloudBackup(passphrase: string): Promise<void> {
  let keyBackup = await getPassphraseBackup()
  if (!keyBackup) {
    keyBackup = await createPassphraseBackup(passphrase)
  }
  await uploadKeyBackupToServer(keyBackup)
  await uploadIdentifierBackupIfEnabled()
}

/** Create passphrase backup and upload per user identifier storage choice. */
export async function setupAccountCloudBackup(
  passphrase: string,
  userId?: string | null,
): Promise<PassphraseKeyBackup> {
  const backup = await createPassphraseBackup(passphrase)
  await uploadKeyBackupToServer(backup)
  setAccountBackupUnlocked(passphrase)
  // This browser now holds the account's real private key — mark it BEFORE the
  // identifier upload, which refuses to run from unlinked (throwaway-key) devices.
  markAccountKeyLinked(userId)
  await uploadIdentifierBackupIfEnabled()
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

export interface PullWorkspaceSnapshotsOptions {
  /**
   * When true, emit step-by-step progress into the
   * `passphraseUnlockProgress` state machine. The wrapper
   * `restoreAccountCloudBackupWithProgress` passes `true`; standalone callers
   * (e.g. the Settings "re-sync from cloud" button) leave it off to avoid
   * driving the unlock UI.
   */
  reportProgress?: boolean
}

interface DecryptedSnapshot {
  caseId: string
  blob: EncryptedVaultBlob
  payload: Awaited<ReturnType<typeof decryptWorkspaceBlob>>
}

/**
 * Pull encrypted clinical case files (incl. diagnoses) for all known cases.
 *
 * The implementation is split into three explicit phases so the passphrase
 * unlock UI can render an honest stepper:
 *   1. fetch  — HTTP GETs against /api/workspace/snapshot per case
 *   2. decrypt — AES-GCM decrypt of every fetched blob
 *   3. save    — populate the local IDB cache + apply payload to feature stores
 */
export async function pullWorkspaceSnapshotsFromCloud(
  countryCode: string,
  options: PullWorkspaceSnapshotsOptions = {},
): Promise<number> {
  const reportProgress = options.reportProgress ?? false
  const deviceId = getOrCreateDeviceId()
  const caseIds = Array.from(
    new Set<string>([
      ...Object.keys(getRegistryMapSnapshot()),
      ...(await listRemoteWorkspaceCaseIds(deviceId, countryCode)),
    ]),
  )

  // PHASE 1 — fetch every ciphertext blob from the server.
  if (reportProgress) activateUnlockStep('fetchingSnapshots', caseIds.length)
  const fetched: Array<{ caseId: string; blob: EncryptedVaultBlob }> = []
  for (let index = 0; index < caseIds.length; index += 1) {
    const caseId = caseIds[index]
    try {
      const blob = await fetchRemoteWorkspaceSnapshot(deviceId, countryCode, caseId)
      if (blob) fetched.push({ caseId, blob })
    } catch (error) {
      console.warn('[account-backup] workspace fetch failed', caseId, error)
    }
    if (reportProgress) {
      updateUnlockStepCount('fetchingSnapshots', {
        processed: index + 1,
        total: caseIds.length,
      })
    }
  }
  if (reportProgress) completeUnlockStep('fetchingSnapshots')

  // PHASE 2 — decrypt every blob.
  if (reportProgress) activateUnlockStep('decrypting', fetched.length)
  const decrypted: DecryptedSnapshot[] = []
  for (let index = 0; index < fetched.length; index += 1) {
    const item = fetched[index]
    try {
      const payload = await decryptWorkspaceBlob(item.blob)
      decrypted.push({ caseId: item.caseId, blob: item.blob, payload })
    } catch (error) {
      console.warn('[account-backup] workspace decrypt failed', item.caseId, error)
    }
    if (reportProgress) {
      updateUnlockStepCount('decrypting', {
        processed: index + 1,
        total: fetched.length,
      })
    }
  }
  if (reportProgress) completeUnlockStep('decrypting')

  // PHASE 3 — populate the local IDB cache + apply to feature stores.
  if (reportProgress) activateUnlockStep('populatingCache', decrypted.length)
  let restored = 0
  for (let index = 0; index < decrypted.length; index += 1) {
    const item = decrypted[index]
    try {
      await saveWorkspaceVaultBlob(item.blob, item.caseId)
      await applyWorkspacePayloadAsync(item.payload, item.caseId)
      restored += 1
    } catch (error) {
      console.warn('[account-backup] workspace cache write failed', item.caseId, error)
    }
    if (reportProgress) {
      updateUnlockStepCount('populatingCache', {
        processed: index + 1,
        total: decrypted.length,
      })
    }
  }
  if (reportProgress) completeUnlockStep('populatingCache')

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
  // NOTE: no wholesale "device already has some identifiers" skip here. That
  // skip meant a second device with even ONE named patient never received
  // identifiers for cases created later on another device — they stayed
  // "nicht zugeordnet" forever. applyIdentifierBackupPayload merges per case
  // and never overwrites local non-empty values, so running it is always safe.

  const registryBlob = await fetchRegistryBackupFromServer()
  if (!registryBlob) return 0

  const payload = await decryptRegistryBackupBlob(registryBlob, passphrase)
  const gained = await applyIdentifierBackupPayload(payload)

  const { syncPrivacyIdentifierStorage } = await import('../hooks/usePrivacySettings')
  syncPrivacyIdentifierStorage('account')

  return gained
}

/**
 * Silent identifier restore for a device that already holds the account key:
 * v2 (RSA-wrapped) backups decrypt without the passphrase, so a linked device
 * can merge identifiers for newly synced cases right after hydration — no
 * prompt needed. Returns the number of cases that gained identifiers, or null
 * when the backup is a v1 (passphrase) blob and the prompt is still required.
 */
export async function tryRestoreRegistryWithDeviceKey(): Promise<number | null> {
  if (!getLinkedAccountUserId()) return null

  const registryBlob = await fetchRegistryBackupFromServer()
  if (!registryBlob) return 0
  if (registryBlob.version !== REGISTRY_BLOB_VERSION_RSA) return null

  const payload = await decryptRegistryBackupBlob(registryBlob)
  const gained = await applyIdentifierBackupPayload(payload)

  const { syncPrivacyIdentifierStorage } = await import('../hooks/usePrivacySettings')
  syncPrivacyIdentifierStorage('account')

  return gained
}

/**
 * True when the account holds a passphrase key backup but THIS browser is not yet
 * confirmed to hold the account's real private key. In that state the encrypted
 * case files (and any account-synced identifiers) cannot be unlocked until the
 * user enters their passphrase, so the unlock prompt must be shown.
 *
 * `userId` is the authenticated Supabase user id; without it we cannot tell which
 * account this browser is linked to, so we conservatively report "not needed"
 * (an unauthenticated session has nothing to restore anyway).
 */
export async function isKeyRestoreNeeded(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  // This browser has already created or restored the account key — nothing to do.
  if (isAccountKeyLinked(userId)) return false

  const status = await fetchAccountBackupStatus()
  if (!status?.hasKeyBackup) return false

  // Migration / same-device safeguard: a local passphrase backup means this
  // browser already created the account key here (pre-dating the key-link marker).
  // Treat it as linked so existing users are never falsely shown the new-device
  // unlock prompt on the very device they set encryption up on.
  const localBackup = await getPassphraseBackup()
  if (localBackup) {
    markAccountKeyLinked(userId)
    return false
  }

  return true
}

/**
 * Reconcile the local identifier-storage preference with server state on login.
 *
 * The choice itself is device-local (localStorage), so a fresh device / cleared
 * browser has no record of it and would otherwise re-prompt the storage-location
 * onboarding on every login. The account backup status is the account-level
 * signal we can read on login without breaking zero-knowledge:
 *  - a registry backup means the user picked account-mode identifiers → restore that
 *    (this also marks the choice acknowledged via syncPrivacyIdentifierStorage).
 *  - a key-only backup means the user completed encryption/storage onboarding on
 *    some device in device-mode → acknowledge locally so we never re-prompt.
 */
export async function inferAccountIdentifierStorageFromServer(): Promise<void> {
  const status = await fetchAccountBackupStatus()
  if (!status) return

  if (status.hasRegistryBackup) {
    const { syncPrivacyIdentifierStorage } = await import('../hooks/usePrivacySettings')
    syncPrivacyIdentifierStorage('account')
    return
  }

  if (status.hasKeyBackup) {
    markIdentifierStorageAcknowledged()
  }
}

/**
 * True when this account already has an encrypted backup (key or registry), i.e.
 * the user has already chosen a storage mode / completed onboarding on some
 * device. Used to avoid re-prompting the storage-location choice on a new device.
 */
export async function hasAccountOnboardingRecord(): Promise<boolean> {
  const status = await fetchAccountBackupStatus()
  return Boolean(status?.hasKeyBackup || status?.hasRegistryBackup)
}

/**
 * True when the server holds an identifier backup and at least one synced case
 * on this browser has NO identifier fields — i.e. names/DOB for that case are
 * missing locally and a restore could repair it. (Previously this checked
 * whether the whole registry was empty, so a device with a single named
 * patient never re-offered the restore and new cases stayed "nicht zugeordnet".)
 */
export async function isAccountRegistryRestoreNeeded(): Promise<boolean> {
  const status = await fetchAccountBackupStatus()
  if (!status?.hasRegistryBackup) return false

  const { ensureCaseRegistryHydrated } = await import('../hooks/useCaseRegistry')
  await ensureCaseRegistryHydrated()
  return registryMapHasCaseMissingIdentifiers(loadRegistryMapFromStorage())
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
  userId?: string | null,
): Promise<AccountCloudRestoreResult> {
  const keyBackup = await resolveKeyBackup()
  await restorePrivateKeyFromPassphrase(passphrase, keyBackup)
  setAccountBackupUnlocked(passphrase)
  // This browser now holds the account's real private key (restored from passphrase).
  markAccountKeyLinked(userId)

  const identifierCases = await tryAutoRestoreRegistryFromAccount(passphrase)
  const status = await fetchAccountBackupStatus()
  const identifiersFromAccount = identifierCases > 0 || Boolean(status?.hasRegistryBackup)

  const workspaceCases = await pullWorkspaceSnapshotsFromCloud(countryCode)

  // Account mode can only upload identifier changes while a passphrase session is
  // active, and that session is in-memory (cleared on every page unload). Any
  // name/DOB edits made on this device while it was locked are therefore saved
  // locally but not yet backed up to the account. Now that the passphrase is
  // unlocked, flush a catch-up upload so account-mode identifiers become
  // eventually consistent across devices. No-op in device-only mode.
  if (usesAccountIdentifierSync()) {
    scheduleAccountRegistryUpload()
  }

  return {
    identifierCases,
    workspaceCases,
    identifiersFromAccount,
  }
}

/**
 * Same as `restoreAccountCloudBackup` but emits step-by-step progress into the
 * passphrase-unlock state machine for the stepped UI surface.
 *
 * Errors are re-thrown so the caller's catch path can still react, BUT the
 * relevant step is also marked as `error` first — that lets the React UI
 * render a per-step red X with a specific failure message before the catch
 * site renders its own toast / status hint.
 */
export async function restoreAccountCloudBackupWithProgress(
  passphrase: string,
  countryCode: string,
  userId?: string | null,
): Promise<AccountCloudRestoreResult> {
  startPassphraseUnlock()

  // STEP 1 — derive AES key from passphrase + unwrap the private RSA key.
  activateUnlockStep('derivingKey')
  let keyBackup: PassphraseKeyBackup
  try {
    keyBackup = await resolveKeyBackup()
    await restorePrivateKeyFromPassphrase(passphrase, keyBackup)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Key derivation failed'
    failUnlockStep('derivingKey', message)
    throw error
  }
  setAccountBackupUnlocked(passphrase)
  markAccountKeyLinked(userId)
  completeUnlockStep('derivingKey')

  // Identifier restore is part of the key step — it doesn't have its own
  // user-visible step because the count is opaque (registry-only restore is a
  // single decrypt/apply pair). Failures still surface via the next step.
  let identifierCases = 0
  try {
    identifierCases = await tryAutoRestoreRegistryFromAccount(passphrase)
  } catch (error) {
    console.warn('[account-backup] identifier restore failed', error)
  }
  const status = await fetchAccountBackupStatus()
  const identifiersFromAccount = identifierCases > 0 || Boolean(status?.hasRegistryBackup)

  // STEPS 2-4 — fetch / decrypt / populate-cache, driven by the snapshot pull.
  let workspaceCases = 0
  try {
    workspaceCases = await pullWorkspaceSnapshotsFromCloud(countryCode, {
      reportProgress: true,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Workspace restore failed'
    // The pull function already reported per-phase progress; mark whichever
    // step is still active as failed so the UI shows the red X.
    const progress = (await import('./passphraseUnlockProgress')).getPassphraseUnlockProgress()
    const activeStep = progress.steps.find((step) => step.state === 'active')
    failUnlockStep(activeStep?.id ?? 'populatingCache', message)
    throw error
  }

  if (usesAccountIdentifierSync()) {
    scheduleAccountRegistryUpload()
  }

  finishPassphraseUnlock()

  return {
    identifierCases,
    workspaceCases,
    identifiersFromAccount,
  }
}

/**
 * Debounced identifier re-upload (name/DOB only) in account mode. Uses the
 * account RSA key (envelope v2), so it works in EVERY session — previously it
 * required the in-memory passphrase and silently skipped after any page
 * reload, which is how new patients never reached other devices.
 */
export function scheduleAccountRegistryUpload(): void {
  registerIdentifierUploadFlushOnHide()
  if (identifierUploadTimer !== null) window.clearTimeout(identifierUploadTimer)
  identifierUploadTimer = window.setTimeout(() => {
    identifierUploadTimer = null
    void runIdentifierUpload()
  }, 2000)
}

async function runIdentifierUpload(): Promise<void> {
  try {
    await uploadIdentifierBackupIfEnabled()
  } catch (error) {
    console.warn('[account-backup] identifier upload failed', error)
  }
}

let flushOnHideRegistered = false

/**
 * The 2s debounce can swallow the very last edit when the tab closes right
 * after creating a patient — flush immediately when the page is hidden so the
 * newest identifiers still reach the account backup.
 */
function registerIdentifierUploadFlushOnHide(): void {
  if (flushOnHideRegistered || typeof document === 'undefined') return
  flushOnHideRegistered = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (identifierUploadTimer === null) return
    window.clearTimeout(identifierUploadTimer)
    identifierUploadTimer = null
    void runIdentifierUpload()
  })
}

export function lockAccountCloudBackup(): void {
  clearAccountBackupUnlock()
}

export type { PassphraseEncryptedBlob }

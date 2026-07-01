import { useCallback, useEffect, useRef, useState } from 'react'
import { allowsWorkspaceVault, type PrivacyTier } from '../data/privacyRegions'
import { API_BASE } from '../services/apiClient'
import { fetchAccountBackupStatus } from '../services/accountBackupApi'
import { getAuthHeaders } from '../services/authHeaders'
import { isAccountBackupUnlocked } from '../utils/accountBackupSession'
import { getPassphraseBackup } from '../utils/passphraseRecovery'
import { registerClinicalImprintPersistHook } from '../utils/clinicalImprint'
import { hydrateLocalClinicalCaches } from '../utils/clinicalCacheHydration'
import { registerIsdmInputPersistHook } from '../utils/isdm/inputStorage'
import { registerIsdmPersistHook } from '../utils/isdm/storage'
import { registerMedicationPlanPersistHook } from '../utils/medication/storage'
import { registerPsychotherapyPlanPersistHook } from '../utils/psychotherapy/storage'
import { registerPsychopathFindingPersistHook } from '../utils/overview/psychopathFindingStorage'
import { registerVerlaufstendenzPersistHook } from '../utils/verlaufstendenz/storage'
import { registerComplementaryTherapiesPersistHook } from '../utils/complementaryTherapy/storage'
import { registerWeitereTherapiePersistHook } from '../utils/weitereTherapie/storage'
import { registerAnforderungenPersistHook } from '../utils/anforderungen/storage'
import { registerClinicalQuestionNotePersistHook } from '../utils/clinicalQuestions/answerNotes'
import {
  ensureKeyMaterial,
  getOrCreateDeviceId,
  registerPublicKeyIfAllowed,
  saveWorkspaceVaultBlob,
  type EncryptedVaultBlob,
} from '../utils/cryptoVault'
import { reportCryptoError } from '../utils/cryptoErrorReporter'
import { saveNotionDocumentSnapshot } from '../utils/notionDocumentActions'
import {
  applyWorkspacePayloadAsync,
  collectClinicalPayload,
  decryptWorkspaceBlob,
  deriveTitleHint,
  downloadWorkspaceVaultFile,
  encryptWorkspacePayload,
  getLastVaultExportAt,
  loadEncryptedWorkspace,
  parseWorkspaceVaultFile,
  recordVaultExport,
  saveEncryptedWorkspace,
  shouldShowBackupReminder,
  type ClinicalWorkspacePayload,
  type WorkspaceLivePatch,
} from '../utils/workspaceVault'

import type { OrganisationTier } from '../types/organisation'
import {
  bootstrapOrgCaseVault,
  getCachedOrgCaseKey,
  saveOrgCaseVaultPayload,
} from '../utils/orgCaseVault'

interface UseWorkspaceVaultOptions {
  caseId: string
  tier: PrivacyTier
  countryCode: string
  /**
   * Explicit, user-chosen case-file (Fallakte) cloud sync decision — see
   * `usePrivacySettings().caseFileCloudSync`. This is the SOLE gate for
   * whether a save pushes an encrypted snapshot to the server; country/
   * jurisdiction (`tier`) only ever supplies the default this resolves to
   * when the user hasn't made an explicit choice. Never derive dbSyncEnabled
   * from `tier` directly — that was the bug where selecting country DE
   * silently (and irreversibly, from the user's perspective) disabled
   * cross-device Fallakte access.
   */
  caseFileCloudSync: boolean
  getLivePatch: () => WorkspaceLivePatch
  onRestored?: (payload: ClinicalWorkspacePayload) => void
  documentTypeLabel?: (typeId: string) => string
  /** Small Praxis org-scoped encrypted vault (shared ciphertext). */
  orgVault?: {
    organisationId: string
    organisationTier: OrganisationTier
  }
}

interface RemoteSnapshotMeta {
  updatedAt: string
}

async function fetchRemoteSnapshot(
  deviceId: string,
  countryCode: string,
  caseId: string,
): Promise<{ blob: EncryptedVaultBlob; updatedAt: string } | null> {
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
    updatedAt: string
  }

  return {
    blob: {
      version: data.version,
      ciphertext: data.ciphertext,
      iv: data.iv,
      wrappedKey: data.wrappedKey,
    },
    updatedAt: data.updatedAt,
  }
}

/**
 * SERVER-FIRST persist pipeline (`persist()` below) requires this to throw on
 * any non-OK response — see the post-mortem in RECOVERY_REPORT.md §1–4.
 *
 * Returning `null` silently (the pre-2026-06-30 behaviour) would let the
 * caller mark the save as "successful" with `setLastSavedAt` even when the
 * server received nothing, recreating the empty-data incident from the
 * other direction.
 */
export class RemoteSnapshotPushError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'network'
      | 'http-4xx'
      | 'http-5xx'
      | 'invalid-response',
    readonly status?: number,
  ) {
    super(message)
    this.name = 'RemoteSnapshotPushError'
  }
}

async function pushRemoteSnapshot(
  blob: EncryptedVaultBlob,
  deviceId: string,
  countryCode: string,
  caseId: string,
  titleHint?: string | null,
): Promise<RemoteSnapshotMeta> {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/workspace/snapshot`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        deviceId,
        countryCode,
        caseId,
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        wrappedKey: blob.wrappedKey,
        version: blob.version,
        titleHint: titleHint ?? undefined,
      }),
    })
  } catch (error) {
    throw new RemoteSnapshotPushError(
      error instanceof Error ? error.message : 'Network unreachable',
      'network',
    )
  }

  if (!response.ok) {
    const code: RemoteSnapshotPushError['code'] =
      response.status >= 500 ? 'http-5xx' : 'http-4xx'
    throw new RemoteSnapshotPushError(
      `Workspace snapshot push failed (HTTP ${response.status})`,
      code,
      response.status,
    )
  }

  try {
    const data = (await response.json()) as { updatedAt?: string }
    return { updatedAt: data.updatedAt ?? new Date().toISOString() }
  } catch (error) {
    throw new RemoteSnapshotPushError(
      error instanceof Error ? error.message : 'Invalid server response',
      'invalid-response',
      response.status,
    )
  }
}

export function useWorkspaceVault({
  caseId,
  tier,
  countryCode,
  caseFileCloudSync,
  getLivePatch,
  onRestored,
  documentTypeLabel,
  orgVault,
}: UseWorkspaceVaultOptions) {
  const enabled = allowsWorkspaceVault(tier)
  const orgVaultEnabled =
    Boolean(orgVault?.organisationId) && orgVault?.organisationTier === 'small_praxis'
  // `caseFileCloudSync` is the explicit, persisted user choice (see
  // usePrivacySettings) — country/tier only supplies its default, never a
  // hard lock. `isAccountBackupUnlocked()` (in-memory passphrase session) and
  // `hasLocalPassphraseBackup` (persistent IndexedDB signal) are ADDITIONAL
  // fallbacks so a device that already completed cloud-backup setup/restore
  // keeps syncing even if the explicit setting hasn't been (re)confirmed yet.
  const [hasLocalPassphraseBackup, setHasLocalPassphraseBackup] = useState(false)
  const dbSyncEnabled =
    (caseFileCloudSync || isAccountBackupUnlocked() || hasLocalPassphraseBackup) &&
    !orgVaultEnabled
  const [ready, setReady] = useState(!enabled)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastDbSnapshotAt, setLastDbSnapshotAt] = useState<string | null>(null)
  const [hasCloudKeyBackup, setHasCloudKeyBackup] = useState(false)
  const [cloudKeyUpdatedAt, setCloudKeyUpdatedAt] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  /**
   * Save state machine — see RECOVERY_REPORT.md §1.
   *  - 'idle'           : no save in flight, no failure outstanding
   *  - 'saving'         : a persist() call is currently running
   *  - 'success'        : the most recent save was fully successful
   *  - 'cache-warning'  : the server write succeeded but the local IDB cache
   *                       could not be refreshed — data is safe on the server
   *  - 'failed'         : the server write (or the local IDB save when there
   *                       is no server, e.g. local_only tier) failed; the
   *                       persistent badge must show a Retry button and
   *                       lastSavedAt must NOT advance.
   */
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'cache-warning' | 'failed'
  >('idle')
  const saveTimerRef = useRef<number | null>(null)
  const initRef = useRef<string | null>(null)

  const applyPayload = useCallback(
    async (payload: ClinicalWorkspacePayload) => {
      await applyWorkspacePayloadAsync(payload, caseId)
      setLastSavedAt(payload.updatedAt)
      onRestored?.(payload)
    },
    [caseId, onRestored],
  )

  const persist = useCallback(
    async (options?: { syncRemote?: boolean; recordExport?: boolean }) => {
      if (!enabled) return null
      setSaveStatus('saving')

      // STEP 1 — encrypted local-storage durability for the currently edited
      // document section. Survives every IDB / network failure below.
      const live = getLivePatch()
      if (live.documentTypeId) {
        const savedAt = new Date().toISOString()
        saveNotionDocumentSnapshot(
          {
            documentTypeId: live.documentTypeId,
            pageHeading: live.pageHeading,
            sectionContents: { ...live.sectionContents },
            sectionMetadata: live.sectionMetadata ? { ...live.sectionMetadata } : undefined,
            savedAt,
          },
          caseId,
        )
      }

      // STEP 2 — build + encrypt the clinical payload.
      const payload = collectClinicalPayload(live, caseId)
      const blob = await encryptWorkspacePayload(payload)

      // STEP 3 — SERVER FIRST. The save is only considered successful once the
      // server (or org-vault server, or local IDB when there is no server)
      // confirms the write. See RECOVERY_REPORT.md §1.2 for the failure mode
      // this ordering exists to prevent.
      const skipRemoteSync = options?.syncRemote === false
      const hasServerDurability = orgVaultEnabled || dbSyncEnabled
      let serverSaveSucceeded = false

      try {
        if (orgVaultEnabled && orgVault?.organisationId) {
          const caseKey = getCachedOrgCaseKey(orgVault.organisationId, caseId)
          const remoteUpdatedAt = await saveOrgCaseVaultPayload(
            orgVault.organisationId,
            caseId,
            payload,
            caseKey ?? undefined,
          )
          setLastDbSnapshotAt(remoteUpdatedAt)
          serverSaveSucceeded = true
        } else if (dbSyncEnabled && !skipRemoteSync) {
          const material = await ensureKeyMaterial()
          await registerPublicKeyIfAllowed(tier, countryCode, API_BASE)
          const titleHint = documentTypeLabel
            ? deriveTitleHint(payload, documentTypeLabel)
            : null
          const remote = await pushRemoteSnapshot(
            blob,
            material.deviceId,
            countryCode,
            caseId,
            titleHint,
          )
          setLastDbSnapshotAt(remote.updatedAt)
          serverSaveSucceeded = true
        }
      } catch (serverError) {
        // Server failed. Do NOT mark the save as successful, do NOT advance
        // lastSavedAt, do NOT clear isDirty. The encrypted local durability
        // copy from Step 1 still protects the user's edit.
        reportCryptoError({
          scope: 'workspace-snapshot-push',
          code:
            serverError instanceof RemoteSnapshotPushError
              ? serverError.code
              : 'unknown',
          error: serverError,
          context: { caseId, orgVault: orgVaultEnabled, tier },
        })
        setSaveStatus('failed')
        setError(
          serverError instanceof Error
            ? serverError.message
            : 'Workspace vault save failed',
        )
        throw serverError
      }

      // STEP 4 — local IDB cache. When there's a server durability layer this
      // is best-effort (cache-warning on failure). When there isn't (e.g.
      // local_only tier), this IS the save and a failure surfaces as failed.
      let cacheWarning = false
      try {
        await saveWorkspaceVaultBlob(blob, caseId)
      } catch (cacheError) {
        if (hasServerDurability && serverSaveSucceeded) {
          // Server holds the canonical copy — don't fail the save, but log
          // the local cache miss so ops can surface a non-blocking hint.
          reportCryptoError({
            scope: 'workspace-vault-save',
            code: 'idb-write-failed-after-server-success',
            error: cacheError,
            context: { caseId, tier },
          })
          cacheWarning = true
        } else {
          // No server fallback — the local IDB write IS the save.
          reportCryptoError({
            scope: 'workspace-vault-save',
            code: 'idb-write-failed',
            error: cacheError,
            context: { caseId, tier },
          })
          setSaveStatus('failed')
          setError(
            cacheError instanceof Error
              ? cacheError.message
              : 'Workspace vault save failed',
          )
          throw cacheError
        }
      }

      // STEP 5 — only after the save is durable on the system of record do we
      // mark the workspace as saved.
      setLastSavedAt(payload.updatedAt)
      setIsDirty(false)
      setSaveStatus(cacheWarning ? 'cache-warning' : 'success')
      setError(null)

      if (options?.recordExport) {
        recordVaultExport(caseId)
      }

      return blob
    },
    [caseId, countryCode, dbSyncEnabled, documentTypeLabel, enabled, getLivePatch, orgVault, orgVaultEnabled, tier],
  )

  const scheduleSave = useCallback(() => {
    if (!enabled) return
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    setIsDirty(true)
    saveTimerRef.current = window.setTimeout(() => {
      // persist() already records the error + saveStatus; swallow here to
      // avoid the unhandled-rejection in the debounced timer path. The badge
      // surfaces the failure to the user.
      void persist().catch(() => {})
    }, 800)
  }, [enabled, persist])

  const scheduleSaveRef = useRef(scheduleSave)
  scheduleSaveRef.current = scheduleSave

  useEffect(() => {
    registerClinicalImprintPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerIsdmPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerIsdmInputPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerMedicationPlanPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerPsychotherapyPlanPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerPsychopathFindingPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerVerlaufstendenzPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerComplementaryTherapiesPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerWeitereTherapiePersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerAnforderungenPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerClinicalQuestionNotePersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    return () => {
      registerClinicalImprintPersistHook(null)
      registerIsdmPersistHook(null)
      registerIsdmInputPersistHook(null)
      registerMedicationPlanPersistHook(null)
      registerPsychotherapyPlanPersistHook(null)
      registerPsychopathFindingPersistHook(null)
      registerVerlaufstendenzPersistHook(null)
      registerComplementaryTherapiesPersistHook(null)
      registerWeitereTherapiePersistHook(null)
      registerAnforderungenPersistHook(null)
      registerClinicalQuestionNotePersistHook(null)
    }
  }, [caseId])

  const saveNow = useCallback(async () => {
    // persist() itself manages setError / setSaveStatus on both branches; we
    // only re-throw so callers (e.g. the Retry button in the failed-save
    // badge) can react if they need to. The default scheduled path above
    // swallows because the badge already surfaces the failure.
    await persist({ syncRemote: true })
  }, [persist])

  /** Retry the most recent save after a failed-badge click. */
  const retrySave = saveNow

  const exportVault = useCallback(async () => {
    const blob = await persist({ syncRemote: false, recordExport: true })
    if (blob) {
      downloadWorkspaceVaultFile(blob, `workspace-${caseId.slice(0, 8)}.json`)
      return
    }
    const live = getLivePatch()
    const payload = collectClinicalPayload(live, caseId)
    const encrypted = await encryptWorkspacePayload(payload)
    recordVaultExport(caseId)
    downloadWorkspaceVaultFile(encrypted, `workspace-${caseId.slice(0, 8)}.json`)
  }, [caseId, getLivePatch, persist])

  const importVault = useCallback(
    async (file: File) => {
      const text = await file.text()
      const blob = parseWorkspaceVaultFile(text)
      const payload = await decryptWorkspaceBlob(blob)
      await applyPayload(payload)
      await saveEncryptedWorkspace(getLivePatch(), caseId)
      setError(null)
    },
    [applyPayload, caseId, getLivePatch],
  )

  useEffect(() => {
    if (!enabled) return
    if (initRef.current === caseId) return
    initRef.current = caseId
    setReady(false)

    let cancelled = false

    void (async () => {
      try {
        // Decrypt the encrypted-at-rest PHI durability caches into their synchronous
        // shadows (and migrate any legacy plaintext) BEFORE applying the vault snapshot,
        // so each store's newer-wins merge can see locally-persisted-but-unflushed edits.
        await hydrateLocalClinicalCaches(caseId)

        const local = await loadEncryptedWorkspace(caseId)
        let remote: { blob: EncryptedVaultBlob; updatedAt: string } | null = null
        let orgPayload: ClinicalWorkspacePayload | null = null
        let orgUpdatedAt: string | null = null

        if (orgVaultEnabled && orgVault?.organisationId) {
          const boot = await bootstrapOrgCaseVault(orgVault.organisationId, caseId, {
            localLegacyBlob: local?.blob ?? null,
            localLegacyPayload: local?.payload ?? null,
          })
          orgPayload = boot.payload
          orgUpdatedAt = boot.snapshotUpdatedAt
          if (orgUpdatedAt) setLastDbSnapshotAt(orgUpdatedAt)
        } else if (dbSyncEnabled) {
          const deviceId = getOrCreateDeviceId()
          remote = await fetchRemoteSnapshot(deviceId, countryCode, caseId)
          if (remote) setLastDbSnapshotAt(remote.updatedAt)
        }

        const localUpdated = local?.payload.updatedAt ?? null
        const remoteUpdated = orgUpdatedAt ?? remote?.updatedAt ?? null

        const useOrgRemote =
          orgVaultEnabled &&
          orgPayload &&
          (!localUpdated ||
            (orgUpdatedAt !== null &&
              localUpdated !== null &&
              new Date(orgUpdatedAt).getTime() > new Date(localUpdated).getTime()))

        const usePersonalRemote =
          !orgVaultEnabled &&
          remote &&
          (!localUpdated ||
            (remoteUpdated !== null &&
              localUpdated !== null &&
              new Date(remoteUpdated).getTime() > new Date(localUpdated).getTime()))

        if (useOrgRemote && orgPayload && !cancelled) {
          await applyPayload(orgPayload)
        } else if (usePersonalRemote && remote) {
          const payload = await decryptWorkspaceBlob(remote.blob)
          if (!cancelled) {
            await applyPayload(payload)
          }
        } else if (local && !cancelled) {
          await applyPayload(local.payload)
        } else if (orgPayload && !local && !cancelled) {
          await applyPayload(orgPayload)
        }

        if (!cancelled) setReady(true)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Workspace vault load failed')
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyPayload, caseId, countryCode, dbSyncEnabled, enabled, orgVault, orgVaultEnabled])

  useEffect(() => {
    let active = true
    void getPassphraseBackup()
      .then((backup) => {
        if (active) setHasLocalPassphraseBackup(Boolean(backup))
      })
      .catch(() => {
        if (active) setHasLocalPassphraseBackup(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchAccountBackupStatus()
      .then((status) => {
        if (!active) return
        setHasCloudKeyBackup(Boolean(status?.hasKeyBackup))
        setCloudKeyUpdatedAt(status?.keyUpdatedAt ?? null)
      })
      .catch(() => {
        if (active) {
          setHasCloudKeyBackup(false)
          setCloudKeyUpdatedAt(null)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const showBackupReminder = shouldShowBackupReminder(
    dbSyncEnabled,
    Boolean(lastDbSnapshotAt),
    hasCloudKeyBackup,
  )

  const persistRef = useRef(persist)
  persistRef.current = persist

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        // Fire a best-effort vault save when the component unmounts with pending changes
        // (e.g. patient closed within the 800ms debounce window).
        void persistRef.current().catch(() => {})
      }
    },
    [],
  )

  // Best-effort flush on hard refresh / tab close / tab switch: a debounced
  // save waiting out its 800ms window would otherwise be lost if the page is
  // torn down before the timer fires. There is no way to guarantee the write
  // completes before unload — `beforeunload`/`pagehide` cannot be awaited —
  // but starting it as early as possible (as soon as the tab is hidden, which
  // fires before teardown) gives the local IndexedDB write, and the network
  // request when sync is enabled, the best realistic chance of finishing.
  useEffect(() => {
    const flushPendingSave = () => {
      if (saveTimerRef.current === null) return
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      void persistRef.current().catch(() => {})
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSave()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flushPendingSave)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushPendingSave)
    }
  }, [])

  return {
    enabled,
    ready,
    error,
    dbSyncEnabled,
    orgVaultEnabled,
    isDirty,
    lastSavedAt,
    lastDbSnapshotAt,
    lastExportAt: cloudKeyUpdatedAt ?? getLastVaultExportAt(caseId) ?? getLastVaultExportAt(),
    showBackupReminder,
    saveStatus,
    scheduleSave,
    saveNow,
    retrySave,
    exportVault,
    importVault,
  }
}

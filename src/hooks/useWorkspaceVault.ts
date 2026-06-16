import { useCallback, useEffect, useRef, useState } from 'react'
import {
  allowsWorkspaceDbSnapshot,
  allowsWorkspaceVault,
  type PrivacyTier,
} from '../data/privacyRegions'
import { API_BASE } from '../services/apiClient'
import { getAuthHeaders } from '../services/authHeaders'
import { isAccountBackupUnlocked } from '../utils/accountBackupSession'
import { registerClinicalImprintPersistHook } from '../utils/clinicalImprint'
import { registerIsdmInputPersistHook } from '../utils/isdm/inputStorage'
import { registerIsdmPersistHook } from '../utils/isdm/storage'
import { registerMedicationPlanPersistHook } from '../utils/medication/storage'
import { registerPsychotherapyPlanPersistHook } from '../utils/psychotherapy/storage'
import { registerComplementaryTherapiesPersistHook } from '../utils/complementaryTherapy/storage'
import { registerWeitereTherapiePersistHook } from '../utils/weitereTherapie/storage'
import { registerClinicalQuestionNotePersistHook } from '../utils/clinicalQuestions/answerNotes'
import {
  ensureKeyMaterial,
  getOrCreateDeviceId,
  registerPublicKeyIfAllowed,
  saveWorkspaceVaultBlob,
  type EncryptedVaultBlob,
} from '../utils/cryptoVault'
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

async function pushRemoteSnapshot(
  blob: EncryptedVaultBlob,
  deviceId: string,
  countryCode: string,
  caseId: string,
  titleHint?: string | null,
): Promise<RemoteSnapshotMeta | null> {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/workspace/snapshot`, {
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

  if (!response.ok) return null
  const data = (await response.json()) as { updatedAt?: string }
  return { updatedAt: data.updatedAt ?? new Date().toISOString() }
}

export function useWorkspaceVault({
  caseId,
  tier,
  countryCode,
  getLivePatch,
  onRestored,
  documentTypeLabel,
  orgVault,
}: UseWorkspaceVaultOptions) {
  const enabled = allowsWorkspaceVault(tier)
  const orgVaultEnabled =
    Boolean(orgVault?.organisationId) && orgVault?.organisationTier === 'small_praxis'
  const dbSyncEnabled =
    (allowsWorkspaceDbSnapshot(tier) || isAccountBackupUnlocked()) && !orgVaultEnabled
  const [ready, setReady] = useState(!enabled)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastDbSnapshotAt, setLastDbSnapshotAt] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
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

      const live = getLivePatch()

      if (live.documentTypeId) {
        const savedAt = new Date().toISOString()
        saveNotionDocumentSnapshot(
          {
            documentTypeId: live.documentTypeId,
            pageHeading: live.pageHeading,
            sectionContents: { ...live.sectionContents },
            savedAt,
          },
          caseId,
        )

      }

      const payload = collectClinicalPayload(live, caseId)
      const blob = await encryptWorkspacePayload(payload)
      await saveWorkspaceVaultBlob(blob, caseId)
      setLastSavedAt(payload.updatedAt)
      setIsDirty(false)

      if (options?.recordExport) {
        recordVaultExport(caseId)
      }

      if (orgVaultEnabled && orgVault?.organisationId) {
        const caseKey = getCachedOrgCaseKey(orgVault.organisationId, caseId)
        const remoteUpdatedAt = await saveOrgCaseVaultPayload(
          orgVault.organisationId,
          caseId,
          payload,
          caseKey ?? undefined,
        )
        setLastDbSnapshotAt(remoteUpdatedAt)
      } else if (dbSyncEnabled && options?.syncRemote !== false) {
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
        if (remote) setLastDbSnapshotAt(remote.updatedAt)
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
      void persist().catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : 'Workspace vault save failed')
      })
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
    registerComplementaryTherapiesPersistHook((persistCaseId) => {
      if (persistCaseId === caseId) scheduleSaveRef.current()
    })
    registerWeitereTherapiePersistHook((persistCaseId) => {
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
      registerComplementaryTherapiesPersistHook(null)
      registerWeitereTherapiePersistHook(null)
      registerClinicalQuestionNotePersistHook(null)
    }
  }, [caseId])

  const saveNow = useCallback(async () => {
    try {
      await persist({ syncRemote: true })
      setError(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Workspace vault save failed')
      throw saveError
    }
  }, [persist])

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

  const showBackupReminder = shouldShowBackupReminder(dbSyncEnabled, Boolean(lastDbSnapshotAt))

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

  return {
    enabled,
    ready,
    error,
    dbSyncEnabled,
    orgVaultEnabled,
    isDirty,
    lastSavedAt,
    lastDbSnapshotAt,
    lastExportAt: getLastVaultExportAt(caseId),
    showBackupReminder,
    scheduleSave,
    saveNow,
    exportVault,
    importVault,
  }
}

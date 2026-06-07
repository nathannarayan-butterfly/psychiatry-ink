import { useCallback, useEffect, useRef, useState } from 'react'
import {
  allowsWorkspaceDbSnapshot,
  allowsWorkspaceVault,
  type PrivacyTier,
} from '../data/privacyRegions'
import { API_BASE } from '../services/apiClient'
import {
  ensureKeyMaterial,
  getOrCreateDeviceId,
  registerPublicKeyIfAllowed,
  type EncryptedVaultBlob,
} from '../utils/cryptoVault'
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

interface UseWorkspaceVaultOptions {
  caseId: string
  tier: PrivacyTier
  countryCode: string
  getLivePatch: () => WorkspaceLivePatch
  onRestored?: (payload: ClinicalWorkspacePayload) => void
  documentTypeLabel?: (typeId: string) => string
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
  const response = await fetch(`${API_BASE}/api/workspace/snapshot?${params}`)
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
  const response = await fetch(`${API_BASE}/api/workspace/snapshot`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
}: UseWorkspaceVaultOptions) {
  const enabled = allowsWorkspaceVault(tier)
  const dbSyncEnabled = allowsWorkspaceDbSnapshot(tier)
  const [ready, setReady] = useState(!enabled)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastDbSnapshotAt, setLastDbSnapshotAt] = useState<string | null>(null)
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
      const payload = collectClinicalPayload(live, caseId)
      const blob = await encryptWorkspacePayload(payload)
      await saveEncryptedWorkspace(live, caseId)
      setLastSavedAt(payload.updatedAt)

      if (options?.recordExport) {
        recordVaultExport(caseId)
      }

      if (dbSyncEnabled && options?.syncRemote !== false) {
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
    [caseId, countryCode, dbSyncEnabled, documentTypeLabel, enabled, getLivePatch, tier],
  )

  const scheduleSave = useCallback(() => {
    if (!enabled) return
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void persist().catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : 'Workspace vault save failed')
      })
    }, 800)
  }, [enabled, persist])

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

        if (dbSyncEnabled) {
          const deviceId = getOrCreateDeviceId()
          remote = await fetchRemoteSnapshot(deviceId, countryCode, caseId)
          if (remote) setLastDbSnapshotAt(remote.updatedAt)
        }

        const localUpdated = local?.payload.updatedAt ?? null
        const remoteUpdated = remote?.updatedAt ?? null
        const useRemote =
          remote &&
          (!localUpdated ||
            (remoteUpdated !== null &&
              localUpdated !== null &&
              new Date(remoteUpdated).getTime() > new Date(localUpdated).getTime()))

        if (useRemote && remote) {
          const payload = await decryptWorkspaceBlob(remote.blob)
          if (!cancelled) {
            await applyPayload(payload)
          }
        } else if (local && !cancelled) {
          await applyPayload(local.payload)
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
  }, [applyPayload, caseId, countryCode, dbSyncEnabled, enabled])

  const showBackupReminder = shouldShowBackupReminder(dbSyncEnabled, Boolean(lastDbSnapshotAt))

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    },
    [],
  )

  return {
    enabled,
    ready,
    error,
    dbSyncEnabled,
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

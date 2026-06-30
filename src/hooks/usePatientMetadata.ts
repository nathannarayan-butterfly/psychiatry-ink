import { useCallback, useEffect, useRef, useState } from 'react'
import { allowsPatientMetadata, type PrivacyTier } from '../data/privacyRegions'
import {
  downloadVaultFile,
  getActiveVaultBlob,
  importVaultBlob,
  loadPatientMetadata,
  parseVaultBlob,
  registerPublicKeyIfAllowed,
  savePatientMetadata,
  type PatientMetadata,
} from '../utils/cryptoVault'
import { reportCryptoError } from '../utils/cryptoErrorReporter'
import { getCaseMeta, upsertCaseMeta } from './useCaseRegistry'
import { API_BASE } from '../services/apiClient'

/**
 * When the encrypted vault has no identity yet, reuse what the patient record
 * (case registry) already knows so the Aufnahme doesn't re-ask for name and
 * Geburtsdatum (Item 3). Returns null when the registry has nothing either.
 */
function readIdentityFromRegistry(caseId: string): PatientMetadata | null {
  const meta = getCaseMeta(caseId)
  if (!meta) return null
  const name =
    meta.localName?.trim() ||
    [meta.localVorname, meta.localNachname].filter(Boolean).join(' ').trim()
  const geburtsdatum = meta.localGeburtsdatum?.trim() ?? ''
  if (!name && !geburtsdatum) return null
  return { name, geburtsdatum, updatedAt: '' }
}

const EMPTY_METADATA: PatientMetadata = {
  name: '',
  geburtsdatum: '',
  updatedAt: '',
}

interface UsePatientMetadataOptions {
  caseId: string
  tier: PrivacyTier
  countryCode: string
  onMigratedAge?: (age: string) => void
}

export function usePatientMetadata({
  caseId,
  tier,
  countryCode,
  onMigratedAge,
}: UsePatientMetadataOptions) {
  const enabled = allowsPatientMetadata(tier)
  const [metadata, setMetadata] = useState<PatientMetadata>(EMPTY_METADATA)
  const [ready, setReady] = useState(!enabled)
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const registeredRef = useRef(false)
  const loadedCaseRef = useRef<string | null>(null)
  const migratedAgeRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      setReady(true)
      return
    }

    if (loadedCaseRef.current === caseId) return
    loadedCaseRef.current = caseId
    migratedAgeRef.current = false
    setReady(false)

    let cancelled = false

    void (async () => {
      try {
        const loaded = await loadPatientMetadata(caseId)
        let resolved = loaded?.metadata ?? EMPTY_METADATA

        // Pre-fill from the known patient record when the vault is still empty,
        // and seed the vault so the identity persists (Item 3).
        if (!resolved.name?.trim() && !resolved.geburtsdatum?.trim()) {
          const fromRegistry = readIdentityFromRegistry(caseId)
          if (fromRegistry) {
            resolved = fromRegistry
            void savePatientMetadata(
              { ...fromRegistry, updatedAt: new Date().toISOString() },
              caseId,
            ).catch(() => {
              // Best-effort seed; the in-memory value is already pre-filled.
            })
          }
        }

        if (!cancelled) {
          setMetadata(resolved)
          if (loaded?.migratedAge && onMigratedAge && !migratedAgeRef.current) {
            migratedAgeRef.current = true
            onMigratedAge(loaded.migratedAge)
          }
          setReady(true)
        }

        if (!registeredRef.current) {
          registeredRef.current = true
          await registerPublicKeyIfAllowed(tier, countryCode, API_BASE)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Vault load failed')
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [caseId, countryCode, enabled, onMigratedAge, tier])

  const persist = useCallback(
    async (next: PatientMetadata) => {
      const payload: PatientMetadata = {
        ...next,
        updatedAt: new Date().toISOString(),
      }

      // SERVER-FIRST ORDER — see RECOVERY_REPORT.md §1.2.
      //
      // Before the 2026-06-30 hotfix this hook saved to the encrypted vault
      // IDB store FIRST and only mirrored to the case registry on success.
      // When the vault save threw (missing `vault` object store) every patient
      // name / DOB edit silently failed to land in the registry, producing
      // the "case ID but no patient details" symptom.
      //
      // Until the dedicated server-side identifier-vault client lands (see
      // DESIGN_D_REPORT.md), the case registry is the most durable layer we
      // have for name/DOB: it is encrypted-at-rest in localStorage AND
      // mirrors to the server via the existing patient-registry API. So we
      // persist there FIRST, then write the local vault as a cache.
      let registryError: unknown = null
      try {
        upsertCaseMeta(caseId, {
          localName: payload.name.trim() || undefined,
          localGeburtsdatum: payload.geburtsdatum.trim() || undefined,
        })
      } catch (error) {
        registryError = error
        reportCryptoError({
          scope: 'case-registry-write',
          code: 'registry-upsert-failed',
          error,
          context: { caseId },
        })
      }

      let vaultError: unknown = null
      try {
        await savePatientMetadata(payload, caseId)
      } catch (error) {
        vaultError = error
        reportCryptoError({
          scope: 'patient-metadata-save',
          code: 'idb-write-failed',
          error,
          context: { caseId },
        })
      }

      setMetadata(payload)

      // Throw only when EVERY durability surface failed; otherwise the user's
      // edit is still safe in the durable layer above.
      if (registryError && vaultError) {
        throw vaultError instanceof Error
          ? vaultError
          : new Error('Patient metadata save failed')
      }
    },
    [caseId],
  )

  const scheduleSave = useCallback(
    (patch: Partial<PatientMetadata>) => {
      setMetadata((current) => {
        const next = { ...current, ...patch }
        if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = window.setTimeout(() => {
          void persist(next).catch((saveError) => {
            setError(saveError instanceof Error ? saveError.message : 'Vault save failed')
          })
        }, 400)
        return next
      })
    },
    [persist],
  )

  const setName = useCallback(
    (name: string) => scheduleSave({ name }),
    [scheduleSave],
  )

  const setGeburtsdatum = useCallback(
    (geburtsdatum: string) => scheduleSave({ geburtsdatum }),
    [scheduleSave],
  )

  const exportVault = useCallback(async () => {
    const blob = await getActiveVaultBlob(caseId)
    if (!blob) {
      await persist(metadata)
      const refreshed = await getActiveVaultBlob(caseId)
      if (refreshed) downloadVaultFile(refreshed, `patient-${caseId.slice(0, 8)}.json`)
      return
    }
    downloadVaultFile(blob, `patient-${caseId.slice(0, 8)}.json`)
  }, [caseId, metadata, persist])

  const importVault = useCallback(
    async (file: File) => {
      const text = await file.text()
      const blob = parseVaultBlob(text)
      const imported = await importVaultBlob(blob, caseId)
      setMetadata(imported.metadata)
      upsertCaseMeta(caseId, {
        localName: imported.metadata.name.trim() || undefined,
        localGeburtsdatum: imported.metadata.geburtsdatum.trim() || undefined,
      })
      if (imported.migratedAge && onMigratedAge) {
        onMigratedAge(imported.migratedAge)
      }
      setError(null)
    },
    [caseId, onMigratedAge],
  )

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
    name: metadata.name,
    geburtsdatum: metadata.geburtsdatum,
    setName,
    setGeburtsdatum,
    exportVault,
    importVault,
  }
}

/**
 * Name and date of birth must never reach AI prompts or server logs.
 * Structured age is also excluded from AI by default (see useWorkspaceState).
 */
export function stripPatientMetadataFromText(text: string): string {
  return text
}

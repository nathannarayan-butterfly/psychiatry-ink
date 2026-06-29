import { useCallback, useEffect, useState } from 'react'
import { allowsWorkspaceDbSnapshot, type PrivacyTier } from '../data/privacyRegions'
import { API_BASE } from '../services/apiClient'
import {
  createPatientOnApi,
  fetchPatientsFromApi,
  mergeServerCaseWithLocal,
  upsertPatientOnApi,
} from '../services/patientRegistryApi'
import { isAccountBackupUnlocked } from '../utils/accountBackupSession'
import {
  hydrateCaseRegistryFromEncryptedLocal,
  isRegistryShadowHydrated,
  loadRegistryMapFromStorage,
  markRegistryShadowHydrated,
  saveRegistryMapToStorage,
} from '../utils/caseRegistryStorage'
import { createCaseId, DEFAULT_CASE_ID, shortCaseId } from '../utils/caseContext'
import { countLabGraphs } from '../utils/labPersistence'
import { countTimelines } from '../utils/timelinePersistence'
import { getOrCreateDeviceId } from '../utils/cryptoVault'
import { removeStaleCasesFromRegistry, isStaleCaseId } from '../utils/casePatientLifecycle'

export type LocalGeschlecht = 'maennlich' | 'weiblich' | 'divers'

export interface LocalCaseMeta {
  caseId: string
  localName?: string
  localVorname?: string
  localNachname?: string
  localGeburtsdatum?: string
  localGeschlecht?: LocalGeschlecht
  localAge?: string
  /** Clinician-accepted one-liner for the Übersicht hero subheading (e.g. from import AI). */
  localClinicalSubheading?: string
  pageHeading?: string
  lastDocumentType?: string
  lastOpened: string
  createdAt: string
  /** When set, case is hidden from the active patient list and shown under Archiv. */
  archivedAt?: string
  /** Synthetic demo patient — read-only, seeded from fixture. */
  isDemoPatient?: boolean
  demoSeedVersion?: string
  demoPatientId?: string
  /** Locale of synthetic demo clinical copy (de | en). */
  demoLocale?: 'de' | 'en'
}

export interface RemoteCaseMeta {
  caseId: string
  updatedAt: string
  titleHint?: string | null
  createdAt: string
}

export interface DashboardCase {
  caseId: string
  displayTitle: string
  lastEditedAt: string
  documentTypeSummary: string
  localName?: string
  localVorname?: string
  localNachname?: string
  localGeburtsdatum?: string
  localGeschlecht?: LocalGeschlecht
  localAge?: string
  pageHeading?: string
  lastDocumentType?: string
  timelineCount?: number
  labGraphCount?: number
}

const REGISTRY_MIGRATED_KEY = 'psychiatry-ink:case-registry-db-migrated'

/** In-memory cache — PII in localStorage; server sync is codes + timestamps only. */
let registryCache: Record<string, LocalCaseMeta> = {}
let registryHydrated = false
let hydratePromise: Promise<void> | null = null

function setCacheMap(map: Record<string, LocalCaseMeta>): void {
  registryCache = map
  saveRegistryMapToStorage(map)
}

/** Snapshot of local registry PII for encrypted account backup. */
export function getRegistryMapSnapshot(): Record<string, LocalCaseMeta> {
  return { ...readCacheMap() }
}

/**
 * Clear the in-memory registry cache and hydration state. Invoked when device-local
 * clinical data is purged on an auth identity change so the next user never reads the
 * previous user's patient registry from this module's RAM. A fresh `hydrateCaseRegistry`
 * then repopulates from the (now cleared) storage + server.
 */
export function resetCaseRegistryCache(): void {
  registryCache = {}
  registryHydrated = false
  hydratePromise = null
}

/** Replace in-memory + localStorage registry after cloud restore. */
export function replaceRegistryMap(map: Record<string, LocalCaseMeta>): void {
  markRegistryShadowHydrated()
  setCacheMap(map)
  registryHydrated = true
}

function readCacheMap(): Record<string, LocalCaseMeta> {
  if (registryHydrated) return registryCache
  return loadRegistryMapFromStorage()
}

/** Merge server case codes with local PII; one-time register local-only codes on the server. */
export async function hydrateCaseRegistry(): Promise<void> {
  if (registryHydrated) return
  if (hydratePromise) {
    await hydratePromise
    return
  }

  hydratePromise = (async () => {
    // Decrypt the encrypted-at-rest registry into its synchronous shadow (and migrate any
    // legacy plaintext) BEFORE any synchronous read/write of the registry map below, so the
    // ciphertext is never clobbered by a falsely-empty map.
    await hydrateCaseRegistryFromEncryptedLocal()
    await removeStaleCasesFromRegistry()
    const localMap = loadRegistryMapFromStorage()
    let apiCases: Awaited<ReturnType<typeof fetchPatientsFromApi>> = []

    try {
      apiCases = await fetchPatientsFromApi()
    } catch (error) {
      console.warn('[case-registry] API unavailable, using localStorage cache', error)
      setCacheMap(localMap)
      ensureDefaultCase()
      registryHydrated = true
      return
    }

    const merged: Record<string, LocalCaseMeta> = {}
    for (const apiCase of apiCases) {
      merged[apiCase.caseId] = mergeServerCaseWithLocal(apiCase, localMap[apiCase.caseId])
    }

    let migratedFlag = false
    try {
      migratedFlag = localStorage.getItem(REGISTRY_MIGRATED_KEY) === 'true'
    } catch {
      migratedFlag = false
    }
    const localOnly = Object.values(localMap).filter((item) => !merged[item.caseId])

    if (!migratedFlag && localOnly.length > 0) {
      let allMigrated = true
      for (const item of localOnly) {
        try {
          const saved = await createPatientOnApi(item)
          merged[item.caseId] = mergeServerCaseWithLocal(saved, item)
        } catch (error) {
          console.warn('[case-registry] migrate case code failed', item.caseId, error)
          merged[item.caseId] = item
          allMigrated = false
        }
      }
      if (allMigrated) {
        try {
          localStorage.setItem(REGISTRY_MIGRATED_KEY, 'true')
        } catch {
          // best-effort migration flag; ignore storage failures so hydration
          // always completes and the hydrate promise never wedges.
        }
      }
    }

    for (const item of Object.values(localMap)) {
      if (!merged[item.caseId]) merged[item.caseId] = item
    }

    setCacheMap(merged)
    ensureDefaultCase()
    registryHydrated = true
  })()

  await hydratePromise
}

/** Await encrypted registry hydration — safe to call before upsertCaseMeta / touchCaseOpened. */
export async function ensureCaseRegistryHydrated(): Promise<void> {
  await hydrateCaseRegistry()
}

export function isCaseRegistryReady(): boolean {
  return registryHydrated || isRegistryShadowHydrated()
}

export function ensureDefaultCase(): LocalCaseMeta {
  const map = readCacheMap()
  if (map[DEFAULT_CASE_ID]) {
    registryCache[DEFAULT_CASE_ID] = map[DEFAULT_CASE_ID]
    return map[DEFAULT_CASE_ID]
  }

  const meta: LocalCaseMeta = {
    caseId: DEFAULT_CASE_ID,
    createdAt: new Date().toISOString(),
    lastOpened: new Date().toISOString(),
  }
  map[DEFAULT_CASE_ID] = meta
  setCacheMap(map)
  void upsertPatientOnApi(meta).catch(() => {
    // offline — cache already updated
  })
  return meta
}

function buildCaseMeta(
  caseId: string,
  existing: LocalCaseMeta | undefined,
  patch: Partial<LocalCaseMeta>,
): LocalCaseMeta {
  return {
    ...existing,
    ...patch,
    caseId,
    createdAt: existing?.createdAt ?? patch.createdAt ?? new Date().toISOString(),
    lastOpened: patch.lastOpened ?? existing?.lastOpened ?? new Date().toISOString(),
  }
}

function persistCaseMeta(next: LocalCaseMeta, patch: Partial<LocalCaseMeta>): LocalCaseMeta {
  const map = readCacheMap()
  map[next.caseId] = next
  setCacheMap(map)
  if (
    patch.localName !== undefined ||
    patch.localVorname !== undefined ||
    patch.localNachname !== undefined ||
    patch.localGeburtsdatum !== undefined
  ) {
    void import('../utils/accountBackup').then((mod) => mod.scheduleAccountRegistryUpload())
  }
  void upsertPatientOnApi(next).catch((error) => {
    console.warn('[case-registry] persist failed', next.caseId, error)
  })
  return next
}

export function upsertCaseMeta(caseId: string, patch: Partial<LocalCaseMeta>): LocalCaseMeta {
  if (!isCaseRegistryReady()) {
    void hydrateCaseRegistry().then(() => {
      upsertCaseMeta(caseId, patch)
    })
    return buildCaseMeta(caseId, readCacheMap()[caseId], patch)
  }

  const map = readCacheMap()
  const existing = map[caseId]
  const next = buildCaseMeta(caseId, existing, patch)
  return persistCaseMeta(next, patch)
}

export function getCaseMeta(caseId: string): LocalCaseMeta | null {
  return readCacheMap()[caseId] ?? null
}

/** Parse a date string to epoch ms, falling back to 0 for invalid/corrupt values. */
function safeDateMs(value: string | undefined): number {
  if (!value) return 0
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : 0
}

export function listLocalCases(): LocalCaseMeta[] {
  return Object.values(readCacheMap()).sort(
    (a, b) => safeDateMs(b.lastOpened) - safeDateMs(a.lastOpened),
  )
}

/** Default workspace case is hidden from patient lists unless patient data was entered. */
export function isListedPatientCase(caseItem: DashboardCase): boolean {
  if (isStaleCaseId(caseItem.caseId)) return false
  if (caseItem.caseId !== DEFAULT_CASE_ID) return true
  return Boolean(
    caseItem.localName?.trim() ||
      caseItem.localVorname?.trim() ||
      caseItem.localNachname?.trim() ||
      caseItem.localGeburtsdatum?.trim() ||
      caseItem.localGeschlecht,
  )
}

export function createNewCase(): LocalCaseMeta {
  const caseId = createCaseId()
  const meta = upsertCaseMeta(caseId, {
    createdAt: new Date().toISOString(),
    lastOpened: new Date().toISOString(),
  })
  void createPatientOnApi(meta).catch((error) => {
    console.warn('[case-registry] create on API failed', caseId, error)
  })
  return meta
}

export function touchCaseOpened(caseId: string): void {
  upsertCaseMeta(caseId, { lastOpened: new Date().toISOString() })
}

async function fetchRemoteCases(
  deviceId: string,
  countryCode: string,
): Promise<RemoteCaseMeta[]> {
  const params = new URLSearchParams({ deviceId, countryCode })
  const { getAuthHeaders } = await import('../services/authHeaders')
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/workspace/cases?${params}`, { headers })
  if (!response.ok) return []
  const data = (await response.json()) as { cases?: RemoteCaseMeta[] }
  return data.cases ?? []
}

export function buildDashboardCase(
  caseId: string,
  local: LocalCaseMeta | undefined,
  remote: RemoteCaseMeta | undefined,
  documentTypeLabel: (typeId: string | undefined) => string,
  fallbackTitle: (shortId: string) => string,
): DashboardCase {
  const lastEditedAt = remote?.updatedAt ?? local?.lastOpened ?? new Date().toISOString()
  const pageHeading = local?.pageHeading?.trim()
  const localName = local?.localName?.trim()
  const localVorname = local?.localVorname?.trim()
  const localNachname = local?.localNachname?.trim()
  const localGeburtsdatum = local?.localGeburtsdatum?.trim()
  const localGeschlecht = local?.localGeschlecht
  const localAge = local?.localAge?.trim()
  const fullLocalName = [localVorname, localNachname].filter(Boolean).join(' ').trim()
  const displayTitle =
    fullLocalName || localName || pageHeading || remote?.titleHint?.trim() || fallbackTitle(shortCaseId(caseId))

  const docTypeId = local?.lastDocumentType
  const documentTypeSummary = docTypeId ? documentTypeLabel(docTypeId) : ''

  const timelineCount = countTimelines(caseId)
  const labGraphCount = countLabGraphs(caseId)

  return {
    caseId,
    displayTitle,
    lastEditedAt,
    documentTypeSummary,
    localName: localName || undefined,
    localVorname: localVorname || undefined,
    localNachname: localNachname || undefined,
    localGeburtsdatum: localGeburtsdatum || undefined,
    localGeschlecht: localGeschlecht || undefined,
    localAge: localAge || undefined,
    pageHeading: pageHeading || undefined,
    lastDocumentType: docTypeId,
    timelineCount: timelineCount > 0 ? timelineCount : undefined,
    labGraphCount: labGraphCount > 0 ? labGraphCount : undefined,
  }
}

interface UseCaseRegistryOptions {
  tier: PrivacyTier
  countryCode: string
  documentTypeLabel: (typeId: string | undefined) => string
  fallbackTitle: (shortId: string) => string
}

export function useCaseRegistry({
  tier,
  countryCode,
  documentTypeLabel,
  fallbackTitle,
}: UseCaseRegistryOptions) {
  const dbSyncEnabled = allowsWorkspaceDbSnapshot(tier) || isAccountBackupUnlocked()
  const [cases, setCases] = useState<DashboardCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await hydrateCaseRegistry()
    } catch (hydrateError) {
      setError(hydrateError instanceof Error ? hydrateError.message : 'Failed to load patients')
    }

    ensureDefaultCase()
    const localCases = listLocalCases()
    const localMap = Object.fromEntries(localCases.map((item) => [item.caseId, item]))

    let remoteCases: RemoteCaseMeta[] = []
    if (dbSyncEnabled) {
      try {
        const deviceId = getOrCreateDeviceId()
        remoteCases = await fetchRemoteCases(deviceId, countryCode)
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load cases')
      }
    }

    const caseIds = new Set<string>([
      ...localCases.map((item) => item.caseId),
      ...remoteCases.map((item) => item.caseId),
    ])

    if (caseIds.size === 0) caseIds.add(DEFAULT_CASE_ID)

    const remoteMap = Object.fromEntries(remoteCases.map((item) => [item.caseId, item]))
    const merged = [...caseIds].map((caseId) =>
      buildDashboardCase(caseId, localMap[caseId], remoteMap[caseId], documentTypeLabel, fallbackTitle),
    )

    merged.sort((a, b) => safeDateMs(b.lastEditedAt) - safeDateMs(a.lastEditedAt))
    setCases(merged)
    setLoading(false)
  }, [countryCode, dbSyncEnabled, documentTypeLabel, fallbackTitle])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const registerCase = useCallback(
    (caseId: string, patch?: Partial<LocalCaseMeta>) => {
      upsertCaseMeta(caseId, patch ?? {})
      void refresh()
    },
    [refresh],
  )

  const addCase = useCallback(() => {
    const created = createNewCase()
    void refresh()
    return created.caseId
  }, [refresh])

  return {
    cases,
    loading,
    error,
    refresh,
    registerCase,
    addCase,
    upsertCaseMeta,
    touchCaseOpened,
  }
}

import { useCallback, useEffect, useState } from 'react'
import { allowsWorkspaceDbSnapshot, type PrivacyTier } from '../data/privacyRegions'
import { API_BASE } from '../services/apiClient'
import { createCaseId, DEFAULT_CASE_ID, shortCaseId } from '../utils/caseContext'
import { countLabGraphs } from '../utils/labPersistence'
import { countTimelines } from '../utils/timelinePersistence'
import { getOrCreateDeviceId } from '../utils/cryptoVault'

export type LocalGeschlecht = 'maennlich' | 'weiblich' | 'divers'

export interface LocalCaseMeta {
  caseId: string
  localName?: string
  localGeburtsdatum?: string
  localGeschlecht?: LocalGeschlecht
  localAge?: string
  pageHeading?: string
  lastDocumentType?: string
  lastOpened: string
  createdAt: string
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
  localGeburtsdatum?: string
  localGeschlecht?: LocalGeschlecht
  localAge?: string
  pageHeading?: string
  lastDocumentType?: string
  timelineCount?: number
  labGraphCount?: number
}

const REGISTRY_KEY = 'psychiatry-ink:case-registry'

function loadRegistryMap(): Record<string, LocalCaseMeta> {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LocalCaseMeta>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveRegistryMap(map: Record<string, LocalCaseMeta>): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(map))
  } catch {
    // ignore quota errors
  }
}

export function ensureDefaultCase(): LocalCaseMeta {
  const map = loadRegistryMap()
  if (map[DEFAULT_CASE_ID]) return map[DEFAULT_CASE_ID]

  const meta: LocalCaseMeta = {
    caseId: DEFAULT_CASE_ID,
    createdAt: new Date().toISOString(),
    lastOpened: new Date().toISOString(),
  }
  map[DEFAULT_CASE_ID] = meta
  saveRegistryMap(map)
  return meta
}

export function upsertCaseMeta(caseId: string, patch: Partial<LocalCaseMeta>): LocalCaseMeta {
  const map = loadRegistryMap()
  const existing = map[caseId]
  const next: LocalCaseMeta = {
    ...existing,
    ...patch,
    caseId,
    createdAt: existing?.createdAt ?? patch.createdAt ?? new Date().toISOString(),
    lastOpened: patch.lastOpened ?? existing?.lastOpened ?? new Date().toISOString(),
  }
  map[caseId] = next
  saveRegistryMap(map)
  return next
}

export function getCaseMeta(caseId: string): LocalCaseMeta | null {
  return loadRegistryMap()[caseId] ?? null
}

export function listLocalCases(): LocalCaseMeta[] {
  const map = loadRegistryMap()
  return Object.values(map).sort(
    (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
  )
}

export function createNewCase(): LocalCaseMeta {
  const caseId = createCaseId()
  return upsertCaseMeta(caseId, {
    createdAt: new Date().toISOString(),
    lastOpened: new Date().toISOString(),
  })
}

export function touchCaseOpened(caseId: string): void {
  upsertCaseMeta(caseId, { lastOpened: new Date().toISOString() })
}

async function fetchRemoteCases(
  deviceId: string,
  countryCode: string,
): Promise<RemoteCaseMeta[]> {
  const params = new URLSearchParams({ deviceId, countryCode })
  const response = await fetch(`${API_BASE}/api/workspace/cases?${params}`)
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
  const localGeburtsdatum = local?.localGeburtsdatum?.trim()
  const localGeschlecht = local?.localGeschlecht
  const localAge = local?.localAge?.trim()
  const displayTitle =
    pageHeading || localName || remote?.titleHint?.trim() || fallbackTitle(shortCaseId(caseId))

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
  const dbSyncEnabled = allowsWorkspaceDbSnapshot(tier)
  const [cases, setCases] = useState<DashboardCase[]>([])
  const [loading, setLoading] = useState(dbSyncEnabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
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

    merged.sort((a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime())
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

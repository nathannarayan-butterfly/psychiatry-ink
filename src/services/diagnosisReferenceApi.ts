import {
  lookupByIcd10Code,
  searchDiagnosisCatalog,
  type DiagnosisCatalogEntry,
} from '../data/diagnosisCatalog'
import { API_BASE } from './apiClient'

export type DiagnosisCodeSystem = 'icd10' | 'icd11' | 'dsm5tr'

export interface DiagnosisSearchHit {
  system: DiagnosisCodeSystem
  code: string
  label: string
  icd10Code: string
  icd10Label: string
  icd11Code: string
  icd11Label: string
  dsmCode: string
  dsmLabel: string
}

export type ClientCodingSystem = 'icd10' | 'icd11' | 'dsm'

export function toApiSystem(system: ClientCodingSystem): DiagnosisCodeSystem {
  if (system === 'dsm') return 'dsm5tr'
  return system
}

function catalogEntryToHit(
  entry: DiagnosisCatalogEntry,
  system: ClientCodingSystem,
): DiagnosisSearchHit {
  const crosswalk = {
    icd10Code: entry.icd10.code,
    icd10Label: entry.icd10.label,
    icd11Code: entry.icd11.code,
    icd11Label: entry.icd11.label,
    dsmCode: entry.dsm.code,
    dsmLabel: entry.dsm.label,
  }

  if (system === 'icd11') {
    return { system: 'icd11', code: entry.icd11.code, label: entry.icd11.label, ...crosswalk }
  }
  if (system === 'dsm') {
    return { system: 'dsm5tr', code: entry.dsm.code, label: entry.dsm.label, ...crosswalk }
  }
  return { system: 'icd10', code: entry.icd10.code, label: entry.icd10.label, ...crosswalk }
}

function searchCatalogFallback(
  query: string,
  system: ClientCodingSystem,
  limit: number,
): DiagnosisSearchHit[] {
  return searchDiagnosisCatalog(query, limit).map((entry) => catalogEntryToHit(entry, system))
}

export async function searchDiagnosisCodes(
  query: string,
  system: ClientCodingSystem,
  limit = 12,
): Promise<DiagnosisSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    q,
    system: toApiSystem(system),
    limit: String(limit),
  })

  try {
    const response = await fetch(`${API_BASE}/api/diagnosis-codes/search?${params}`)
    if (response.ok) {
      const data = (await response.json()) as { results?: DiagnosisSearchHit[] }
      const results = data.results ?? []
      if (results.length > 0) return results
    }
  } catch {
    // fall through to bundled catalog
  }

  return searchCatalogFallback(q, system, limit)
}

export async function fetchCrosswalkByIcd10(icd10Code: string): Promise<DiagnosisSearchHit | null> {
  const code = icd10Code.trim()
  if (!code) return null

  const params = new URLSearchParams({ icd10: code })

  try {
    const response = await fetch(`${API_BASE}/api/diagnosis-codes/crosswalk?${params}`)
    if (response.ok) {
      const data = (await response.json()) as { crosswalk?: DiagnosisSearchHit | null }
      if (data.crosswalk) return data.crosswalk
    }
  } catch {
    // fall through to bundled catalog
  }

  const local = lookupByIcd10Code(code)
  return local ? catalogEntryToHit(local, 'icd10') : null
}

import {
  lookupByIcd10Code,
  searchDiagnosisCatalog,
  type DiagnosisCatalogEntry,
} from '../data/diagnosisCatalog'
import type {
  CatalogueSearchSystem,
  CatalogueSystem,
  DiagnosisCatalogueSearchHit,
} from '../types/diagnosisCatalogue'
import { API_BASE } from './apiClient'

export type { DiagnosisCatalogueSearchHit as DiagnosisSearchHit }

export type ClientCodingSystem = 'icd10' | 'icd11' | 'dsm' | 'all'

export type CatalogueFilterSystem = CatalogueSearchSystem

export function toApiCatalogueSystem(system: ClientCodingSystem): CatalogueFilterSystem {
  if (system === 'icd11') return 'ICD11MMS'
  if (system === 'dsm') return 'DSM5TR'
  if (system === 'all') return 'ALL'
  return 'ICD10GM'
}

export function catalogueSystemToClient(system: CatalogueSystem): 'icd10' | 'icd11' | 'dsm' {
  if (system === 'ICD11MMS') return 'icd11'
  if (system === 'DSM5TR') return 'dsm'
  return 'icd10'
}

function catalogEntryToHit(
  entry: DiagnosisCatalogEntry,
  system: 'icd10' | 'icd11',
): DiagnosisCatalogueSearchHit {
  const coding = system === 'icd11' ? entry.icd11 : entry.icd10
  const catalogueSystem: CatalogueSystem = system === 'icd11' ? 'ICD11MMS' : 'ICD10GM'
  return {
    diagnosisEntryId: `bundled-${catalogueSystem}-${coding.code}`,
    system: catalogueSystem,
    catalogueVersion: 'bundled',
    code: coding.code,
    title: coding.label,
    isCategory: false,
    isSelectable: true,
    criteriaAvailable: false,
  }
}

function searchCatalogFallback(
  query: string,
  system: ClientCodingSystem,
  limit: number,
): DiagnosisCatalogueSearchHit[] {
  const effective = system === 'all' ? 'icd10' : system === 'dsm' ? 'icd10' : system
  if (effective === 'icd11') {
    return searchDiagnosisCatalog(query, limit)
      .filter((e) => e.icd11.code.trim())
      .map((e) => catalogEntryToHit(e, 'icd11'))
  }
  return searchDiagnosisCatalog(query, limit).map((e) => catalogEntryToHit(e, 'icd10'))
}

export async function searchDiagnosisCodes(
  query: string,
  system: ClientCodingSystem,
  limit = 12,
): Promise<DiagnosisCatalogueSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    q,
    system: toApiCatalogueSystem(system),
    scope: 'psychiatric',
    limit: String(limit),
  })

  try {
    const response = await fetch(`${API_BASE}/api/diagnoses/search?${params}`)
    if (response.ok) {
      const data = (await response.json()) as { results?: DiagnosisCatalogueSearchHit[] }
      const results = data.results ?? []
      if (results.length > 0) return results
    }
  } catch {
    // fall through to bundled catalog
  }

  return searchCatalogFallback(q, system, limit)
}

/** @deprecated Crosswalk lookup — prefer independent catalogue selection. */
export async function fetchCrosswalkByIcd10(
  icd10Code: string,
): Promise<DiagnosisCatalogueSearchHit | null> {
  const code = icd10Code.trim()
  if (!code) return null

  const local = lookupByIcd10Code(code)
  return local ? catalogEntryToHit(local, 'icd10') : null
}

export async function fetchCatalogueCoverage(): Promise<unknown | null> {
  try {
    const response = await fetch(`${API_BASE}/api/diagnoses/coverage`)
    if (response.ok) return response.json()
  } catch {
    return null
  }
  return null
}

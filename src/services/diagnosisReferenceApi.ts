import {
  lookupByIcd10Code,
  pickCatalogLabel,
  searchDiagnosisCatalog,
  type DiagnosisCatalogEntry,
} from '../data/diagnosisCatalog'
import type { UiLanguage } from '../types/settings'
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
  lang: UiLanguage = 'de',
): DiagnosisCatalogueSearchHit {
  const coding = system === 'icd11' ? entry.icd11 : entry.icd10
  const catalogueSystem: CatalogueSystem = system === 'icd11' ? 'ICD11MMS' : 'ICD10GM'
  return {
    diagnosisEntryId: `bundled-${catalogueSystem}-${coding.code}`,
    system: catalogueSystem,
    catalogueVersion: 'bundled',
    code: coding.code,
    title: pickCatalogLabel(coding, lang),
    isCategory: false,
    isSelectable: true,
    criteriaAvailable: false,
  }
}

function searchCatalogFallback(
  query: string,
  system: ClientCodingSystem,
  limit: number,
  lang: UiLanguage = 'de',
): DiagnosisCatalogueSearchHit[] {
  const effective = system === 'all' ? 'icd10' : system === 'dsm' ? 'icd10' : system
  if (effective === 'icd11') {
    return searchDiagnosisCatalog(query, limit)
      .filter((e) => e.icd11.code.trim())
      .map((e) => catalogEntryToHit(e, 'icd11', lang))
  }
  return searchDiagnosisCatalog(query, limit).map((e) => catalogEntryToHit(e, 'icd10', lang))
}

export async function searchDiagnosisCodes(
  query: string,
  system: ClientCodingSystem,
  limit = 12,
  lang: UiLanguage = 'de',
): Promise<DiagnosisCatalogueSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  // Forward the active UI locale to the live endpoint via both `lang` query
  // param and `Accept-Language` header — without this, a non-German UI would
  // receive German labels from the database-backed catalogue while the bundled
  // fallback (used offline) correctly localized them.
  const params = new URLSearchParams({
    q,
    system: toApiCatalogueSystem(system),
    scope: 'psychiatric',
    limit: String(limit),
    lang,
  })

  try {
    const response = await fetch(`${API_BASE}/api/diagnoses/search?${params}`, {
      headers: { 'Accept-Language': lang },
    })
    if (response.ok) {
      const data = (await response.json()) as { results?: DiagnosisCatalogueSearchHit[] }
      const results = data.results ?? []
      if (results.length > 0) return results
    }
  } catch {
    // fall through to bundled catalog
  }

  return searchCatalogFallback(q, system, limit, lang)
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

import {
  countCatalogueEntries,
  countCatalogueEntriesWithCriteriaLinks,
  isCatalogueSeeded as repoIsCatalogueSeeded,
  listActiveCatalogues,
  listActiveCataloguesOrdered,
  searchCatalogueEntries,
  type CatalogueEntryCandidate,
} from '../data/diagnosis'
import type {
  CatalogueSearchScope,
  CatalogueSearchSystem,
  CatalogueSystem,
  DiagnosisCatalogueCoverage,
  DiagnosisCatalogueSearchHit,
} from '../../src/types/diagnosisCatalogue'

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function parseSearchSystem(raw: string | undefined): CatalogueSearchSystem {
  const value = (raw ?? 'ALL').trim().toUpperCase()
  if (value === 'ICD10GM' || value === 'ICD10' || value === 'ICD10WHO') return 'ICD10GM'
  if (value === 'ICD11MMS' || value === 'ICD11') return 'ICD11MMS'
  if (value === 'DSM5TR' || value === 'DSM') return 'DSM5TR'
  if (value === 'LOCAL') return 'LOCAL'
  return 'ALL'
}

function parseScope(raw: string | undefined): CatalogueSearchScope {
  const value = (raw ?? 'psychiatric').trim().toLowerCase()
  if (value === 'somatic') return 'somatic'
  if (value === 'all') return 'all'
  return 'psychiatric'
}

function rankHit(
  entry: {
    codeNormalized: string
    title: string
    searchText: string
    isSelectable: boolean
  },
  q: string,
  qCode: string,
): number {
  if (qCode && entry.codeNormalized === qCode) return 0
  if (qCode && entry.codeNormalized.startsWith(qCode)) return 1
  if (entry.title.toLowerCase().includes(q)) return 2
  if (entry.searchText.includes(q)) return 3
  return 4
}

export async function searchDiagnosisCatalogue(params: {
  q: string
  system?: string
  scope?: string
  limit?: number
}): Promise<DiagnosisCatalogueSearchHit[]> {
  const q = normalizeQuery(params.q)
  if (!q) return []

  const system = parseSearchSystem(params.system)
  const scope = parseScope(params.scope)
  const limitRaw = Number(params.limit ?? 12)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12
  const qCode = normalizeCode(params.q)

  const catalogues = await listActiveCatalogues(system)
  if (catalogues.length === 0) return []

  const catalogueIds = catalogues.map((c) => c.id)
  const catalogueById = new Map(catalogues.map((c) => [c.id, c]))

  const entries = await searchCatalogueEntries({
    q,
    qCode,
    rawTitle: params.q.trim(),
    scope,
    catalogueIds,
    catalogueById,
    poolSize: limit * 4,
  })

  const ranked = entries
    .map((entry) => ({
      entry,
      rank: rankHit(entry, q, qCode),
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      if (a.entry.isSelectable !== b.entry.isSelectable) {
        return a.entry.isSelectable ? -1 : 1
      }
      return a.entry.code.localeCompare(b.entry.code)
    })
    .slice(0, limit)

  return ranked.map(({ entry }: { entry: CatalogueEntryCandidate }) => ({
    diagnosisEntryId: entry.id,
    system: entry.system,
    catalogueVersion: entry.catalogueVersion,
    code: entry.code,
    title: entry.title,
    shortTitle: entry.shortTitle ?? undefined,
    chapterCode: entry.chapterCode ?? undefined,
    chapterTitle: entry.chapterTitle ?? undefined,
    blockCode: entry.blockCode ?? undefined,
    blockTitle: entry.blockTitle ?? undefined,
    isCategory: entry.isCategory,
    isSelectable: entry.isSelectable,
    criteriaAvailable: entry.criteriaAvailable,
  }))
}

export async function getDiagnosisCatalogueCoverage(): Promise<DiagnosisCatalogueCoverage> {
  const catalogues = await listActiveCataloguesOrdered()

  const catalogueStats = []
  let totalPsychiatric = 0
  let icd10Psychiatric = 0
  let icd11Psychiatric = 0
  let withLinks = 0
  let withoutLinks = 0

  for (const catalogue of catalogues) {
    const entryCount = await countCatalogueEntries(catalogue.id)
    const psychiatricCount = await countCatalogueEntries(catalogue.id, 'is_psychiatric')
    const somaticCount = await countCatalogueEntries(catalogue.id, 'is_somatic')
    const withCriteriaLinks = await countCatalogueEntriesWithCriteriaLinks(catalogue.id)
    const withoutCriteriaLinks = entryCount - withCriteriaLinks

    totalPsychiatric += psychiatricCount
    if (catalogue.system === 'ICD10GM') icd10Psychiatric += psychiatricCount
    if (catalogue.system === 'ICD11MMS') icd11Psychiatric += psychiatricCount
    withLinks += withCriteriaLinks
    withoutLinks += withoutCriteriaLinks

    catalogueStats.push({
      system: catalogue.system as CatalogueSystem,
      version: catalogue.version,
      language: catalogue.language,
      active: catalogue.active,
      importedAt: new Date(catalogue.importedAt).toISOString(),
      entryCount,
      psychiatricCount,
      somaticCount,
      withCriteriaLinks,
      withoutCriteriaLinks,
    })
  }

  return {
    catalogues: catalogueStats,
    totals: {
      psychiatric: totalPsychiatric,
      icd10Psychiatric,
      icd11Psychiatric,
      withCriteriaLinks: withLinks,
      withoutCriteriaLinks: withoutLinks,
    },
  }
}

export async function isCatalogueSeeded(): Promise<boolean> {
  return repoIsCatalogueSeeded()
}

import { prisma } from '../db'
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

function scopeFilter(scope: CatalogueSearchScope) {
  if (scope === 'psychiatric') return { isPsychiatric: true }
  if (scope === 'somatic') return { isSomatic: true }
  return {}
}

function systemFilter(system: CatalogueSearchSystem): { system?: CatalogueSystem | { in: CatalogueSystem[] } } {
  if (system === 'ALL') {
    return { system: { in: ['ICD10GM', 'ICD11MMS'] } }
  }
  return { system }
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

  const catalogues = await prisma.diagnosisCatalogue.findMany({
    where: { active: true, ...systemFilter(system) },
    select: { id: true, system: true, version: true },
  })
  if (catalogues.length === 0) return []

  const catalogueIds = catalogues.map((c) => c.id)
  const catalogueById = new Map(catalogues.map((c) => [c.id, c]))

  const entries = await prisma.diagnosisEntry.findMany({
    where: {
      catalogueId: { in: catalogueIds },
      ...scopeFilter(scope),
      OR: [
        { searchText: { contains: q } },
        { codeNormalized: { startsWith: qCode } },
        { title: { contains: params.q.trim() } },
        {
          synonyms: {
            some: {
              OR: [
                { normalizedTerm: { contains: q } },
                { term: { contains: params.q.trim() } },
              ],
            },
          },
        },
      ],
    },
    include: {
      criteriaLinks: { select: { id: true }, take: 1 },
      catalogue: { select: { system: true, version: true } },
    },
    take: limit * 4,
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

  return ranked.map(({ entry }) => {
    const cat = catalogueById.get(entry.catalogueId) ?? entry.catalogue
    return {
      diagnosisEntryId: entry.id,
      system: cat.system as CatalogueSystem,
      catalogueVersion: cat.version,
      code: entry.code,
      title: entry.title,
      shortTitle: entry.shortTitle ?? undefined,
      chapterCode: entry.chapterCode ?? undefined,
      chapterTitle: entry.chapterTitle ?? undefined,
      blockCode: entry.blockCode ?? undefined,
      blockTitle: entry.blockTitle ?? undefined,
      isCategory: entry.isCategory,
      isSelectable: entry.isSelectable,
      criteriaAvailable: entry.criteriaLinks.length > 0,
    }
  })
}

export async function getDiagnosisCatalogueCoverage(): Promise<DiagnosisCatalogueCoverage> {
  const catalogues = await prisma.diagnosisCatalogue.findMany({
    where: { active: true },
    orderBy: [{ system: 'asc' }, { version: 'desc' }],
  })

  const catalogueStats = []
  let totalPsychiatric = 0
  let icd10Psychiatric = 0
  let icd11Psychiatric = 0
  let withLinks = 0
  let withoutLinks = 0

  for (const catalogue of catalogues) {
    const entryCount = await prisma.diagnosisEntry.count({
      where: { catalogueId: catalogue.id },
    })
    const psychiatricCount = await prisma.diagnosisEntry.count({
      where: { catalogueId: catalogue.id, isPsychiatric: true },
    })
    const somaticCount = await prisma.diagnosisEntry.count({
      where: { catalogueId: catalogue.id, isSomatic: true },
    })
    const withCriteriaLinks = await prisma.diagnosisEntry.count({
      where: {
        catalogueId: catalogue.id,
        criteriaLinks: { some: {} },
      },
    })
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
      importedAt: catalogue.importedAt.toISOString(),
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
  const count = await prisma.diagnosisCatalogue.count({ where: { active: true } })
  return count > 0
}

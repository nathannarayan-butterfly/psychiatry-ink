import { beforeEach, describe, expect, it, vi } from 'vitest'

const listActiveCatalogues = vi.fn()
const searchCatalogueEntries = vi.fn()

vi.mock('../../data/diagnosis', () => ({
  listActiveCatalogues: (...args: unknown[]) => listActiveCatalogues(...args),
  searchCatalogueEntries: (...args: unknown[]) => searchCatalogueEntries(...args),
  listActiveCataloguesOrdered: vi.fn(),
  countCatalogueEntries: vi.fn(),
  countCatalogueEntriesWithCriteriaLinks: vi.fn(),
  isCatalogueSeeded: vi.fn(),
}))

describe('diagnosis catalogue search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not import or query diagnosisCriteria', async () => {
    listActiveCatalogues.mockResolvedValue([
      { id: 'cat-1', system: 'ICD11MMS', version: '2024-01' },
    ])
    searchCatalogueEntries.mockResolvedValue([
      {
        id: 'e-1',
        code: '6A20',
        codeNormalized: '6A20',
        title: 'Schizophrenie',
        searchText: '6a20 schizophrenie',
        shortTitle: null,
        chapterCode: '06',
        chapterTitle: 'Mental disorders',
        blockCode: '6A2',
        blockTitle: null,
        isCategory: false,
        isSelectable: true,
        system: 'ICD11MMS',
        catalogueVersion: '2024-01',
        catalogueId: 'cat-1',
        criteriaAvailable: true,
      },
    ])

    const { searchDiagnosisCatalogue } = await import('../diagnosisCatalogueStore')
    const results = await searchDiagnosisCatalogue({ q: '6A20', system: 'ICD11MMS' })

    expect(results).toHaveLength(1)
    expect(results[0]?.code).toBe('6A20')
    expect(results[0]?.system).toBe('ICD11MMS')
    expect(results[0]?.criteriaAvailable).toBe(true)
    expect(searchCatalogueEntries).toHaveBeenCalled()
  })

  it('returns ICD-11 hits without ICD-10 crosswalk fields', async () => {
    listActiveCatalogues.mockResolvedValue([
      { id: 'cat-1', system: 'ICD11MMS', version: '2024-01' },
    ])
    searchCatalogueEntries.mockResolvedValue([
      {
        id: 'e-2',
        code: '6A20.0',
        codeNormalized: '6A20.0',
        title: 'Schizophrenie, erste Episode',
        searchText: '6a20.0',
        shortTitle: null,
        chapterCode: '06',
        chapterTitle: null,
        blockCode: null,
        blockTitle: null,
        isCategory: false,
        isSelectable: true,
        system: 'ICD11MMS',
        catalogueVersion: '2024-01',
        catalogueId: 'cat-1',
        criteriaAvailable: false,
      },
    ])

    const { searchDiagnosisCatalogue } = await import('../diagnosisCatalogueStore')
    const results = await searchDiagnosisCatalogue({ q: '6A20', system: 'ICD11MMS' })

    expect(results[0]).not.toHaveProperty('icd10Code')
    expect(results[0]).not.toHaveProperty('icd10Label')
    expect(results[0]?.criteriaAvailable).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = {
  diagnosisCatalogue: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  diagnosisEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}

vi.mock('../../db', () => ({
  prisma: prismaMock,
}))

describe('diagnosis catalogue search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not import or query diagnosisCriteria', async () => {
    prismaMock.diagnosisCatalogue.findMany.mockResolvedValue([
      { id: 'cat-1', system: 'ICD11MMS', version: '2024-01' },
    ])
    prismaMock.diagnosisEntry.findMany.mockResolvedValue([
      {
        id: 'e-1',
        catalogueId: 'cat-1',
        code: '6A20',
        codeNormalized: '6A20',
        title: 'Schizophrenie',
        shortTitle: null,
        chapterCode: '06',
        chapterTitle: 'Mental disorders',
        blockCode: '6A2',
        blockTitle: null,
        isCategory: false,
        isSelectable: true,
        searchText: '6a20 schizophrenie',
        catalogue: { system: 'ICD11MMS', version: '2024-01' },
        criteriaLinks: [{ id: 'link-1' }],
      },
    ])

    const { searchDiagnosisCatalogue } = await import('../diagnosisCatalogueStore')
    const results = await searchDiagnosisCatalogue({ q: '6A20', system: 'ICD11MMS' })

    expect(results).toHaveLength(1)
    expect(results[0]?.code).toBe('6A20')
    expect(results[0]?.system).toBe('ICD11MMS')
    expect(results[0]?.criteriaAvailable).toBe(true)
    expect(prismaMock.diagnosisEntry.findMany).toHaveBeenCalled()
  })

  it('returns ICD-11 hits without ICD-10 crosswalk fields', async () => {
    prismaMock.diagnosisCatalogue.findMany.mockResolvedValue([
      { id: 'cat-1', system: 'ICD11MMS', version: '2024-01' },
    ])
    prismaMock.diagnosisEntry.findMany.mockResolvedValue([
      {
        id: 'e-2',
        catalogueId: 'cat-1',
        code: '6A20.0',
        codeNormalized: '6A20.0',
        title: 'Schizophrenie, erste Episode',
        shortTitle: null,
        chapterCode: '06',
        chapterTitle: null,
        blockCode: null,
        blockTitle: null,
        isCategory: false,
        isSelectable: true,
        searchText: '6a20.0',
        catalogue: { system: 'ICD11MMS', version: '2024-01' },
        criteriaLinks: [],
      },
    ])

    const { searchDiagnosisCatalogue } = await import('../diagnosisCatalogueStore')
    const results = await searchDiagnosisCatalogue({ q: '6A20', system: 'ICD11MMS' })

    expect(results[0]).not.toHaveProperty('icd10Code')
    expect(results[0]).not.toHaveProperty('icd10Label')
    expect(results[0]?.criteriaAvailable).toBe(false)
  })
})

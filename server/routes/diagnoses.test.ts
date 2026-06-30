import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const listActiveCatalogues = vi.fn()
const searchCatalogueEntries = vi.fn()

vi.mock('../data/diagnosis', () => ({
  listActiveCatalogues: (...args: unknown[]) => listActiveCatalogues(...args),
  searchCatalogueEntries: (...args: unknown[]) => searchCatalogueEntries(...args),
  listActiveCataloguesOrdered: vi.fn(),
  countCatalogueEntries: vi.fn(),
  countCatalogueEntriesWithCriteriaLinks: vi.fn(),
  isCatalogueSeeded: vi.fn(),
}))

import { diagnosesRouter } from './diagnoses'

let server: Server
let baseUrl: string

beforeAll(() => {
  const app = express()
  app.use(express.json())
  app.use('/api/diagnoses', diagnosesRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  listActiveCatalogues.mockReset()
  searchCatalogueEntries.mockReset()
})

const DE_CATALOGUE = {
  id: 'cat-de',
  system: 'ICD10GM' as const,
  version: '2024',
  language: 'de',
}

const EN_CATALOGUE = {
  id: 'cat-en',
  system: 'ICD10GM' as const,
  version: '2024',
  language: 'en',
}

function makeEntry(catalogueId: string, title: string, language: 'de' | 'en') {
  return {
    id: `${catalogueId}-F20`,
    code: 'F20',
    codeNormalized: 'F20',
    title,
    searchText: title.toLowerCase(),
    shortTitle: null,
    chapterCode: '05',
    chapterTitle: null,
    blockCode: 'F20',
    blockTitle: null,
    isCategory: false,
    isSelectable: true,
    system: 'ICD10GM' as const,
    catalogueVersion: '2024',
    catalogueId,
    criteriaAvailable: false,
    _language: language,
  }
}

describe('GET /api/diagnoses/search — locale handling', () => {
  it('returns English labels when `?lang=en` is passed and an English catalogue is active', async () => {
    // Mirror the real data layer: when a language is requested AND a matching
    // active catalogue exists, the data layer narrows the catalogue set.
    listActiveCatalogues.mockImplementation((_system: unknown, language?: string) => {
      if (language === 'en') return Promise.resolve([EN_CATALOGUE])
      return Promise.resolve([DE_CATALOGUE, EN_CATALOGUE])
    })
    searchCatalogueEntries.mockImplementation(
      async (params: { catalogueIds: string[] }) => {
        // Each catalogue returns its own localized entry; the service narrows
        // the catalogue set, so this implementation honours that filter.
        const out = []
        if (params.catalogueIds.includes(DE_CATALOGUE.id)) {
          out.push(makeEntry(DE_CATALOGUE.id, 'Schizophrenie', 'de'))
        }
        if (params.catalogueIds.includes(EN_CATALOGUE.id)) {
          out.push(makeEntry(EN_CATALOGUE.id, 'Schizophrenia', 'en'))
        }
        return out
      },
    )

    const res = await fetch(`${baseUrl}/api/diagnoses/search?q=F20&system=ICD10GM&lang=en`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ title: string }> }
    expect(body.results).toHaveLength(1)
    expect(body.results[0]?.title).toBe('Schizophrenia')
    expect(listActiveCatalogues).toHaveBeenCalledWith('ICD10GM', 'en')
  })

  it('honours `Accept-Language` when no explicit `lang` query is provided', async () => {
    listActiveCatalogues.mockImplementation((_system: unknown, language?: string) => {
      if (language === 'en') return Promise.resolve([EN_CATALOGUE])
      return Promise.resolve([DE_CATALOGUE])
    })
    searchCatalogueEntries.mockResolvedValue([makeEntry(EN_CATALOGUE.id, 'Schizophrenia', 'en')])

    const res = await fetch(`${baseUrl}/api/diagnoses/search?q=F20&system=ICD10GM`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ title: string }> }
    expect(body.results[0]?.title).toBe('Schizophrenia')
    expect(listActiveCatalogues).toHaveBeenCalledWith('ICD10GM', 'en')
  })

  it('falls back to German labels when no localized catalogue is active', async () => {
    listActiveCatalogues.mockResolvedValue([DE_CATALOGUE])
    searchCatalogueEntries.mockResolvedValue([makeEntry(DE_CATALOGUE.id, 'Schizophrenie', 'de')])

    const res = await fetch(`${baseUrl}/api/diagnoses/search?q=F20&system=ICD10GM&lang=fr`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ title: string }> }
    expect(body.results[0]?.title).toBe('Schizophrenie')
  })

  it('returns German when no language is requested (legacy behaviour)', async () => {
    listActiveCatalogues.mockImplementation((_system: unknown, language?: string) => {
      expect(language).toBeUndefined()
      return Promise.resolve([DE_CATALOGUE])
    })
    searchCatalogueEntries.mockResolvedValue([makeEntry(DE_CATALOGUE.id, 'Schizophrenie', 'de')])

    const res = await fetch(`${baseUrl}/api/diagnoses/search?q=F20&system=ICD10GM`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ title: string }> }
    expect(body.results[0]?.title).toBe('Schizophrenie')
  })

  it('ignores an unsupported lang value (no narrowing in the data layer)', async () => {
    listActiveCatalogues.mockImplementation((_system: unknown, language?: string) => {
      // `xx` is not in our locale allow-list → catalogue store passes
      // `undefined` to the data layer, which returns all active catalogues.
      expect(language).toBeUndefined()
      return Promise.resolve([DE_CATALOGUE])
    })
    searchCatalogueEntries.mockResolvedValue([makeEntry(DE_CATALOGUE.id, 'Schizophrenie', 'de')])

    const res = await fetch(`${baseUrl}/api/diagnoses/search?q=F20&system=ICD10GM&lang=xx`)
    expect(res.status).toBe(200)
  })
})

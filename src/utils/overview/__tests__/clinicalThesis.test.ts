import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { NotionDocumentSnapshot } from '../../notionDocumentActions'
import { buildClinicalThesis, composeThesisFromDocumentedSections } from '../clinicalThesis'

vi.mock('../../../hooks/useCaseRegistry', () => ({
  getCaseMeta: vi.fn(),
}))

vi.mock('../../notionDocumentActions', () => ({
  loadNotionDocumentSnapshot: vi.fn(() => null),
}))

vi.mock('../../clinicalImprint', () => ({
  loadClinicalImprintIndex: vi.fn(() => ({ imprints: [] })),
}))

vi.mock('../../diagnosenArchive', () => ({
  loadDiagnosen: vi.fn(() => []),
  selectPrimaryCoding: vi.fn(),
}))

vi.mock('../../verlaufFeed', () => ({
  loadVerlaufFeed: vi.fn(() => [{ content: 'Random Verlauf feed snippet that should not appear.' }]),
}))

import { getCaseMeta } from '../../../hooks/useCaseRegistry'
import { loadNotionDocumentSnapshot } from '../../notionDocumentActions'
import { loadDiagnosen, selectPrimaryCoding } from '../../diagnosenArchive'
import { loadVerlaufFeed } from '../../verlaufFeed'

const mockGetCaseMeta = vi.mocked(getCaseMeta)
const mockLoadSnapshot = vi.mocked(loadNotionDocumentSnapshot)
const mockLoadDiagnosen = vi.mocked(loadDiagnosen)
const mockSelectPrimaryCoding = vi.mocked(selectPrimaryCoding)
const mockLoadVerlaufFeed = vi.mocked(loadVerlaufFeed)

describe('composeThesisFromDocumentedSections', () => {
  it('synthesizes stabilization + insight from demo-like documented sections', () => {
    const thesis = composeThesisFromDocumentedSections(
      'Wechselhafte Stimmung, paranoid-misstrauische Grundhaltung, zuletzt ruhiger.',
      'Einnahme aktuell regelmäßig, Einsicht langsam zunehmend.',
      'Stabilisierung unter Antipsychotikum, psychoedukative Gruppe, Sporttherapie.',
    )
    expect(thesis).toBe(
      'Stabilisierung der paranoiden Symptomatik unter Antipsychotikum — Krankheitseinsicht langsam zunehmend.',
    )
  })

  it('returns null when sections are too sparse to compose safely', () => {
    expect(composeThesisFromDocumentedSections(undefined, undefined, undefined)).toBeNull()
    expect(composeThesisFromDocumentedSections('kurz', undefined, undefined)).toBeNull()
  })
})

describe('buildClinicalThesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCaseMeta.mockReturnValue(null)
    mockLoadSnapshot.mockReturnValue(null)
    mockLoadDiagnosen.mockReturnValue([])
  })

  it('returns null for an empty case without documentation', () => {
    expect(buildClinicalThesis('UNKNOWN-CASE-WITHOUT-DATA')).toBeNull()
    expect(mockLoadVerlaufFeed).not.toHaveBeenCalled()
  })

  it('prefers registry clinical subheading from import AI', () => {
    mockGetCaseMeta.mockReturnValue({
      caseId: 'case-1',
      localClinicalSubheading: 'Stationäre Aufnahme bei psychischer Dekompensation.',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastOpened: '2024-01-01T00:00:00.000Z',
    })

    expect(buildClinicalThesis('case-1')).toBe('Stationäre Aufnahme bei psychischer Dekompensation.')
    expect(mockLoadVerlaufFeed).not.toHaveBeenCalled()
  })

  it('falls back to primary diagnosis instead of random Verlauf feed entries', () => {
    mockLoadDiagnosen.mockReturnValue([
      {
        id: 'dx-1',
        icd10: { code: 'F20.0', label: 'Paranoide Schizophrenie', overridden: false },
        icd11: { code: '', label: '', overridden: false },
        dsm: { code: '', label: '', overridden: false },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    mockSelectPrimaryCoding.mockReturnValue({
      coding: { code: 'F20.0', label: 'Paranoide Schizophrenie', overridden: false },
      version: 'icd10',
    })

    expect(buildClinicalThesis('case-1')).toBe('F20.0 — Paranoide Schizophrenie')
    expect(mockLoadVerlaufFeed).not.toHaveBeenCalled()
  })

  it('falls back to admission context from anamnese sections', () => {
    mockLoadSnapshot.mockImplementation((docType): NotionDocumentSnapshot | null => {
      if (docType === 'anamnese') {
        return {
          documentTypeId: 'anamnese',
          pageHeading: 'Anamnese',
          sectionContents: {
            'aktuelle-beschwerden': 'Zunehmende Unruhe und Schlafstörung seit zwei Wochen.',
          },
          savedAt: '2024-01-01T00:00:00.000Z',
        }
      }
      return null
    })

    expect(buildClinicalThesis('case-1')).toBe('Zunehmende Unruhe und Schlafstörung seit zwei Wochen')
    expect(mockLoadVerlaufFeed).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUFNAHME_PSYCHOPATH_SECTION_ID,
  readPsychopathSnapshot,
  resolveDocumentPsychopathologyText,
  resolvePsychopathologyText,
} from '../psychopathSnapshot'

vi.mock('../../notionDocumentActions', () => ({
  loadNotionDocumentSnapshot: vi.fn(),
}))

vi.mock('../../dokumenteArchive', () => ({
  loadDokumente: vi.fn(() => []),
}))

import { loadNotionDocumentSnapshot } from '../../notionDocumentActions'
import { loadDokumente } from '../../dokumenteArchive'

const mockLoadSnapshot = vi.mocked(loadNotionDocumentSnapshot)
const mockLoadDokumente = vi.mocked(loadDokumente)

describe('resolvePsychopathologyText', () => {
  beforeEach(() => {
    mockLoadSnapshot.mockReset()
    mockLoadDokumente.mockReset()
    mockLoadDokumente.mockReturnValue([])
  })

  it('prefers standalone psychopath page when present', () => {
    mockLoadSnapshot.mockImplementation((documentTypeId) => {
      if (documentTypeId === 'psychopath') {
        return {
          documentTypeId: 'psychopath',
          pageHeading: 'Psychopathologischer Befund',
          sectionContents: { free: 'Freitext auf der Psychopath-Seite.' } as Record<string, string>,
          savedAt: '2026-06-01T10:00:00.000Z',
        }
      }
      if (documentTypeId === 'aufnahme') {
        return {
          documentTypeId: 'aufnahme',
          pageHeading: 'Aufnahme',
          sectionContents: {
            [AUFNAHME_PSYCHOPATH_SECTION_ID]: 'PPB in Anamnese — soll nicht überschreiben.',
          },
          savedAt: '2026-06-02T10:00:00.000Z',
        }
      }
      return null
    })

    expect(resolvePsychopathologyText('case-1')).toEqual({
      text: 'Freitext auf der Psychopath-Seite.',
      savedAt: '2026-06-01T10:00:00.000Z',
    })
  })

  it('reads psychopathologischer-befund from Aufnahme when psychopath page is empty', () => {
    mockLoadSnapshot.mockImplementation((documentTypeId) => {
      if (documentTypeId === 'psychopath') return null
      if (documentTypeId === 'aufnahme') {
        return {
          documentTypeId: 'aufnahme',
          pageHeading: 'Aufnahme',
          sectionContents: {
            aufnahmeanlass: 'Notfallvorstellung',
            [AUFNAHME_PSYCHOPATH_SECTION_ID]:
              'Wach, allseits orientiert, niedergestimmt, antriebsarm.',
          },
          savedAt: '2026-06-03T12:00:00.000Z',
        }
      }
      return null
    })

    expect(resolvePsychopathologyText('case-2')).toEqual({
      text: 'Wach, allseits orientiert, niedergestimmt, antriebsarm.',
      savedAt: '2026-06-03T12:00:00.000Z',
    })
  })

  it('reads psychopathologischer-befund from legacy anamnese snapshot', () => {
    mockLoadSnapshot.mockImplementation((documentTypeId) => {
      if (documentTypeId === 'psychopath' || documentTypeId === 'aufnahme') return null
      if (documentTypeId === 'anamnese') {
        return {
          documentTypeId: 'anamnese',
          pageHeading: 'Anamnese',
          sectionContents: {
            [AUFNAHME_PSYCHOPATH_SECTION_ID]: 'Affektiv gedrückt, antriebsarm.',
          },
          savedAt: '2026-06-03T13:00:00.000Z',
        }
      }
      return null
    })

    expect(resolveDocumentPsychopathologyText('case-anamnese')).toEqual({
      text: 'Affektiv gedrückt, antriebsarm.',
      savedAt: '2026-06-03T13:00:00.000Z',
      source: 'aufnahme',
    })
  })

  it('falls back to imported Aufnahmebefund sectionContents when workspace snapshot is missing', () => {
    mockLoadSnapshot.mockReturnValue(null)
    mockLoadDokumente.mockReturnValue([
      {
        id: 'doc-1',
        caseId: 'case-3',
        category: 'anamnese',
        title: 'Aufnahmebefund',
        content: 'Gesamter Aufnahmetext',
        date: '2026-06-04T08:00:00.000Z',
        source: 'manual',
        pageType: 'aufnahme',
        sectionContents: {
          [AUFNAHME_PSYCHOPATH_SECTION_ID]: 'Importierter psychopathologischer Befund.',
        },
      },
    ])

    expect(resolvePsychopathologyText('case-3')).toEqual({
      text: 'Importierter psychopathologischer Befund.',
      savedAt: '2026-06-04T08:00:00.000Z',
    })
  })

  it('ignores empty-string psychopath sections', () => {
    mockLoadSnapshot.mockImplementation((documentTypeId) => {
      if (documentTypeId === 'psychopath') return null
      if (documentTypeId === 'aufnahme') {
        return {
          documentTypeId: 'aufnahme',
          pageHeading: 'Aufnahme',
          sectionContents: {
            [AUFNAHME_PSYCHOPATH_SECTION_ID]: '   ',
          },
          savedAt: '2026-06-05T08:00:00.000Z',
        }
      }
      return null
    })

    expect(resolvePsychopathologyText('case-4')).toEqual({ text: null, savedAt: null })
  })
})

describe('readPsychopathSnapshot', () => {
  beforeEach(() => {
    mockLoadSnapshot.mockReset()
    mockLoadDokumente.mockReset()
    mockLoadDokumente.mockReturnValue([])
  })

  it('clamps long Aufnahme psychopathology text for the overview card', () => {
    const longText = `${'A'.repeat(400)} niedergestimmt`
    mockLoadSnapshot.mockImplementation((documentTypeId) => {
      if (documentTypeId === 'aufnahme') {
        return {
          documentTypeId: 'aufnahme',
          pageHeading: 'Aufnahme',
          sectionContents: { [AUFNAHME_PSYCHOPATH_SECTION_ID]: longText },
          savedAt: '2026-06-06T08:00:00.000Z',
        }
      }
      return null
    })

    const result = readPsychopathSnapshot('case-5', 320)
    expect(result.text).toHaveLength(320)
    expect(result.text?.endsWith('…')).toBe(true)
    expect(result.savedAt).toBe('2026-06-06T08:00:00.000Z')
  })
})

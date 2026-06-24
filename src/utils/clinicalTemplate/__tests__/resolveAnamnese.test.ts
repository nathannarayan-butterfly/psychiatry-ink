import { describe, expect, it, vi, beforeEach } from 'vitest'
import { resolveAnamneseSections } from '../resolveAnamnese'

vi.mock('../../notionDocumentActions', () => ({
  loadNotionDocumentSnapshot: vi.fn(),
}))

import { loadNotionDocumentSnapshot } from '../../notionDocumentActions'

const mockLoad = vi.mocked(loadNotionDocumentSnapshot)

describe('resolveAnamneseSections', () => {
  beforeEach(() => {
    mockLoad.mockReset()
  })

  it('returns aufnahme sections in canonical order with plain text', () => {
    mockLoad.mockReturnValue({
      documentTypeId: 'aufnahme',
      pageHeading: 'Aufnahme',
      savedAt: '2026-06-01T00:00:00.000Z',
      sectionContents: {
        'psychiatrische-vorgeschichte': '<p>Schizophrenie 2019.</p>',
        aufnahmeanlass: 'Notfallaufnahme',
        'aktuelle-krankheitsanamnese': '',
      },
    })

    const sections = resolveAnamneseSections('case-1')
    expect(sections.map((s) => s.sectionId)).toEqual(['aufnahmeanlass', 'psychiatrische-vorgeschichte'])
    expect(sections[0]?.text).toBe('Notfallaufnahme')
    expect(sections[1]?.text).toBe('Schizophrenie 2019.')
    expect(sections[1]?.label).toBe('Psychiatrische Vorgeschichte')
  })

  it('returns empty array when snapshot is missing or all sections empty', () => {
    mockLoad.mockReturnValue(null)
    expect(resolveAnamneseSections('case-1')).toEqual([])

    mockLoad.mockReturnValue({
      documentTypeId: 'aufnahme',
      pageHeading: 'Aufnahme',
      savedAt: '2026-06-01T00:00:00.000Z',
      sectionContents: { aufnahmeanlass: '   ' },
    })
    expect(resolveAnamneseSections('case-1')).toEqual([])
  })
})

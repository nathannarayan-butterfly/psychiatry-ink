import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_BASE_SEED } from '../../data/knowledgeBaseSeedData'
import {
  buildSectionsFromLegacyContent,
  createEmptyKnowledgeEntrySection,
  ensureKnowledgeEntrySections,
  parseMarkdownSections,
} from './knowledgeEntrySections'

describe('parseMarkdownSections', () => {
  it('splits bold headings into sections', () => {
    const body = `Intro paragraph.

**Kernsymptome:**
- Item one

**Management:**
1. Step one`
    const sections = parseMarkdownSections(body)
    expect(sections).toHaveLength(3)
    expect(sections[0].content).toContain('Intro paragraph')
    expect(sections[1].label).toBe('Kernsymptome')
    expect(sections[2].label).toBe('Management')
  })
})

describe('createEmptyKnowledgeEntrySection', () => {
  it('defaults to German labels for German UI', () => {
    const section = createEmptyKnowledgeEntrySection('entry-1', 0, 'de')
    expect(section.label).toBe('Neuer Abschnitt')
    expect(section.labelEn).toBeUndefined()
  })

  it('defaults to English labels for English UI', () => {
    const section = createEmptyKnowledgeEntrySection('entry-1', 1, 'en')
    expect(section.labelEn).toBe('New section')
    expect(section.label).toBe('')
  })
})

describe('ensureKnowledgeEntrySections', () => {
  it('derives aligned DE/EN section headings from seed entries', () => {
    for (const entry of KNOWLEDGE_BASE_SEED) {
      const withSections = ensureKnowledgeEntrySections(entry)
      expect(withSections.sections?.length).toBeGreaterThan(0)
      const built = buildSectionsFromLegacyContent(entry)
      expect(withSections.sections?.length).toBe(built.length)
      for (let i = 0; i < built.length; i += 1) {
        expect(withSections.sections?.[i]?.label).toBe(built[i].label)
        if (entry.contentEn) {
          expect(withSections.sections?.[i]?.labelEn).toBeTruthy()
        }
      }
    }
  })
})

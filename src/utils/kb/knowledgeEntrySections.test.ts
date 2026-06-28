import { describe, expect, it } from 'vitest'
import { KNOWLEDGE_BASE_SEED, type KnowledgeEntry } from '../../data/knowledgeBaseSeedData'
import {
  buildSectionsFromLegacyContent,
  createEmptyKnowledgeEntrySection,
  ensureKnowledgeEntrySections,
  localizedSectionLabel,
  parseMarkdownSections,
} from './knowledgeEntrySections'

function makeEntry(overrides: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    id: 'kb-test-1',
    title: 'Test',
    category: 'Klinik',
    content: '',
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as KnowledgeEntry
}

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

describe('buildSectionsFromLegacyContent — locale-correct default headings', () => {
  it('a new entry (no contentEn, no markdown heading) gets an English default label', () => {
    // Mirrors AddClinicalEntryDialog: free-text content, no `**Heading:**`, no
    // English translation yet. The generated default heading must be bilingual
    // so the English KB does not render the German "Übersicht".
    const entry = makeEntry({ content: 'Plain clinical note without any heading.' })
    const sections = buildSectionsFromLegacyContent(entry)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Übersicht')
    expect(sections[0].labelEn).toBe('Overview')
    expect(localizedSectionLabel(sections[0], 'en')).toBe('Overview')
    expect(localizedSectionLabel(sections[0], 'de')).toBe('Übersicht')
  })

  it('generated "Section N" defaults are also bilingual', () => {
    const entry = makeEntry({
      content: 'Intro paragraph.\n\nSecond paragraph with no heading either.',
    })
    // Two unlabelled blocks → first is Übersicht/Overview, the rest Abschnitt/Section N.
    const sections = buildSectionsFromLegacyContent(entry)
    const generated = sections.filter((s) => s.label !== 'Übersicht')
    for (const section of generated) {
      expect(localizedSectionLabel(section, 'en')).toMatch(/^Section \d+$/)
      expect(localizedSectionLabel(section, 'de')).toMatch(/^Abschnitt \d+$/)
    }
  })

  it('does NOT machine-translate a clinician-authored heading', () => {
    // A real German heading with no English counterpart stays German under the
    // English UI — we never invent a translation for authored content.
    const entry = makeEntry({ content: '**Kernsymptome:**\n- Punkt eins' })
    const sections = buildSectionsFromLegacyContent(entry)
    expect(sections[0].label).toBe('Kernsymptome')
    expect(sections[0].labelEn).toBeUndefined()
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

import type { KnowledgeEntry, KnowledgeEntrySection } from '../../data/knowledgeBaseSeedData'
import { isEnglishKbLanguage, pickKbLocalizedText } from '../../types/knowledgeBase'

const HEADING_RE = /^\*\*(.+?)\*\*\s*:?\s*$/

function normalizeHeadingLabel(raw: string): string {
  return raw.trim().replace(/:+$/, '').trim()
}

export interface ParsedMarkdownSection {
  label: string
  content: string
}

/** Split markdown body on `**Heading:**` lines into labelled sections. */
export function parseMarkdownSections(body: string): ParsedMarkdownSection[] {
  const trimmed = body.trim()
  if (!trimmed) return []

  const lines = trimmed.split('\n')
  const sections: ParsedMarkdownSection[] = []
  let currentLabel: string | null = null
  let currentLines: string[] = []

  const flush = () => {
    const content = currentLines.join('\n').trim()
    if (!content && currentLabel == null) return
    sections.push({
      label: currentLabel ?? '',
      content,
    })
    currentLines = []
  }

  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch) {
      flush()
      currentLabel = normalizeHeadingLabel(headingMatch[1])
      continue
    }
    currentLines.push(line)
  }
  flush()

  return sections.filter((s) => s.label || s.content)
}

function sectionId(entryId: string, order: number): string {
  return `${entryId}-section-${order}`
}

/** Build structured sections from legacy flat `content` / `contentEn` fields. */
export function buildSectionsFromLegacyContent(entry: KnowledgeEntry): KnowledgeEntrySection[] {
  const deParts = parseMarkdownSections(entry.content)
  const enParts = parseMarkdownSections(entry.contentEn ?? '')

  const count = Math.max(deParts.length, enParts.length, 1)
  const sections: KnowledgeEntrySection[] = []

  for (let i = 0; i < count; i += 1) {
    const de = deParts[i]
    const en = enParts[i]
    const deLabel = de?.label?.trim()
    const enLabel = en?.label?.trim()
    const labelDe = deLabel || (i === 0 ? 'Übersicht' : `Abschnitt ${i + 1}`)
    const labelEnFallback = i === 0 ? 'Overview' : `Section ${i + 1}`
    sections.push({
      id: sectionId(entry.id, i),
      label: labelDe,
      labelEn: enLabel || (entry.contentEn?.trim() ? labelEnFallback : undefined),
      content: de?.content ?? '',
      contentEn: en?.content || undefined,
      order: i,
    })
  }

  return sections
}

/** Ensure every entry carries a non-empty `sections` array (runtime migration). */
export function ensureKnowledgeEntrySections(entry: KnowledgeEntry): KnowledgeEntry {
  if (Array.isArray(entry.sections) && entry.sections.length > 0) {
    return entry
  }
  return {
    ...entry,
    sections: buildSectionsFromLegacyContent(entry),
  }
}

/** Flatten sections back into legacy `content` fields (search + export compat). */
export function flattenEntrySections(entry: KnowledgeEntry): Pick<KnowledgeEntry, 'content' | 'contentEn'> {
  const sections = [...(entry.sections ?? [])].sort((a, b) => a.order - b.order)
  const formatBlock = (label: string | undefined, body: string, useLabel: (l: string) => string) => {
    const trimmed = body.trim()
    if (!trimmed) return ''
    if (!label?.trim()) return trimmed
    return `**${useLabel(label)}:**\n${trimmed}`
  }

  const content = sections
    .map((s) => formatBlock(s.label, s.content, (l) => l))
    .filter(Boolean)
    .join('\n\n')

  const contentEn = sections
    .map((s) => formatBlock(s.labelEn ?? s.label, s.contentEn ?? s.content, (l) => l))
    .filter(Boolean)
    .join('\n\n')

  return { content, contentEn: contentEn || entry.contentEn }
}

export function localizedSectionLabel(section: KnowledgeEntrySection, language: string): string {
  return pickKbLocalizedText(section.label, section.labelEn, language) || section.label
}

export function localizedSectionContent(section: KnowledgeEntrySection, language: string): string {
  return pickKbLocalizedText(section.content, section.contentEn, language) || section.content
}

export function entrySectionNavLabel(section: KnowledgeEntrySection, language: string): string {
  const label = localizedSectionLabel(section, language).trim()
  return label || (language.startsWith('en') ? 'Section' : 'Abschnitt')
}

export function createEmptyKnowledgeEntrySection(
  entryId: string,
  order: number,
  language?: string | null,
): KnowledgeEntrySection {
  const id = `${entryId}-section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  if (isEnglishKbLanguage(language)) {
    return {
      id,
      label: '',
      labelEn: 'New section',
      content: '',
      order,
    }
  }
  return {
    id,
    label: 'Neuer Abschnitt',
    content: '',
    order,
  }
}

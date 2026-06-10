import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import { componentTranslations } from '../../data/componentTranslations'
import type { UiLanguage } from '../../types/settings'

export interface AnamneseSectionMatch {
  sectionId: string
  label: string
  content: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Common alternative headings that map to their canonical section IDs.
 * Covers spelling variants and shortened forms frequently found in pasted
 * psychiatric documentation.
 */
const HEADING_ALIASES: Record<string, string[]> = {
  'biografische-anamnese': ['Biographische Anamnese', 'Biografie'],
  suchtanamnese: ['Substanzanamnese', 'Suchtmittelanamnese'],
  'somatische-anamnese': ['Somatische Vorgeschichte', 'Somatische Anamnese und Befunde'],
  'suizid-und-selbstgefaehrdungsanamnese': ['Suizidalität', 'Suizidanamnese'],
}

function collectHeadingPatterns(sectionId: string): string[] {
  const patterns = new Set<string>()
  const defaultSection = defaultAufnahmeSections.find((section) => section.id === sectionId)
  if (defaultSection?.label.trim()) patterns.add(defaultSection.label.trim())

  const translated = componentTranslations.aufnahme?.sections?.[sectionId]?.label
  if (translated) {
    for (const label of Object.values(translated)) {
      if (label.trim()) patterns.add(label.trim())
    }
  }

  const aliases = HEADING_ALIASES[sectionId]
  if (aliases) {
    for (const alias of aliases) {
      if (alias.trim()) patterns.add(alias.trim())
    }
  }

  return [...patterns]
}

function buildHeadingRegex(label: string): RegExp {
  const escaped = escapeRegExp(label)
  // Match heading lines: optional leading whitespace, the label, an optional colon,
  // and optionally a short parenthetical or sub-label (≤ 50 chars) before line end.
  return new RegExp(`^\\s*${escaped}\\s*(?:\\([^)\\n]{0,50}\\))?\\s*:?\\s*$`, 'im')
}

/**
 * Rule-based v1: split free-text Anamnese by known section headings (de/en/fr/es).
 * Unmatched leading text is kept under the first matched section or a synthetic preamble block.
 */
export function parseAnamneseSections(
  text: string,
  _language: UiLanguage = 'de',
): Record<string, string> {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return {}

  const matches: Array<{ index: number; sectionId: string; label: string; length: number }> = []

  for (const section of defaultAufnahmeSections) {
    for (const label of collectHeadingPatterns(section.id)) {
      const regex = buildHeadingRegex(label)
      const match = normalized.match(regex)
      if (match?.index !== undefined) {
        matches.push({
          index: match.index,
          sectionId: section.id,
          label,
          length: match[0].length,
        })
        break
      }
    }
  }

  if (matches.length === 0) return {}

  matches.sort((a, b) => a.index - b.index)

  const result: Record<string, string> = {}
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i]
    const start = current.index + current.length
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length
    const content = normalized.slice(start, end).trim()
    if (!content) continue
    result[current.sectionId] = result[current.sectionId]
      ? `${result[current.sectionId]}\n\n${content}`
      : content
  }

  const preamble = normalized.slice(0, matches[0].index).trim()
  if (preamble) {
    const firstSectionId = matches[0].sectionId
    result[firstSectionId] = result[firstSectionId]
      ? `${preamble}\n\n${result[firstSectionId]}`
      : preamble
  }

  return result
}

export function mergeAnamneseSectionContents(
  structured: Record<string, string>,
  freeText: string,
  language: UiLanguage = 'de',
): Record<string, string> {
  const filledEntries = Object.entries(structured).filter(([, value]) => value?.trim())

  // If the workspace already has 2+ distinct sections with content, the user has
  // intentionally filled them — keep as-is.
  if (filledEntries.length >= 2) return structured

  // For 0 or 1 filled sections, attempt section-aware parsing of the raw text.
  // A single filled section most commonly means pasted multi-section text landed
  // in the active (first) section slot, so we try to sub-split it.
  const rawToparse =
    filledEntries.length === 1 ? (filledEntries[0][1] ?? freeText) : freeText
  const parsed = parseAnamneseSections(rawToparse || freeText, language)
  return Object.keys(parsed).length > 0 ? parsed : structured
}

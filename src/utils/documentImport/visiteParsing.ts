/**
 * Parse "Visite mit …" headings into canonical title + clinician subheading.
 *
 * Examples:
 *   "Visite mit Dr. Narayan"  → { sectionLabel: "Visite", subheading: "Dr. Narayan" }
 *   "Visite mit (Arzt)"       → { sectionLabel: "Visite", subheading: "Arzt" }
 *   "Visite mit Herrn Narayan:" → { sectionLabel: "Visite", subheading: "Herrn Narayan" }
 */

export interface VisiteHeadingMeta {
  sectionLabel: 'Visite'
  subheading: string
}

export interface VisiteEntryMeta extends VisiteHeadingMeta {
  /** Entry body with the leading "Visite mit …" line removed. */
  text: string
}

function foldUmlauts(value: string): string {
  return value
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
}

function formatVisiteSubheading(remainder: string): string {
  let value = remainder.trim().replace(/:$/, '').trim()
  const paren = /^\(([^)]+)\)$/.exec(value)
  if (paren) value = paren[1].trim()
  return value
}

/** Parse a heading or inline label like "Visite mit Dr. Narayan". */
export function parseVisiteMitHeading(raw: string): VisiteHeadingMeta | null {
  const trimmed = raw.trim().replace(/^#+\s*/, '').replace(/:\s*$/, '').trim()
  if (!trimmed) return null

  const folded = foldUmlauts(trimmed.toLowerCase())
  if (!/^visite\s+mit\s+(.+)$/.test(folded)) return null

  const original = /^visite\s+mit\s+(.+)$/i.exec(trimmed)
  const remainder = original?.[1]?.trim().replace(/:$/, '') ?? ''
  const subheading = formatVisiteSubheading(remainder)
  if (!subheading) return null

  return { sectionLabel: 'Visite', subheading }
}

/** When the first non-empty line is "Visite mit …", strip it and return entry meta. */
export function extractVisiteFromEntryText(text: string): VisiteEntryMeta | null {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  let firstContentIndex = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim()) {
      firstContentIndex = i
      break
    }
  }
  if (firstContentIndex < 0) return null

  const parsed = parseVisiteMitHeading(lines[firstContentIndex])
  if (!parsed) return null

  const restLines = [...lines.slice(0, firstContentIndex), ...lines.slice(firstContentIndex + 1)]
  return {
    sectionLabel: 'Visite',
    subheading: parsed.subheading,
    text: restLines.join('\n').trim(),
  }
}

/** Display label for review UI and feed headers. */
export function formatVisiteDisplayLabel(meta: { sectionLabel?: string; subheading?: string }): string | undefined {
  const label = meta.sectionLabel?.trim()
  const sub = meta.subheading?.trim()
  if (label && sub) return `${label} — ${sub}`
  return label || sub || undefined
}

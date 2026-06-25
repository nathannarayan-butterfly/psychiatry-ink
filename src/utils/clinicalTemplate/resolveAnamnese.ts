import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { htmlToPlainLines } from '../documentTemplate/htmlUtils'
import type { ResolvedAnamneseSection } from './clinicalData'

function plainText(html: string | undefined | null): string {
  if (!html) return ''
  try {
    return htmlToPlainLines(html).trim()
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/** All non-empty Aufnahme sections in canonical order, plus any extra snapshot keys. */
export function resolveAnamneseSections(caseId: string): ResolvedAnamneseSection[] {
  try {
    const contents = loadNotionDocumentSnapshot('aufnahme', caseId)?.sectionContents ?? {}
    const seen = new Set<string>()
    const result: ResolvedAnamneseSection[] = []

    for (const section of defaultAufnahmeSections) {
      const text = plainText(contents[section.id])
      if (!text) continue
      seen.add(section.id)
      result.push({ sectionId: section.id, label: section.label, text })
    }

    for (const [sectionId, raw] of Object.entries(contents)) {
      if (seen.has(sectionId)) continue
      const text = plainText(raw)
      if (!text) continue
      result.push({ sectionId, label: sectionId, text })
    }

    return result
  } catch {
    return []
  }
}

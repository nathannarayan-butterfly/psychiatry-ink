import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { loadVerlaufFeed } from '../verlaufFeed'
import { loadNotionPageDate } from '../notionPageDate'

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/**
 * Derive a one-line clinical thesis for the Übersicht hero from real documentation.
 * Prefers the latest psychopathology free-text, then the newest Verlauf entry.
 */
export function buildClinicalThesis(caseId: string): string | null {
  const psychopath = loadNotionDocumentSnapshot('psychopath', caseId)
  const free = psychopath?.sectionContents['free']?.trim()
  if (free && free.length > 20) {
    return clamp(free, 220)
  }

  const verlauf = loadVerlaufFeed(caseId)[0]
  if (verlauf?.content?.trim()) {
    return clamp(verlauf.content, 220)
  }

  const verlaufSnap = loadNotionDocumentSnapshot('verlauf', caseId)
  const risiko = verlaufSnap?.sectionContents['risiko']?.trim()
  if (risiko && risiko.length > 20) {
    return clamp(risiko, 220)
  }

  void loadNotionPageDate('verlauf', caseId)
  return null
}

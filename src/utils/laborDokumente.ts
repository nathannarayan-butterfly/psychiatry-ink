/**
 * Bridge between the Labor archive and the Dokumente (central clinical archive).
 *
 * Every lab befund is mirrored into the Dokumente archive as one `laborbefunde`
 * document ("Lab vom DD.MM.YYYY"). The mirroring is idempotent via the befund id
 * (`sourceRefId`), so it doubles as a one-time backfill for befunde that were
 * saved before this wiring existed.
 */

import { loadBefunde, type LaborBefund } from './laborArchive'
import { syncSourceDokumente } from './dokumenteArchive'

/** DD.MM.YYYY — matches the format used throughout the Labor UI. */
export function formatLaborDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mm}.${d.getFullYear()}`
  } catch {
    return iso.slice(0, 10)
  }
}

/** Build the document title from a befund and a `{date}` template (e.g. "Lab vom {date}"). */
export function buildLaborDokumentTitle(befund: LaborBefund, titleTemplate: string): string {
  const base = titleTemplate.replace('{date}', formatLaborDate(befund.date))
  return befund.label ? `${base} — ${befund.label}` : base
}

/** Build a readable plain-text rendering of a befund (category → param: value unit [ref] (!)). */
export function buildLaborDokumentContent(befund: LaborBefund): string {
  const body = befund.categories
    .map((cat) => {
      const rows = cat.values
        .map((v) => {
          const flag = v.isAbnormal ? ' (!)' : ''
          const ref = v.refText ? `  [${v.refText}]` : ''
          return `  ${v.name}: ${v.value} ${v.unit}${ref}${flag}`
        })
        .join('\n')
      return `${cat.label}:\n${rows}`
    })
    .join('\n\n')
  return body || befund.rawText || ''
}

/**
 * Mirror all lab befunde for a case into the Dokumente archive.
 * Idempotent — only befunde without an existing document are added.
 *
 * @param titleTemplate localized "Lab vom {date}" string
 * @returns number of new document entries created
 */
export function syncLaborDokumente(caseId: string, titleTemplate: string): number {
  const befunde = loadBefunde(caseId)
  if (befunde.length === 0) return 0
  return syncSourceDokumente(
    caseId,
    befunde.map((befund) => ({
      sourceRefId: befund.id,
      category: 'laborbefunde' as const,
      title: buildLaborDokumentTitle(befund, titleTemplate),
      content: buildLaborDokumentContent(befund),
      date: befund.date,
      source: 'manual' as const,
      pageType: 'labor',
    })),
  )
}

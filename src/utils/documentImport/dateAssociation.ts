/**
 * Date detection + association for clinical-course (Verlauf) text.
 *
 * Clinics frequently record the date of a Verlauf entry OUTSIDE the note
 * paragraph — in a separate left column of a table, or on the line directly
 * above the note. After DOCX→text extraction those layouts flatten to:
 *
 *   "12.03.2024\tPatient berichtet …"      (left column / adjacent cell)
 *   "12.03.2024  Medikation angepasst …"   (left column, space-separated)
 *   "12.03.2024"                            (leading date line)
 *   "Patient berichtet …"                   (… note text on the next line)
 *
 * This module parses common German date formats and splits a section body into
 * dated entries, recording HOW each date was associated so the review screen can
 * flag low-confidence associations for clinician clarification.
 *
 * Everything here is pure and deterministic — no network, no AI.
 */

export type DateAssociation = 'inline' | 'leading-line' | 'left-column' | 'none'

export interface DatedEntry {
  /** Note text for this entry (date stripped from the leading line). */
  text: string
  /** ISO `YYYY-MM-DD` when the date parsed cleanly. */
  iso?: string
  /** Verbatim date string as written (present even when not ISO-parseable). */
  raw?: string
  association: DateAssociation
  /** 0-based line offset of the entry start within the section body. */
  lineOffset: number
}

// DD.MM.YYYY / D.M.YYYY  ·  DD.MM.YY / D.M.YY  ·  YYYY-MM-DD
const DE_DATE_FULL = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/
const DE_DATE_SHORT = /\b(\d{1,2})\.(\d{1,2})\.(\d{2})\b/
const ISO_DATE = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Expand a 2-digit year: ≤68 → 20xx, else 19xx (clinical pivot). */
function expandYear(yy: number): number {
  return yy <= 68 ? 2000 + yy : 1900 + yy
}

/**
 * Parse a single German/ISO date string to ISO `YYYY-MM-DD`. Returns null when
 * the string is not a recognisable, valid calendar date.
 */
export function parseGermanDate(raw: string): string | null {
  const value = raw.trim()

  let m = ISO_DATE.exec(value)
  if (m) {
    const [, y, mo, d] = m
    const year = Number(y)
    const month = Number(mo)
    const day = Number(d)
    if (isValidYmd(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`
    return null
  }

  m = DE_DATE_FULL.exec(value)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = Number(m[3])
    if (isValidYmd(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`
    return null
  }

  m = DE_DATE_SHORT.exec(value)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = expandYear(Number(m[3]))
    if (isValidYmd(year, month, day)) return `${year}-${pad(month)}-${pad(day)}`
    return null
  }

  return null
}

/** A leading date at the very start of a line: returns the raw date + remainder. */
const LEADING_DATE_RE =
  /^\s*(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\s*(.*)$/

interface LeadingMatch {
  raw: string
  rest: string
  /** How the date relates to the note text on the same line. */
  association: DateAssociation
}

function matchLeadingDate(line: string): LeadingMatch | null {
  const m = LEADING_DATE_RE.exec(line)
  if (!m) return null
  const raw = m[1]
  // Determine the separator between the date and the rest of the original line.
  const afterDateIndex = line.indexOf(raw) + raw.length
  const separator = line.slice(afterDateIndex).match(/^(\s*)/)?.[1] ?? ''
  const rest = m[2].trim()

  if (!rest) return { raw, rest: '', association: 'leading-line' }
  // Tab or 2+ spaces ⇒ this was almost certainly a left date column / table cell.
  if (/\t/.test(separator) || separator.replace(/[^ ]/g, '').length >= 2) {
    return { raw, rest, association: 'left-column' }
  }
  return { raw, rest, association: 'inline' }
}

/** True when the entire (trimmed) line is just a date. */
export function isDateOnlyLine(line: string): boolean {
  const m = matchLeadingDate(line)
  return m !== null && m.rest === ''
}

/**
 * Split a section body into dated entries.
 *
 * Strategy:
 *  - A line beginning with a date starts a NEW entry; the date is associated with
 *    that entry (inline / left-column on the same line, or leading-line when the
 *    date is alone and the note follows on subsequent lines).
 *  - Lines without a leading date append to the current entry.
 *
 * If NO date markers are found anywhere, the whole body is returned as a single
 * entry with `association: 'none'` and no date (caller decides whether that is
 * expected or needs clarification).
 */
export function splitDatedEntries(body: string): DatedEntry[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const entries: DatedEntry[] = []
  let current: DatedEntry | null = null

  const pushCurrent = () => {
    if (!current) return
    current.text = current.text.replace(/\s+$/g, '').replace(/^\s+/g, '')
    if (current.text.length > 0 || current.raw) entries.push(current)
    current = null
  }

  lines.forEach((line, index) => {
    const leading = matchLeadingDate(line)
    if (leading) {
      pushCurrent()
      current = {
        text: leading.rest,
        raw: leading.raw,
        iso: parseGermanDate(leading.raw) ?? undefined,
        association: leading.association,
        lineOffset: index,
      }
      return
    }
    if (current) {
      current.text += (current.text ? '\n' : '') + line
    } else if (line.trim().length > 0) {
      current = { text: line, association: 'none', lineOffset: index }
    }
  })
  pushCurrent()

  return entries
}

/** True when a section body contains at least one parseable/leading date marker. */
export function bodyHasDates(body: string): boolean {
  return splitDatedEntries(body).some((e) => e.raw)
}

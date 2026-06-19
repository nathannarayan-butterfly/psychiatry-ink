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

export type DateAssociation =
  | 'inline'
  | 'leading-line'
  | 'left-column'
  | 'right-column'
  | 'following-line'
  | 'section-header'
  | 'none'

/**
 * Where a clinic typically records the date of a course entry. Drives a
 * per-user ParserProfile bias for date association (see `parserProfile.ts`).
 * `auto` keeps the deterministic multi-strategy default.
 */
export const DATE_LOCATION_HINTS = [
  'auto',
  'left-column',
  'right-column',
  'section-header',
  'inline',
  'following-line',
] as const

export type DateLocationHint = (typeof DATE_LOCATION_HINTS)[number]

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

/** Normalize spaced separators (DD MM YYYY) to dotted form before parsing. */
function normalizeGermanDateInput(raw: string): string {
  return raw.trim().replace(/(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b/g, '$1.$2.$3')
}

/**
 * Parse a single German/ISO date string to ISO `YYYY-MM-DD`. Returns null when
 * the string is not a recognisable, valid calendar date.
 */
export function parseGermanDate(raw: string): string | null {
  const value = normalizeGermanDateInput(raw)

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

import { formatClinicalDate } from '../clinicalDate'

/** Display ISO `YYYY-MM-DD` as German clinical `DD.MM.YYYY`. */
export function isoToGermanDate(iso: string | undefined): string {
  if (!iso) return ''
  return formatClinicalDate(iso) || iso
}

/** Parse clinician date input (`DD.MM.YYYY`, `DD MM YYYY`, or ISO) to ISO. */
export function parseGermanDateInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  return parseGermanDate(trimmed)
}

const DATE_TOKEN_RE = /\b(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\.\d{1,2}\.\d{2}|\d{4}-\d{1,2}-\d{1,2})\b/

/** Find the first German/ISO date token inside free text such as a section heading. */
export function findGermanDateInText(raw: string): { raw: string; iso?: string } | null {
  const m = DATE_TOKEN_RE.exec(raw)
  if (!m) return null
  return { raw: m[1], iso: parseGermanDate(m[1]) ?? undefined }
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
 * A date at the very END of a line: returns the note text + the trailing date.
 * Used for right-column layouts ("Patient stabil.\t12.03.2024") that flatten to
 * "<note><tab|2+ spaces><date>". A single space before the date is treated as
 * narrative (e.g. "Nächster Termin am 20.03.2024") and is NOT split out, to
 * avoid false positives in free text.
 */
const TRAILING_DATE_RE =
  /^(.*?\S)(\t+| {2,})(\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\s*$/

interface TrailingMatch {
  raw: string
  rest: string
  association: 'right-column'
}

function matchTrailingDate(line: string): TrailingMatch | null {
  const m = TRAILING_DATE_RE.exec(line)
  if (!m) return null
  const rest = m[1].trim()
  if (!rest) return null
  // Don't treat a leading-date line as a trailing-date line.
  if (matchLeadingDate(line)) return null
  return { raw: m[3], rest, association: 'right-column' }
}

export interface SplitOptions {
  /** Bias date detection toward a known layout; `auto` (default) tries all. */
  dateLocation?: DateLocationHint
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
export function splitDatedEntries(body: string, options: SplitOptions = {}): DatedEntry[] {
  const hint = options.dateLocation ?? 'auto'
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const entries: DatedEntry[] = []
  let current: DatedEntry | null = null

  const pushCurrent = () => {
    if (!current) return
    current.text = current.text.replace(/\s+$/g, '').replace(/^\s+/g, '')
    if (current.text.length > 0 || current.raw) entries.push(current)
    current = null
  }

  // Whether to attempt right-column (trailing-date) detection. Always on except
  // when the user explicitly says dates live in the left column / header, where
  // a trailing token is more likely to be narrative.
  const allowTrailing = hint !== 'left-column' && hint !== 'section-header'
  // Prefer trailing over leading only when the user says dates are right-column.
  const trailingFirst = hint === 'right-column'

  lines.forEach((line, index) => {
    const leading = matchLeadingDate(line)
    const trailing = allowTrailing ? matchTrailingDate(line) : null

    // Following-line layout: a date alone on a line dates the PRECEDING entry.
    if (
      hint === 'following-line' &&
      leading &&
      leading.rest === '' &&
      current &&
      !current.raw
    ) {
      current.raw = leading.raw
      current.iso = parseGermanDate(leading.raw) ?? undefined
      current.association = 'following-line'
      pushCurrent()
      return
    }

    const useTrailing = trailing && (trailingFirst || !leading)
    if (useTrailing && trailing) {
      // A note whose own date sits at the end of its (last) line.
      if (current && !current.raw) {
        current.text += (current.text ? '\n' : '') + trailing.rest
        current.raw = trailing.raw
        current.iso = parseGermanDate(trailing.raw) ?? undefined
        current.association = 'right-column'
        pushCurrent()
        return
      }
      pushCurrent()
      current = {
        text: trailing.rest,
        raw: trailing.raw,
        iso: parseGermanDate(trailing.raw) ?? undefined,
        association: 'right-column',
        lineOffset: index,
      }
      pushCurrent()
      return
    }

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

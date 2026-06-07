import type { NotionPageId } from '../components/notion/notionPages'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { todayIsoDateSite, yesterdayIsoDateSite } from './siteTimezone'

const KEY_PREFIX = 'psychiatry-ink:notion-page-date'

/** Pages with a manual clinical-context date (independent of sidebar calendar). */
export const PAGE_DATE_PAGE_IDS: NotionPageId[] = [
  'aufnahme',
  'verlauf',
  'psychopath',
  'therapie-verlauf',
  'medikation',
  'therapieplanung',
  'labor',
  'visualisation',
  'timeline',
]

export function notionPageDateKey(pageId: string, caseId?: string): string {
  return caseStorageKey(`${KEY_PREFIX}:${pageId}`, caseId)
}

function legacyPageDateKey(pageId: string): string {
  return `${KEY_PREFIX}:${pageId}`
}

export function loadNotionPageDate(pageId: string, caseId?: string): string {
  try {
    const scoped = localStorage.getItem(notionPageDateKey(pageId, caseId))
    if (scoped) return scoped
    if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      return localStorage.getItem(legacyPageDateKey(pageId)) ?? ''
    }
    return ''
  } catch {
    return ''
  }
}

export function saveNotionPageDate(pageId: string, date: string, caseId?: string): void {
  try {
    if (date.trim()) {
      localStorage.setItem(notionPageDateKey(pageId, caseId), date)
    } else {
      localStorage.removeItem(notionPageDateKey(pageId, caseId))
    }
  } catch {
    // ignore quota errors
  }
}

export function loadAllPageDates(caseId?: string): Record<string, string> {
  const dates: Record<string, string> = {}
  for (const pageId of PAGE_DATE_PAGE_IDS) {
    const value = loadNotionPageDate(pageId, caseId)
    if (value.trim()) dates[pageId] = value
  }
  return dates
}

export function applyPageDates(pageDates: Record<string, string>, caseId?: string): void {
  for (const pageId of PAGE_DATE_PAGE_IDS) {
    saveNotionPageDate(pageId, pageDates[pageId] ?? '', caseId)
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  )
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Today's calendar date in site timezone (YYYY-MM-DD). */
export function todayIsoDateLocal(): string {
  return todayIsoDateSite()
}

/** Yesterday's calendar date in site timezone (YYYY-MM-DD). */
export function yesterdayIsoDateLocal(): string {
  return yesterdayIsoDateSite()
}

/** Display format for collapsed row and manual text entry (DD.MM.YYYY). */
export function formatNotionPageDateInput(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return iso
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidCalendarDate(year, month, day)) return iso
  return `${pad2(day)}.${pad2(month)}.${year}`
}

/** Locale-aware display for the collapsed row when a date is set. */
export function formatNotionPageDateDisplay(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return iso
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidCalendarDate(year, month, day)) return iso
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Parse DD.MM.YYYY, DD.MM.YY, or ISO YYYY-MM-DD. Returns '' to clear, null if invalid. */
export function parseNotionPageDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    if (!isValidCalendarDate(year, month, day)) return null
    return toIsoDate(year, month, day)
  }

  const dotMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(trimmed)
  if (dotMatch) {
    const day = Number(dotMatch[1])
    const month = Number(dotMatch[2])
    let year = Number(dotMatch[3])
    if (dotMatch[3].length === 2) {
      year = year >= 70 ? 1900 + year : 2000 + year
    }
    if (!isValidCalendarDate(year, month, day)) return null
    return toIsoDate(year, month, day)
  }

  return null
}

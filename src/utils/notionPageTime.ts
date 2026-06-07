import type { NotionPageId } from '../components/notion/notionPages'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { nowSiteTime } from './siteTimezone'

const KEY_PREFIX = 'psychiatry-ink:notion-page-time'

/** Pages with a manual clinical-context time (alongside page date). */
export const PAGE_TIME_PAGE_IDS: NotionPageId[] = [
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

export function notionPageTimeKey(pageId: string, caseId?: string): string {
  return caseStorageKey(`${KEY_PREFIX}:${pageId}`, caseId)
}

function legacyPageTimeKey(pageId: string): string {
  return `${KEY_PREFIX}:${pageId}`
}

export function loadNotionPageTime(pageId: string, caseId?: string): string {
  try {
    const scoped = localStorage.getItem(notionPageTimeKey(pageId, caseId))
    if (scoped) return scoped
    if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      return localStorage.getItem(legacyPageTimeKey(pageId)) ?? ''
    }
    return ''
  } catch {
    return ''
  }
}

export function saveNotionPageTime(pageId: string, time: string, caseId?: string): void {
  try {
    if (time.trim()) {
      localStorage.setItem(notionPageTimeKey(pageId, caseId), time)
    } else {
      localStorage.removeItem(notionPageTimeKey(pageId, caseId))
    }
  } catch {
    // ignore quota errors
  }
}

export function loadAllPageTimes(caseId?: string): Record<string, string> {
  const times: Record<string, string> = {}
  for (const pageId of PAGE_TIME_PAGE_IDS) {
    const value = loadNotionPageTime(pageId, caseId)
    if (value.trim()) times[pageId] = value
  }
  return times
}

export function applyPageTimes(pageTimes: Record<string, string>, caseId?: string): void {
  for (const pageId of PAGE_TIME_PAGE_IDS) {
    saveNotionPageTime(pageId, pageTimes[pageId] ?? '', caseId)
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidTime(hours: number, minutes: number): boolean {
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

function toTimeString(hours: number, minutes: number): string {
  return `${pad2(hours)}:${pad2(minutes)}`
}

/** Current site time as HH:MM (24h). */
export function nowLocalTime(): string {
  return nowSiteTime()
}

/** Display format for collapsed row and manual text entry (HH:MM). */
export function formatNotionPageTimeInput(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim())
  if (!match) return time
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!isValidTime(hours, minutes)) return time
  return toTimeString(hours, minutes)
}

/** Locale-aware display for the collapsed row when a time is set. */
export function formatNotionPageTimeDisplay(time: string, locale: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim())
  if (!match) return time
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!isValidTime(hours, minutes)) return time
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Parse HH:MM or H:MM. Returns '' to clear, null if invalid. */
export function parseNotionPageTimeInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (match) {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!isValidTime(hours, minutes)) return null
    return toTimeString(hours, minutes)
  }

  return null
}

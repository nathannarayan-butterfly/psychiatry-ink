import type { SavedTimeline, TimelineEntry, TimelineLayout, TimelineSnapshot } from '../types/timeline'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { scheduleTimelineImprints } from './clinicalImprint'
import { buildTimelinePrintHtml } from './timelinePrint'
import { exportTimelinePdf as writeTimelinePdf, importPortablePdf } from './portablePdf'

const SESSION_KEY = 'psychiatry-ink-timeline-session'
const TIMELINES_KEY = 'psychiatry-ink:timelines'
const ACTIVE_TIMELINE_KEY = 'psychiatry-ink:active-timeline-id'

function timelineSessionKey(caseId?: string): string {
  return caseStorageKey(SESSION_KEY, caseId)
}

function timelinesListKey(caseId?: string): string {
  return caseStorageKey(TIMELINES_KEY, caseId)
}

function activeTimelineKey(caseId?: string): string {
  return caseStorageKey(ACTIVE_TIMELINE_KEY, caseId)
}

const VALID_LAYOUTS: TimelineLayout[] = ['horizontal', 'snake', 'list']

export type { TimelineSnapshot }

function normalizeLayout(layout: unknown): TimelineLayout {
  if (typeof layout === 'string' && VALID_LAYOUTS.includes(layout as TimelineLayout)) {
    return layout as TimelineLayout
  }
  return 'horizontal'
}

function normalizeTimelineEntry(entry: TimelineEntry): TimelineEntry {
  return {
    id: entry.id,
    heading: entry.heading ?? '',
    subheading: entry.subheading ?? '',
    priority: entry.priority ?? 'medium',
    dateKind: entry.dateKind ?? 'ddmmyy',
    dateValue: entry.dateValue ?? '',
    sortKey: entry.sortKey ?? 0,
    displayDate: entry.displayDate ?? '',
    visible: entry.visible !== false,
  }
}

function normalizeSavedTimeline(raw: Partial<SavedTimeline>, fallbackTitle: string): SavedTimeline | null {
  if (!raw.id || typeof raw.id !== 'string') return null
  if (!Array.isArray(raw.entries)) return null
  return {
    id: raw.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallbackTitle,
    layout: normalizeLayout(raw.layout),
    entries: raw.entries.map((entry) => normalizeTimelineEntry(entry as TimelineEntry)),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

function migrateLegacySession(caseId?: string): SavedTimeline[] {
  try {
    let raw = sessionStorage.getItem(timelineSessionKey(caseId))
    if (!raw && (caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      raw = sessionStorage.getItem(SESSION_KEY)
    }
    if (!raw) return []
    const parsed = JSON.parse(raw) as TimelineSnapshot
    if (!Array.isArray(parsed.entries)) return []
    const migrated: SavedTimeline = {
      id: crypto.randomUUID(),
      title: 'Timeline 1',
      layout: normalizeLayout(parsed.layout),
      entries: parsed.entries,
      updatedAt: new Date().toISOString(),
    }
    saveTimelinesList([migrated], caseId)
    setActiveTimelineId(migrated.id, caseId)
    try {
      sessionStorage.removeItem(timelineSessionKey(caseId))
      if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
        sessionStorage.removeItem(SESSION_KEY)
      }
    } catch {
      // ignore
    }
    return [migrated]
  } catch {
    return []
  }
}

export function loadTimelinesList(caseId?: string): SavedTimeline[] {
  try {
    const raw = localStorage.getItem(timelinesListKey(caseId))
    if (!raw) return migrateLegacySession(caseId)
    const parsed = JSON.parse(raw) as Partial<SavedTimeline>[]
    if (!Array.isArray(parsed)) return migrateLegacySession(caseId)
    const timelines = parsed
      .map((item, index) => normalizeSavedTimeline(item, `Timeline ${index + 1}`))
      .filter((item): item is SavedTimeline => item !== null)
    return timelines.length > 0 ? timelines : migrateLegacySession(caseId)
  } catch {
    return migrateLegacySession(caseId)
  }
}

export function saveTimelinesList(timelines: SavedTimeline[], caseId?: string): void {
  localStorage.setItem(timelinesListKey(caseId), JSON.stringify(timelines))
  scheduleTimelineImprints(caseId ?? getActiveCaseId(), timelines)
}

export function getActiveTimelineId(caseId?: string): string | null {
  try {
    return sessionStorage.getItem(activeTimelineKey(caseId))
  } catch {
    return null
  }
}

export function setActiveTimelineId(timelineId: string | null, caseId?: string): void {
  try {
    if (timelineId) {
      sessionStorage.setItem(activeTimelineKey(caseId), timelineId)
    } else {
      sessionStorage.removeItem(activeTimelineKey(caseId))
    }
  } catch {
    // ignore
  }
}

export function countTimelines(caseId?: string): number {
  return loadTimelinesList(caseId).length
}

export function loadTimelineSession(caseId?: string): TimelineSnapshot | null {
  const timelines = loadTimelinesList(caseId)
  const activeId = getActiveTimelineId(caseId)
  const active = activeId ? timelines.find((item) => item.id === activeId) : timelines[0]
  if (!active) return null
  return { layout: active.layout, entries: active.entries }
}

export function saveTimelineSession(snapshot: TimelineSnapshot, caseId?: string): void {
  const timelines = loadTimelinesList(caseId)
  const activeId = getActiveTimelineId(caseId) ?? timelines[0]?.id
  if (!activeId) {
    const created: SavedTimeline = {
      id: crypto.randomUUID(),
      title: 'Timeline 1',
      layout: snapshot.layout,
      entries: snapshot.entries,
      updatedAt: new Date().toISOString(),
    }
    saveTimelinesList([created], caseId)
    setActiveTimelineId(created.id, caseId)
    return
  }

  const next = timelines.map((item) =>
    item.id === activeId
      ? {
          ...item,
          layout: snapshot.layout,
          entries: snapshot.entries,
          updatedAt: new Date().toISOString(),
        }
      : item,
  )
  if (!next.some((item) => item.id === activeId)) {
    next.push({
      id: activeId,
      title: `Timeline ${next.length + 1}`,
      layout: snapshot.layout,
      entries: snapshot.entries,
      updatedAt: new Date().toISOString(),
    })
  }
  saveTimelinesList(next, caseId)
  setActiveTimelineId(activeId, caseId)
}

export function exportTimelinePdf(snapshot: TimelineSnapshot, title: string): Promise<void> {
  return writeTimelinePdf(snapshot, title)
}

export { importPortablePdf }

export function printTimeline(snapshot: TimelineSnapshot, title: string): void {
  const html = buildTimelinePrintHtml(snapshot, title)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export function visibleSortedTimelineEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.filter((entry) => entry.visible).sort((a, b) => a.sortKey - b.sortKey)
}

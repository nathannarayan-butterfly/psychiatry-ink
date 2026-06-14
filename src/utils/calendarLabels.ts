import type { CalendarItemType, CalendarItemStatus, CalendarPriority } from '../types/calendar'

export const CALENDAR_TYPE_LABELS: Record<CalendarItemType, string> = {
  consultation: 'Konsultation',
  follow_up: 'Folgetermin',
  lab_test: 'Laboruntersuchung',
  phone_call: 'Telefonat',
  video_call: 'Videosprechstunde',
  medication_review: 'Medikationsreview',
  document_task: 'Dokumentenaufgabe',
  external_consultation: 'Externes Konsil',
  other: 'Sonstiges',
}

export const CALENDAR_STATUS_LABELS: Record<CalendarItemStatus, string> = {
  scheduled: 'Geplant',
  in_progress: 'Laufend',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  no_show: 'Nicht erschienen',
}

export const CALENDAR_PRIORITY_LABELS: Record<CalendarPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
}

export const CALENDAR_VIEW_LABELS = {
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
  list: 'Liste',
} as const

export function formatCalendarTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function formatCalendarDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function startOfDayIso(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function endOfDayIso(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function statusDotClass(status: CalendarItemStatus): string {
  switch (status) {
    case 'scheduled':
      return 'calendar-status-dot--scheduled'
    case 'in_progress':
      return 'calendar-status-dot--active'
    case 'completed':
      return 'calendar-status-dot--completed'
    case 'cancelled':
    case 'no_show':
      return 'calendar-status-dot--muted'
    default:
      return 'calendar-status-dot--scheduled'
  }
}

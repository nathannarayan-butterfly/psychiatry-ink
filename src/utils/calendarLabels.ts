import type { CalendarItemType, CalendarItemStatus, CalendarPriority } from '../types/calendar'
import type { UiTranslationKey } from '../data/uiTranslations'

export const CALENDAR_TYPE_LABEL_KEYS: Record<CalendarItemType, UiTranslationKey> = {
  consultation: 'calTypeConsultation',
  follow_up: 'calTypeFollowUp',
  lab_test: 'calTypeLabTest',
  phone_call: 'calTypePhoneCall',
  video_call: 'calTypeVideoCall',
  medication_review: 'calTypeMedicationReview',
  document_task: 'calTypeDocumentTask',
  external_consultation: 'calTypeExternalConsultation',
  other: 'calTypeOther',
}

export const CALENDAR_STATUS_LABEL_KEYS: Record<CalendarItemStatus, UiTranslationKey> = {
  scheduled: 'calStatusScheduled',
  in_progress: 'calStatusInProgress',
  completed: 'calStatusCompleted',
  cancelled: 'calStatusCancelled',
  no_show: 'calStatusNoShow',
}

export const CALENDAR_PRIORITY_LABEL_KEYS: Record<CalendarPriority, UiTranslationKey> = {
  low: 'calPriorityLow',
  normal: 'calPriorityNormal',
  high: 'calPriorityHigh',
}

/** @deprecated DE-only — use CALENDAR_TYPE_LABEL_KEYS + translateUi for localized labels. */
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

export function localeForUiLanguage(language: string): string {
  switch (language) {
    case 'en':
      return 'en-GB'
    case 'fr':
      return 'fr-FR'
    case 'es':
      return 'es-ES'
    default:
      return 'de-DE'
  }
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Six-row grid (42 cells) covering the month that contains `monthAnchor`. */
export function getMonthGridCells(monthAnchor: Date): Date[] {
  const first = getMonthStart(monthAnchor)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function formatMonthYear(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function formatDayHeader(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function getWeekdayLabels(locale: string): string[] {
  const monday = startOfWeek(new Date(2024, 0, 8))
  return Array.from({ length: 7 }, (_, i) =>
    addDays(monday, i).toLocaleDateString(locale, { weekday: 'narrow' }),
  )
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function countActiveAppointments(items: { status: string }[]): number {
  return items.filter((item) => item.status !== 'cancelled' && item.status !== 'no_show').length
}

/**
 * Maps an appointment type to a CSS class that exposes a per-category
 * `--cal-type-color` token (defined in calendar.css). Used to drive subtle
 * colour accents (left borders, soft tints, category badges) without changing
 * any calendar logic.
 */
export function typeAccentClass(type: CalendarItemType): string {
  return `calendar-type--${type}`
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

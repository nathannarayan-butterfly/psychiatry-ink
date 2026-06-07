export const SITE_TIMEZONE = 'Europe/Berlin'

export interface SiteZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((p) => p.type === type)?.value ?? 0)
}

/** Calendar and clock parts for an instant in the site timezone. */
export function getSiteZonedParts(date: Date): SiteZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)

  return {
    year: partValue(parts, 'year'),
    month: partValue(parts, 'month'),
    day: partValue(parts, 'day'),
    hour: partValue(parts, 'hour'),
    minute: partValue(parts, 'minute'),
  }
}

export function siteDateTimeFormatOptions(
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormatOptions {
  return { ...options, timeZone: SITE_TIMEZONE }
}

export function formatInSiteTimezone(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, siteDateTimeFormatOptions(options)).format(date)
}

/** ISO 8601 calendar week (Kalenderwoche) in site timezone. */
export function getISOWeekInSiteTimezone(date: Date): number {
  const { year, month, day } = getSiteZonedParts(date)
  const utc = new Date(Date.UTC(year, month - 1, day))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Today's calendar date in site timezone (YYYY-MM-DD). */
export function todayIsoDateSite(date = new Date()): string {
  const { year, month, day } = getSiteZonedParts(date)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Yesterday's calendar date in site timezone (YYYY-MM-DD). */
export function yesterdayIsoDateSite(date = new Date()): string {
  const { year, month, day } = getSiteZonedParts(date)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() - 1)
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`
}

/** Current time in site timezone as HH:MM (24h). */
export function nowSiteTime(date = new Date()): string {
  const { hour, minute } = getSiteZonedParts(date)
  return `${pad2(hour)}:${pad2(minute)}`
}

/** Format ISO timestamp as DD.MM.YYYY in site timezone. */
export function formatIsoTimestampDate(iso: string): string {
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    const { year, month, day } = getSiteZonedParts(date)
    return `${pad2(day)}.${pad2(month)}.${year}`
  } catch {
    return iso
  }
}

/** Format ISO timestamp as HH:MM in site timezone. */
export function formatIsoTimestampTime(iso: string): string {
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const { hour, minute } = getSiteZonedParts(date)
    return `${pad2(hour)}:${pad2(minute)}`
  } catch {
    return ''
  }
}

/** Notification relative/absolute time in site timezone. */
export function formatNotificationTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return '<1 min'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  return nowSiteTime(new Date(timestamp))
}

/** Locale-aware date display for ISO timestamps in site timezone. */
export function formatSiteLocaleDate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return formatInSiteTimezone(date, locale, options)
  } catch {
    return iso
  }
}

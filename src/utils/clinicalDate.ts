import { getSiteZonedParts } from './siteTimezone'

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatParts(day: number, month: number, year: number): string {
  return `${pad2(day)}.${pad2(month)}.${year}`
}

function formatShortParts(day: number, month: number): string {
  return `${pad2(day)}.${pad2(month)}.`
}

/** Parse `YYYY-MM-DD` without timezone shift. */
export function parseIsoDateOnly(iso: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_ONLY.exec(iso.trim())
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

/** Calendar parts from a `Date` in the site timezone (for timestamps). */
function partsFromDate(date: Date): { year: number; month: number; day: number } {
  return getSiteZonedParts(date)
}

/**
 * Clinical display format: `DD.MM.YYYY`.
 * Accepts ISO date (`YYYY-MM-DD`), ISO timestamp, or `Date`.
 */
export function formatClinicalDate(value: string | Date | undefined | null): string {
  if (value == null || value === '') return ''

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const { year, month, day } = partsFromDate(value)
    return formatParts(day, month, year)
  }

  const trimmed = value.trim()
  const dateOnly = parseIsoDateOnly(trimmed)
  if (dateOnly) {
    return formatParts(dateOnly.day, dateOnly.month, dateOnly.year)
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return trimmed
  const { year, month, day } = partsFromDate(date)
  return formatParts(day, month, year)
}

/** Compact clinical date: `DD.MM.` */
export function formatClinicalDateShort(value: string | undefined | null): string {
  if (!value) return ''
  const dateOnly = parseIsoDateOnly(value.trim())
  if (dateOnly) {
    return formatShortParts(dateOnly.day, dateOnly.month)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(5, 10).replace('-', '.') + '.'
  const { month, day } = partsFromDate(date)
  return formatShortParts(day, month)
}

/** Month-year clinical display: `MM.YYYY`. */
export function formatClinicalMonthYear(month: number, year: number): string {
  return `${pad2(month)}.${year}`
}

/** `Date` in local calendar parts — for UI that already uses local midnight dates. */
export function formatClinicalDateLocal(date: Date): string {
  return formatParts(date.getDate(), date.getMonth() + 1, date.getFullYear())
}

/** Whole years between an ISO date-of-birth and a reference calendar day (site timezone). */
export function calculateAgeFromIsoDate(
  iso: string | undefined | null,
  referenceDate: Date = new Date(),
): number | null {
  const dob = parseIsoDateOnly(iso?.trim() ?? '')
  if (!dob) return null
  const ref = partsFromDate(referenceDate)
  let age = ref.year - dob.year
  if (ref.month < dob.month || (ref.month === dob.month && ref.day < dob.day)) {
    age -= 1
  }
  return age >= 0 ? age : null
}

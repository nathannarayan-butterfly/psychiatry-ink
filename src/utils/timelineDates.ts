import type { TimelineDateKind } from '../types/timeline'

export interface ParsedTimelineDate {
  sortKey: number
  displayDate: string
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function toSortKey(year: number, month = 6, day = 15): number {
  return year * 10000 + month * 100 + day
}

function normalizeDigits(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function parseTimelineDate(kind: TimelineDateKind, raw: string): ParsedTimelineDate | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (kind === 'age') {
    const age = Number.parseInt(trimmed.replace(/\D/g, ''), 10)
    if (!Number.isFinite(age) || age < 0 || age > 150) return null
    return {
      sortKey: age,
      displayDate: `Age ${age}`,
    }
  }

  const digits = normalizeDigits(trimmed)
  if (!digits) return null

  if (kind === 'yy') {
    let year = Number.parseInt(digits, 10)
    if (digits.length <= 2) {
      year = year >= 70 ? 1900 + year : 2000 + year
    }
    if (year < 1900 || year > 2100) return null
    return {
      sortKey: toSortKey(year),
      displayDate: String(year),
    }
  }

  if (kind === 'mmyy') {
    if (digits.length < 4) return null
    const month = Number.parseInt(digits.slice(0, 2), 10)
    let year = Number.parseInt(digits.slice(2), 10)
    if (digits.slice(2).length <= 2) {
      year = year >= 70 ? 1900 + year : 2000 + year
    }
    if (month < 1 || month > 12 || year < 1900 || year > 2100) return null
    return {
      sortKey: toSortKey(year, month, 15),
      displayDate: `${pad2(month)}/${year}`,
    }
  }

  // ddmmyy
  if (digits.length < 6) return null
  const day = Number.parseInt(digits.slice(0, 2), 10)
  const month = Number.parseInt(digits.slice(2, 4), 10)
  let year = Number.parseInt(digits.slice(4), 10)
  if (digits.slice(4).length <= 2) {
    year = year >= 70 ? 1900 + year : 2000 + year
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return null
  }
  return {
    sortKey: toSortKey(year, month, day),
    displayDate: `${pad2(day)}.${pad2(month)}.${String(year).slice(-2)}`,
  }
}

export function timelineDatePlaceholder(kind: TimelineDateKind): string {
  switch (kind) {
    case 'ddmmyy':
      return 'DDMMYY'
    case 'mmyy':
      return 'MMYY'
    case 'yy':
      return 'YY'
    case 'age':
      return 'Age'
  }
}

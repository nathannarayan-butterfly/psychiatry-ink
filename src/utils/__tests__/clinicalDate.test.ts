import { describe, expect, it } from 'vitest'
import {
  formatClinicalDate,
  formatClinicalDateShort,
  formatClinicalMonthYear,
  formatClinicalDateLocal,
  parseIsoDateOnly,
} from '../clinicalDate'

describe('formatClinicalDate', () => {
  it('formats ISO date-only as DD.MM.YYYY', () => {
    expect(formatClinicalDate('2024-03-12')).toBe('12.03.2024')
  })

  it('formats Date as DD.MM.YYYY', () => {
    expect(formatClinicalDate(new Date(2026, 5, 14))).toBe('14.06.2026')
  })

  it('returns empty for null/undefined', () => {
    expect(formatClinicalDate(null)).toBe('')
    expect(formatClinicalDate(undefined)).toBe('')
  })
})

describe('formatClinicalDateShort', () => {
  it('formats ISO as DD.MM.', () => {
    expect(formatClinicalDateShort('2024-03-12')).toBe('12.03.')
  })
})

describe('formatClinicalMonthYear', () => {
  it('formats as MM.YYYY', () => {
    expect(formatClinicalMonthYear(6, 2026)).toBe('06.2026')
  })
})

describe('parseIsoDateOnly', () => {
  it('parses YYYY-MM-DD', () => {
    expect(parseIsoDateOnly('2024-03-12')).toEqual({ year: 2024, month: 3, day: 12 })
  })

  it('returns null for invalid input', () => {
    expect(parseIsoDateOnly('03/12/2024')).toBeNull()
  })
})

describe('formatClinicalDateLocal', () => {
  it('uses local calendar parts', () => {
    expect(formatClinicalDateLocal(new Date(2026, 5, 14))).toBe('14.06.2026')
  })
})

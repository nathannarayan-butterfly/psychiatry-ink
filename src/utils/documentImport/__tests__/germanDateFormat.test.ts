import { describe, expect, it } from 'vitest'
import {
  isoToGermanDate,
  parseGermanDate,
  parseGermanDateInput,
  parseGermanDateInputDraft,
} from '../dateAssociation'

describe('isoToGermanDate / parseGermanDateInput', () => {
  it('formats ISO as DD.MM.YYYY', () => {
    expect(isoToGermanDate('2024-03-12')).toBe('12.03.2024')
  })

  it('parses spaced DD MM YYYY input', () => {
    expect(parseGermanDate('12 03 2024')).toBe('2024-03-12')
    expect(parseGermanDateInput('12 03 2024')).toBe('2024-03-12')
  })
})

describe('parseGermanDateInputDraft', () => {
  it('parses a complete 4-digit year while typing', () => {
    expect(parseGermanDateInputDraft('01.01.1995')).toBe('1995-01-01')
  })

  it('does not expand a partial 2-digit year while typing', () => {
    expect(parseGermanDateInputDraft('01.01.19')).toBeNull()
  })

  it('does not expand a partial 3-digit year while typing', () => {
    expect(parseGermanDateInputDraft('01.01.199')).toBeNull()
  })

  it('still allows 2-digit year expansion on full parse (blur)', () => {
    expect(parseGermanDateInput('01.01.95')).toBe('1995-01-01')
    expect(parseGermanDateInput('01.01.19')).toBe('2019-01-01')
  })
})

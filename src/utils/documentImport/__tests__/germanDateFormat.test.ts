import { describe, expect, it } from 'vitest'
import { isoToGermanDate, parseGermanDate, parseGermanDateInput } from '../dateAssociation'

describe('isoToGermanDate / parseGermanDateInput', () => {
  it('formats ISO as DD.MM.YYYY', () => {
    expect(isoToGermanDate('2024-03-12')).toBe('12.03.2024')
  })

  it('parses spaced DD MM YYYY input', () => {
    expect(parseGermanDate('12 03 2024')).toBe('2024-03-12')
    expect(parseGermanDateInput('12 03 2024')).toBe('2024-03-12')
  })
})

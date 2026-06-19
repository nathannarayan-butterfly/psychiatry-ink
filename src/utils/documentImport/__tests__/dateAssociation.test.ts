import { describe, expect, it } from 'vitest'
import { parseGermanDate, splitDatedEntries } from '../dateAssociation'

describe('parseGermanDate', () => {
  it('parses DD.MM.YYYY', () => {
    expect(parseGermanDate('12.03.2024')).toBe('2024-03-12')
  })

  it('parses short D.M.YY years with a clinical pivot', () => {
    expect(parseGermanDate('1.2.03')).toBe('2003-02-01')
    expect(parseGermanDate('3.4.78')).toBe('1978-04-03')
  })

  it('parses ISO dates', () => {
    expect(parseGermanDate('2024-03-05')).toBe('2024-03-05')
  })

  it('rejects impossible calendar dates', () => {
    expect(parseGermanDate('31.02.2024')).toBeNull()
    expect(parseGermanDate('foo')).toBeNull()
  })
})

describe('splitDatedEntries', () => {
  it('associates a leading-line date with the following note text', () => {
    const body = '12.03.2024\nPatient berichtet bessere Stimmung.\n14.03.2024\nMedikation angepasst.'
    const entries = splitDatedEntries(body)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ iso: '2024-03-12', association: 'leading-line' })
    expect(entries[0].text).toContain('bessere Stimmung')
    expect(entries[1]).toMatchObject({ iso: '2024-03-14', association: 'leading-line' })
  })

  it('associates a left-column date (tab or 2+ spaces) with the same-line note', () => {
    const tab = splitDatedEntries('12.03.2024\tPatient stabil.')
    expect(tab[0]).toMatchObject({ iso: '2024-03-12', association: 'left-column', text: 'Patient stabil.' })

    const spaces = splitDatedEntries('12.03.2024   Patient stabil.')
    expect(spaces[0].association).toBe('left-column')
  })

  it('treats a single space as an inline date', () => {
    const entries = splitDatedEntries('12.03.2024 Patient ruhig.')
    expect(entries[0]).toMatchObject({ iso: '2024-03-12', association: 'inline' })
  })

  it('returns a single dateless entry when no date markers are present', () => {
    const entries = splitDatedEntries('Patient ohne Datum, klinisch stabil.')
    expect(entries).toHaveLength(1)
    expect(entries[0].association).toBe('none')
    expect(entries[0].raw).toBeUndefined()
    expect(entries[0].iso).toBeUndefined()
  })

  it('keeps the raw date but no iso when the date is not a valid calendar date', () => {
    const entries = splitDatedEntries('31.13.2024 Eintrag mit defektem Datum.')
    expect(entries[0].raw).toBe('31.13.2024')
    expect(entries[0].iso).toBeUndefined()
  })
})

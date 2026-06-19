import { describe, expect, it } from 'vitest'
import { mapSectionToCandidates, sectionizeClinicalText } from '../sectionize'
import { autoDetectMapping, tabularToCandidates } from '../tabular'

function verlaufCandidates(text: string) {
  return sectionizeClinicalText(text)
    .flatMap((section) => mapSectionToCandidates(section))
    .filter((c) => c.module === 'verlauf')
}

describe('sectionize verlauf — left-column / leading-line date association', () => {
  it('associates dates from separate lines and flags dateless entries', () => {
    const text = [
      'Verlauf',
      'Erstkontakt ohne Datum vermerkt.',
      '12.03.2024',
      'Patient berichtet bessere Stimmung.',
      '14.03.2024\tMedikation angepasst.',
    ].join('\n')

    const candidates = verlaufCandidates(text)
    expect(candidates.length).toBeGreaterThanOrEqual(3)

    const dated = candidates.filter((c) => c.module === 'verlauf' && c.data.date)
    expect(dated.some((c) => c.module === 'verlauf' && c.data.date === '2024-03-12')).toBe(true)
    expect(dated.some((c) => c.module === 'verlauf' && c.data.date === '2024-03-14')).toBe(true)

    const dateless = candidates.find((c) => !c.data.date)
    expect(dateless?.clarifications?.some((cl) => cl.code === 'date_uncertain')).toBe(true)
  })

  it('keeps a single undated candidate (no false flag) when the section has no dates', () => {
    const candidates = verlaufCandidates('Verlauf\nPatient durchgehend stabil, keine Auffälligkeiten.')
    expect(candidates).toHaveLength(1)
    expect(candidates[0].clarifications).toBeUndefined()
  })
})

describe('tabular verlauf — date column association', () => {
  it('maps a date column to each note row and flags rows without a date', () => {
    const headers = ['Datum', 'Verlauf']
    const mapping = autoDetectMapping(headers)
    expect(mapping.module).toBe('verlauf')

    const { candidates } = tabularToCandidates(
      { headers, rows: [['12.03.2024', 'Patient stabil'], ['', 'Kein Datum hier']] },
      mapping,
    )
    expect(candidates).toHaveLength(2)
    expect(candidates[0].module).toBe('verlauf')
    if (candidates[0].module === 'verlauf') expect(candidates[0].data.date).toBe('2024-03-12')
    expect(candidates[0].clarifications).toBeUndefined()
    expect(candidates[1].clarifications?.some((c) => c.code === 'date_uncertain')).toBe(true)
  })
})

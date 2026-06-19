import { describe, expect, it } from 'vitest'
import { mapSectionToCandidates, sectionizeClinicalText } from '../sectionize'
import { autoDetectMapping, tabularToCandidates } from '../tabular'

function verlaufCandidates(text: string) {
  return sectionizeClinicalText(text)
    .flatMap((section) => mapSectionToCandidates(section))
    .filter((c) => c.module === 'verlauf')
}

function complementaryTherapyCandidates(text: string) {
  return sectionizeClinicalText(text)
    .flatMap((section) => mapSectionToCandidates(section))
    .filter((c) => c.module === 'complementaryTherapy')
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

  it('recognizes Verlauf Documentation heading and splits left-column date rows', () => {
    const candidates = verlaufCandidates([
      'Verlauf Documentation',
      '12.03.2024  Patient berichtet bessere Stimmung.',
      '13.03.2024\tSchlaf verbessert, keine Nebenwirkungen.',
    ].join('\n'))

    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.data.date)).toEqual(['2024-03-12', '2024-03-13'])
    expect(candidates[0].data.text).toBe('Patient berichtet bessere Stimmung.')
    expect(candidates[1].data.text).toBe('Schlaf verbessert, keine Nebenwirkungen.')
  })

  it('uses a section-level date from the heading for the whole Verlauf section', () => {
    const candidates = verlaufCandidates([
      'Clinical Course 14.03.2024',
      'Visite: Patient stabil, Entlassungsperspektive besprochen.',
    ].join('\n'))

    expect(candidates).toHaveLength(1)
    expect(candidates[0].data.date).toBe('2024-03-14')
    expect(candidates[0].clarifications).toBeUndefined()
  })

  it('maps Ergotherapieverlauf headings to complementary therapy, not ward Verlauf', () => {
    const candidates = complementaryTherapyCandidates([
      'Ergotherapieverlauf 14.03.2024',
      'Aktivierung und Tagesstruktur wurden besprochen.',
    ].join('\n'))

    expect(candidates).toHaveLength(1)
    expect(candidates[0].module).toBe('complementaryTherapy')
    if (candidates[0].module === 'complementaryTherapy') {
      expect(candidates[0].data.therapyTypeId).toBe('ergotherapie')
      expect(candidates[0].data.date).toBe('2024-03-14')
      expect(candidates[0].data.text).toContain('Tagesstruktur')
    }
    expect(verlaufCandidates('Ergotherapieverlauf 14.03.2024\nNote.').length).toBe(0)
  })

  it('extracts Std:DD.MM.YY dates from Ergotherapieverlauf headings', () => {
    const candidates = complementaryTherapyCandidates([
      'Ergotherapieverlauf Std:09.12.25',
      'Feinmotorik geübt, gute Mitarbeit.',
    ].join('\n'))

    expect(candidates).toHaveLength(1)
    if (candidates[0].module === 'complementaryTherapy') {
      expect(candidates[0].data.date).toBe('2025-12-09')
    }
  })

  it('collapses excessive blank lines within a single Verlauf entry at parse time', () => {
    const candidates = verlaufCandidates([
      'Verlauf',
      '12.03.2024',
      'Erster Satz.',
      '',
      '',
      '',
      'Zweiter Satz.',
    ].join('\n'))

    const dated = candidates.find((c) => c.module === 'verlauf' && c.data.date === '2024-03-12')
    expect(dated?.module).toBe('verlauf')
    if (dated?.module === 'verlauf') {
      expect(dated.data.text).toBe(['Erster Satz.', '', 'Zweiter Satz.'].join('\n'))
    }
  })

  it('uses a section date for the first note and row dates for later notes', () => {
    const candidates = verlaufCandidates([
      'Verlauf Documentation 14.03.2024',
      'Erster Eintrag ohne eigene Datumszeile.',
      '15.03.2024\tZweiter Eintrag aus einer linken Datumsspalte.',
    ].join('\n'))

    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.data.date)).toEqual(['2024-03-14', '2024-03-15'])
    expect(candidates.every((c) => !c.clarifications?.length)).toBe(true)
  })

  it('associates a separate preceding date line with the following Verlauf heading', () => {
    const candidates = verlaufCandidates([
      '15.03.2024',
      'Verlaufsdokumentation',
      'Patient nimmt an Gruppentherapie teil.',
    ].join('\n'))

    expect(candidates).toHaveLength(1)
    expect(candidates[0].data.date).toBe('2024-03-15')
    expect(candidates[0].data.text).toBe('Patient nimmt an Gruppentherapie teil.')
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

  it('recognizes Verlauf Documentation and Clinical Course table headers', () => {
    expect(autoDetectMapping(['Datum', 'Verlauf Documentation']).module).toBe('verlauf')
    expect(autoDetectMapping(['Date', 'Clinical Course']).module).toBe('verlauf')
  })
})

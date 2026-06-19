/**
 * Part 2 — layered parsing: the per-user ParserProfile applies ABOVE the base
 * parser as a detection bias, and the base parser is unchanged without a profile.
 */
import { describe, expect, it } from 'vitest'
import { docxTextToResult } from '../parsers/docxParser'
import { parseTxtFile } from '../parsers/txtParser'
import { parseFile } from '../parsers/index'
import { autoDetectMapping } from '../tabular'
import { profileToParseOptions } from '../parserProfile'
import type { ParserProfile } from '../../../schemas/documentImport/parserProfile'

describe('heading-alias layer (DOCX/TXT sectionizer)', () => {
  const text = ['Tagesdoku', '12.03.2024\tPatient stabil, gute Stimmung.'].join('\n')

  it('base parser does NOT recognise a clinic-specific heading', () => {
    const result = docxTextToResult(text)
    expect(result.candidates.some((c) => c.module === 'verlauf')).toBe(false)
    const doc = result.candidates.find((c) => c.module === 'document')
    expect(doc?.clarifications?.some((c) => c.code === 'mapping_uncertain')).toBe(true)
  })

  it('a profile heading alias maps the same heading to verlauf', () => {
    const profile: ParserProfile = {
      version: 1,
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
      dateLocation: 'auto',
      columnAliases: [],
    }
    const result = docxTextToResult(text, profileToParseOptions(profile).sectionize)
    const verlauf = result.candidates.filter((c) => c.module === 'verlauf')
    expect(verlauf).toHaveLength(1)
    expect(verlauf[0].module === 'verlauf' && verlauf[0].data.date).toBe('2024-03-12')
  })
})

describe('date-location hint layer', () => {
  // A date alone on the line FOLLOWING a note. Auto mode keeps it as its own
  // (dateless) entry; the 'following-line' hint attaches it to the prior note.
  const text = ['Verlauf', 'Patient berichtet bessere Stimmung.', '13.03.2024'].join('\n')

  it('auto mode does not back-date the preceding note', () => {
    const verlauf = docxTextToResult(text).candidates.filter((c) => c.module === 'verlauf')
    // In auto mode the trailing standalone date is NOT attached to the preceding
    // "bessere Stimmung" note (it does not back-date across lines).
    expect(
      verlauf.some(
        (c) =>
          c.module === 'verlauf' &&
          c.data.text.includes('bessere Stimmung') &&
          c.data.date === '2024-03-13',
      ),
    ).toBe(false)
  })

  it("'following-line' hint back-dates the preceding note", () => {
    const profile: ParserProfile = {
      version: 1,
      headingAliases: [],
      dateLocation: 'following-line',
      columnAliases: [],
    }
    const verlauf = docxTextToResult(text, profileToParseOptions(profile).sectionize).candidates.filter(
      (c) => c.module === 'verlauf',
    )
    expect(
      verlauf.some(
        (c) =>
          c.module === 'verlauf' &&
          c.data.text.includes('bessere Stimmung') &&
          c.data.date === '2024-03-13',
      ),
    ).toBe(true)
  })
})

describe('column-alias layer (CSV/XLSX auto-mapping)', () => {
  it('base auto-mapping ignores an unknown header; the alias maps it', () => {
    const headers = ['Datum', 'Spezialspalte']
    expect(autoDetectMapping(headers).module).toBe('lab') // only the date column votes

    const profile: ParserProfile = {
      version: 1,
      headingAliases: [],
      dateLocation: 'auto',
      columnAliases: [{ header: 'Spezialspalte', module: 'verlauf', field: 'text' }],
    }
    const mapping = autoDetectMapping(headers, profileToParseOptions(profile).autoDetect)
    expect(mapping.module).toBe('verlauf')
    expect(mapping.columns.text).toBe(1)
  })
})

describe('parseFile threads the profile end-to-end (txt)', () => {
  it('applies a heading alias through the full dispatch path', async () => {
    const file = new File(['Tagesdoku\n12.03.2024\tPatient stabil.'], 'note.txt', {
      type: 'text/plain',
    })
    const profile: ParserProfile = {
      version: 1,
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
      dateLocation: 'auto',
      columnAliases: [],
    }

    const base = await parseFile(file, { caseId: 'c1' })
    expect(base.envelope.candidates.some((c) => c.module === 'verlauf')).toBe(false)

    const layered = await parseFile(file, { caseId: 'c1', parserProfile: profile })
    expect(layered.envelope.candidates.some((c) => c.module === 'verlauf')).toBe(true)
  })

  it('confirms parseTxtFile accepts profile options without a profile (base unchanged)', async () => {
    const file = new File(['Verlauf\n12.03.2024\tStabil.'], 'note.txt', { type: 'text/plain' })
    const result = await parseTxtFile(file)
    expect(result.candidates.some((c) => c.module === 'verlauf')).toBe(true)
  })
})

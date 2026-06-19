/**
 * Part 2 — ParserProfile schema + application-layer mapping + PHI-safe label
 * sanitization.
 */
import { describe, expect, it } from 'vitest'
import {
  EMPTY_PARSER_PROFILE,
  ParserProfileSchema,
  isParserProfileEmpty,
  safeParseParserProfile,
  type ParserProfile,
} from '../../../schemas/documentImport/parserProfile'
import { profileToParseOptions, sanitizeProfileLabel } from '../parserProfile'

describe('ParserProfileSchema', () => {
  it('applies defaults for an empty object (no-op profile)', () => {
    const parsed = ParserProfileSchema.parse({})
    expect(parsed).toEqual({
      version: 1,
      headingAliases: [],
      dateLocation: 'auto',
      columnAliases: [],
    })
  })

  it('accepts a valid heading + column alias', () => {
    const profile = ParserProfileSchema.parse({
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
      dateLocation: 'right-column',
      columnAliases: [{ header: 'Befunddatum', module: 'lab', field: 'date' }],
    })
    expect(profile.headingAliases[0].module).toBe('verlauf')
    expect(profile.columnAliases[0].field).toBe('date')
  })

  it('rejects an unknown module and an over-long label', () => {
    expect(safeParseParserProfile({ headingAliases: [{ alias: 'X', module: 'nope' }] }).success).toBe(
      false,
    )
    expect(
      safeParseParserProfile({ headingAliases: [{ alias: 'a'.repeat(121), module: 'verlauf' }] })
        .success,
    ).toBe(false)
  })

  it('trims a heading label', () => {
    const parsed = ParserProfileSchema.parse({
      headingAliases: [{ alias: '  Tagesdoku  ', module: 'verlauf' }],
    })
    expect(parsed.headingAliases[0].alias).toBe('Tagesdoku')
  })
})

describe('isParserProfileEmpty', () => {
  it('treats the empty profile and null as empty', () => {
    expect(isParserProfileEmpty(EMPTY_PARSER_PROFILE)).toBe(true)
    expect(isParserProfileEmpty(null)).toBe(true)
  })

  it('treats any alias or non-auto date hint as non-empty', () => {
    const withAlias: ParserProfile = {
      ...EMPTY_PARSER_PROFILE,
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
    }
    expect(isParserProfileEmpty(withAlias)).toBe(false)
    expect(isParserProfileEmpty({ ...EMPTY_PARSER_PROFILE, dateLocation: 'left-column' })).toBe(false)
  })
})

describe('profileToParseOptions', () => {
  it('returns empty options for an absent or empty profile', () => {
    expect(profileToParseOptions(null)).toEqual({ sectionize: {}, autoDetect: {} })
    expect(profileToParseOptions(EMPTY_PARSER_PROFILE)).toEqual({ sectionize: {}, autoDetect: {} })
  })

  it('maps aliases + a non-auto date hint into base-parser options', () => {
    const profile: ParserProfile = {
      version: 1,
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
      dateLocation: 'right-column',
      columnAliases: [{ header: 'Befunddatum', module: 'lab', field: 'date' }],
    }
    const options = profileToParseOptions(profile)
    expect(options.sectionize.headingAliases).toHaveLength(1)
    expect(options.sectionize.dateLocation).toBe('right-column')
    expect(options.autoDetect.columnAliases).toHaveLength(1)
  })

  it('omits the date hint when it is auto', () => {
    const profile: ParserProfile = {
      ...EMPTY_PARSER_PROFILE,
      headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
    }
    expect(profileToParseOptions(profile).sectionize.dateLocation).toBeUndefined()
  })
})

describe('sanitizeProfileLabel (PHI safety)', () => {
  it('strips dates, long ids and contact info from a captured label', () => {
    const label = sanitizeProfileLabel('Verlauf 12.03.2024 Fallnr 123456789')
    expect(label).not.toMatch(/12\.03\.2024/)
    expect(label).not.toMatch(/123456789/)
    expect(label).toContain('Verlauf')
  })

  it('collapses whitespace and caps length at 120 chars', () => {
    expect(sanitizeProfileLabel('  Psychopathologischer    Befund  ')).toBe(
      'Psychopathologischer Befund',
    )
    expect(sanitizeProfileLabel('a'.repeat(200)).length).toBe(120)
  })
})

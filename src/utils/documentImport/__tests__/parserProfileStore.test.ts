/**
 * Part 2 — per-user ParserProfile persistence (localStorage, user-scoped key).
 */
import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_PARSER_PROFILE, type ParserProfile } from '../../../schemas/documentImport/parserProfile'
import {
  clearParserProfile,
  loadParserProfile,
  parserProfileStorageKey,
  saveParserProfile,
} from '../parserProfileStore'

const userA = 'user-a'
const userB = 'user-b'

afterEach(() => {
  localStorage.clear()
})

const sample: ParserProfile = {
  version: 1,
  headingAliases: [{ alias: 'Tagesdoku', module: 'verlauf' }],
  dateLocation: 'right-column',
  columnAliases: [{ header: 'Befunddatum', module: 'lab', field: 'date' }],
}

describe('parserProfileStore', () => {
  it('returns the empty profile when nothing is stored', () => {
    expect(loadParserProfile(userA)).toEqual(EMPTY_PARSER_PROFILE)
  })

  it('round-trips a saved profile and stamps updatedAt', () => {
    const saved = saveParserProfile(userA, sample)
    expect(saved.updatedAt).toBeTypeOf('string')

    const loaded = loadParserProfile(userA)
    expect(loaded.headingAliases).toEqual(sample.headingAliases)
    expect(loaded.dateLocation).toBe('right-column')
    expect(loaded.columnAliases).toEqual(sample.columnAliases)
  })

  it('keeps profiles isolated per user id', () => {
    saveParserProfile(userA, sample)
    expect(loadParserProfile(userB)).toEqual(EMPTY_PARSER_PROFILE)
  })

  it('falls back to the empty profile on corrupt storage', () => {
    localStorage.setItem(parserProfileStorageKey(userA), '{ not json')
    expect(loadParserProfile(userA)).toEqual(EMPTY_PARSER_PROFILE)
  })

  it('falls back to the empty profile on a schema-invalid payload', () => {
    localStorage.setItem(
      parserProfileStorageKey(userA),
      JSON.stringify({ headingAliases: [{ alias: 'X', module: 'unknown-module' }] }),
    )
    expect(loadParserProfile(userA)).toEqual(EMPTY_PARSER_PROFILE)
  })

  it('clears a stored profile', () => {
    saveParserProfile(userA, sample)
    clearParserProfile(userA)
    expect(loadParserProfile(userA)).toEqual(EMPTY_PARSER_PROFILE)
  })
})

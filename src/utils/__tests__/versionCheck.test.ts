import { describe, expect, it } from 'vitest'
import { isNewVersion, parseBuildId } from '../versionCheck'

describe('isNewVersion', () => {
  it('returns true when loaded and fetched build ids differ', () => {
    expect(isNewVersion('a3f7f01abcde', 'b1c2d3e4f5a6')).toBe(true)
  })

  it('returns false when ids are identical', () => {
    expect(isNewVersion('a3f7f01abcde', 'a3f7f01abcde')).toBe(false)
  })

  it('never prompts from the dev sentinel', () => {
    expect(isNewVersion('dev', 'a3f7f01abcde')).toBe(false)
  })

  it('stays quiet when either id is missing (fetch failure / offline)', () => {
    expect(isNewVersion(null, 'a3f7f01abcde')).toBe(false)
    expect(isNewVersion('a3f7f01abcde', null)).toBe(false)
    expect(isNewVersion(undefined, undefined)).toBe(false)
    expect(isNewVersion('', 'a3f7f01abcde')).toBe(false)
    expect(isNewVersion('a3f7f01abcde', '')).toBe(false)
  })
})

describe('parseBuildId', () => {
  it('extracts a non-empty string buildId', () => {
    expect(parseBuildId({ buildId: 'a3f7f01abcde' })).toBe('a3f7f01abcde')
  })

  it('rejects missing, empty, or non-string buildId', () => {
    expect(parseBuildId({})).toBeNull()
    expect(parseBuildId({ buildId: '' })).toBeNull()
    expect(parseBuildId({ buildId: 123 as unknown as string })).toBeNull()
    expect(parseBuildId(null)).toBeNull()
    expect(parseBuildId(undefined)).toBeNull()
  })
})

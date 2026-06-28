import { describe, expect, it } from 'vitest'
import { AI_TRANSLATION_LANGUAGES } from '../../data/aiTranslationLanguages'

describe('AI_TRANSLATION_LANGUAGES', () => {
  it('offers at least 25 languages for AI translation', () => {
    expect(AI_TRANSLATION_LANGUAGES.length).toBeGreaterThanOrEqual(25)
  })

  it('includes core clinical locales', () => {
    const codes = new Set(AI_TRANSLATION_LANGUAGES.map((lang) => lang.code))
    expect(codes.has('de')).toBe(true)
    expect(codes.has('en')).toBe(true)
    expect(codes.has('ar')).toBe(true)
    expect(codes.has('zh')).toBe(true)
  })
})

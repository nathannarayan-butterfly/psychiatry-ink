import { describe, expect, it } from 'vitest'
import {
  AI_TRANSLATION_LANGUAGES,
  AI_TRANSLATION_OUTPUT_CODES,
  AUTO_DETECT_LANGUAGE,
  getOutputTranslationLanguages,
} from '../aiTranslationLanguages'

describe('aiTranslationLanguages', () => {
  it('restricts output languages to DE/EN/FR/ES (#3)', () => {
    expect([...AI_TRANSLATION_OUTPUT_CODES]).toEqual(['de', 'en', 'fr', 'es'])
    const codes = getOutputTranslationLanguages().map((l) => l.code)
    expect(codes).toEqual(['de', 'en', 'fr', 'es'])
  })

  it('offers many input languages for auto-detect translation', () => {
    expect(AI_TRANSLATION_LANGUAGES.length).toBeGreaterThanOrEqual(20)
  })

  it('exposes a dedicated auto-detect sentinel distinct from real codes', () => {
    expect(AUTO_DETECT_LANGUAGE).toBe('auto')
    expect(AI_TRANSLATION_LANGUAGES.some((l) => l.code === AUTO_DETECT_LANGUAGE)).toBe(false)
  })
})

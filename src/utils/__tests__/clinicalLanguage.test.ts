import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LANGUAGE_STORAGE_KEY, loadStoredUiLanguage } from '../clinicalLanguage'
import { defaultLanguage, languageOptions } from '../../data/languages'

describe('loadStoredUiLanguage (Beta locale gating)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns the default language (de) when nothing is stored', () => {
    expect(loadStoredUiLanguage()).toBe(defaultLanguage)
    expect(defaultLanguage).toBe('de')
  })

  it('returns the stored language when it is currently exposed in the picker', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    expect(loadStoredUiLanguage()).toBe('en')

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de')
    expect(loadStoredUiLanguage()).toBe('de')
  })

  it('only exposes German and English in the Settings picker for the Beta', () => {
    expect(languageOptions.map((option) => option.value).sort()).toEqual(['de', 'en'])
  })

  it('migrates a legacy `fr` localStorage value to `en` and persists it', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')

    expect(loadStoredUiLanguage()).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('migrates a legacy `es` localStorage value to `en` and persists it', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')

    expect(loadStoredUiLanguage()).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('falls back to the default (de) for unknown stored values', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx-YZ')

    expect(loadStoredUiLanguage()).toBe(defaultLanguage)
  })

  it('does not crash when localStorage access throws', () => {
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled')
    }

    try {
      expect(loadStoredUiLanguage()).toBe(defaultLanguage)
    } finally {
      Storage.prototype.getItem = originalGetItem
    }
  })
})

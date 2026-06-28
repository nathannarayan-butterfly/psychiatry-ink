import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  LANGUAGE_STORAGE_KEY,
  loadBootstrapUiLanguage,
  loadStoredUiLanguage,
  parseUiLanguage,
} from '../clinicalLanguage'
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

describe('parseUiLanguage', () => {
  it('accepts bare codes and BCP-47 tags case-insensitively', () => {
    expect(parseUiLanguage('en')).toBe('en')
    expect(parseUiLanguage('EN-US')).toBe('en')
    expect(parseUiLanguage('de-CH')).toBe('de')
    expect(parseUiLanguage('fr')).toBe('fr')
    expect(parseUiLanguage('es-419')).toBe('es')
  })

  it('rejects unknown or empty values', () => {
    expect(parseUiLanguage('it')).toBeNull()
    expect(parseUiLanguage('')).toBeNull()
    expect(parseUiLanguage(null)).toBeNull()
    expect(parseUiLanguage(undefined)).toBeNull()
  })
})

describe('loadBootstrapUiLanguage (language across the marketing→app hop)', () => {
  const originalLocation = window.location
  const originalLanguage = navigator.language
  const originalLanguages = navigator.languages

  function setLocation(hostname: string, search = '') {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname, search },
    })
  }

  function setNavigatorLanguage(language: string) {
    Object.defineProperty(navigator, 'language', { configurable: true, value: language })
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [language] })
  }

  beforeEach(() => {
    localStorage.clear()
    setNavigatorLanguage('en-US')
  })

  afterEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    Object.defineProperty(navigator, 'language', { configurable: true, value: originalLanguage })
    Object.defineProperty(navigator, 'languages', { configurable: true, value: originalLanguages })
  })

  it('REGRESSION: English entry → English app via the lang hint on the app shell', () => {
    setLocation('app.psychiatry.ink', '?lang=en')
    setNavigatorLanguage('de-DE')
    expect(loadBootstrapUiLanguage()).toBe('en')
  })

  it('REGRESSION: German entry → German app via the lang hint on the app shell', () => {
    setLocation('app.psychiatry.ink', '?lang=de')
    setNavigatorLanguage('en-US')
    expect(loadBootstrapUiLanguage()).toBe('de')
  })

  it('keeps ES/FR working when carried as a lang hint', () => {
    setLocation('app.psychiatry.ink', '?lang=es')
    expect(loadBootstrapUiLanguage()).toBe('es')

    setLocation('app.psychiatry.ink', '?lang=fr')
    expect(loadBootstrapUiLanguage()).toBe('fr')
  })

  it('an explicit persisted preference wins over the lang hint', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    setLocation('app.psychiatry.ink', '?lang=de')
    expect(loadBootstrapUiLanguage()).toBe('en')
  })

  it('falls back to navigator.language on the bare app shell (no pref, no hint)', () => {
    setLocation('app.psychiatry.ink')
    setNavigatorLanguage('en-GB')
    expect(loadBootstrapUiLanguage()).toBe('en')

    setNavigatorLanguage('de-DE')
    expect(loadBootstrapUiLanguage()).toBe('de')
  })

  it('falls back to the app-shell default (de) when nothing else resolves', () => {
    setLocation('app.psychiatry.ink')
    setNavigatorLanguage('it-IT')
    expect(loadBootstrapUiLanguage()).toBe('de')
  })

  it('marketing hosts are authoritative for their own locale and never browser-sniff', () => {
    setNavigatorLanguage('de-DE')
    setLocation('psychiatry.ink')
    expect(loadBootstrapUiLanguage()).toBe('en')

    setNavigatorLanguage('en-US')
    setLocation('psychiatrie.ink')
    expect(loadBootstrapUiLanguage()).toBe('de')
  })
})

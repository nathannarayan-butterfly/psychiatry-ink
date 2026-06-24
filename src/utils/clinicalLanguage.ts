import { resolveDomainConfig } from '../config/domainConfig'
import { defaultLanguage, languageOptions } from '../data/languages'
import type { UiLanguage } from '../types/settings'
import { getEffectiveHostname } from './resolveHostname'

export const LANGUAGE_STORAGE_KEY = 'psychiatry-ink-language'

/**
 * UI languages that were once user-selectable in pre-Beta builds but are
 * not currently exposed in Settings → Language. If we encounter one of
 * these in localStorage from an older session, we transparently migrate
 * to English rather than to the German default — the user actively chose
 * a non-German UI, and English is the closest still-supported option.
 *
 * Translation data for these locales is intentionally retained on disk
 * (`content.fr.ts`, `content.es.ts`, `uiTranslations` FR/ES keys) so that
 * re-enabling them in `languageOptions` is a one-line change.
 */
const LEGACY_BETA_HIDDEN_UI_LANGUAGES = new Set<string>(['fr', 'es'])

export function hasStoredUiLanguage(): boolean {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) != null
  } catch {
    return false
  }
}

/**
 * Locale for first paint: stored user preference wins; otherwise domain default
 * (marketing hostname or dev override). Same source as useLanguageSettings init.
 */
export function loadBootstrapUiLanguage(): UiLanguage {
  if (hasStoredUiLanguage()) {
    return loadStoredUiLanguage()
  }
  return resolveDomainConfig(getEffectiveHostname()).defaultLocale
}

/** Active UI language from Settings (localStorage), same source as useLanguageSettings. */
export function loadStoredUiLanguage(): UiLanguage {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (!raw) return defaultLanguage
    const match = languageOptions.find((option) => option.value === raw)
    if (match) return match.value
    if (LEGACY_BETA_HIDDEN_UI_LANGUAGES.has(raw)) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
      } catch {
        // ignore — migration is best-effort; the in-memory value still routes to 'en'
      }
      return 'en'
    }
    return defaultLanguage
  } catch {
    return defaultLanguage
  }
}

/** BCP-47 tag for Accept-Language on clinical AI requests. */
export function clinicalAcceptLanguage(language: UiLanguage): string {
  switch (language) {
    case 'en':
      return 'en'
    case 'fr':
      return 'fr'
    case 'es':
      return 'es'
    default:
      return 'de'
  }
}

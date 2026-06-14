import { defaultLanguage, languageOptions } from '../data/languages'
import type { UiLanguage } from '../types/settings'

export const LANGUAGE_STORAGE_KEY = 'psychiatry-ink-language'

/** Active UI language from Settings (localStorage), same source as useLanguageSettings. */
export function loadStoredUiLanguage(): UiLanguage {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (!raw) return defaultLanguage
    const match = languageOptions.find((option) => option.value === raw)
    return match ? match.value : defaultLanguage
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

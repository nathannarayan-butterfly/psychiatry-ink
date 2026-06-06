import type { UiLanguage } from '../types/settings'

export const languageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
]

export const defaultLanguage: UiLanguage = 'de'

/** Word before the logo mark (logo file should include “.ink”). */
export const logoStemByLanguage: Record<UiLanguage, string> = {
  de: 'Psychiatrie',
  fr: 'Psychiatrie',
  en: 'Psychiatry',
  es: 'Psiquiatria',
}

/** Full title when no logo image is loaded yet. */
export const logoTextByLanguage: Record<UiLanguage, string> = {
  de: `${logoStemByLanguage.de}.ink`,
  fr: `${logoStemByLanguage.fr}.ink`,
  en: `${logoStemByLanguage.en}.ink`,
  es: `${logoStemByLanguage.es}.ink`,
}

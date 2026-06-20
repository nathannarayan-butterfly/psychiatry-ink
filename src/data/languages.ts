import type { UiLanguage } from '../types/settings'

/**
 * User-selectable UI languages.
 *
 * Beta scope: only German + English are exposed in the Settings → Language
 * picker. The full `UiLanguage` type still admits `'fr' | 'es'` so that
 * server-side language params, demo locale routing, and the staged
 * homepage/translation data (`content.fr.ts`, `content.es.ts`,
 * `uiTranslations` FR/ES keys, AI credits Hinweise FR/ES rows) can keep
 * compiling against the same union. When FR/ES are ready for general
 * availability, add them back to `languageOptions` — no other changes
 * required.
 */
export const languageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
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

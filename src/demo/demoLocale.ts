import type { UiLanguage } from '../types/settings'

/**
 * Supported locales for synthetic demo patient clinical copy.
 *
 * Demo content is only authored for German and English to keep clinical
 * fidelity high. UI languages `fr` and `es` route to English in
 * `uiLanguageToDemoLocale` — the homepage and product UI remain fully
 * localised, but the demo case is shown in English to avoid awkward
 * machine-translated medical wording.
 */
export type DemoLocale = 'de' | 'en'

export const DEMO_LOCALES: DemoLocale[] = ['de', 'en']

export function uiLanguageToDemoLocale(language: UiLanguage): DemoLocale {
  if (language === 'de') return 'de'
  return 'en'
}

export function isDemoLocale(value: string | null | undefined): value is DemoLocale {
  return value === 'de' || value === 'en'
}

export function normalizeDemoLocale(value: string | null | undefined, fallback: DemoLocale = 'en'): DemoLocale {
  return isDemoLocale(value) ? value : fallback
}

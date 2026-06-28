import { isMarketingDomain, resolveDomainConfig } from '../config/domainConfig'
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

/** Every locale the app can render (translation data ships for all four). */
const SUPPORTED_UI_LANGUAGES: readonly UiLanguage[] = ['de', 'en', 'fr', 'es']

export function hasStoredUiLanguage(): boolean {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) != null
  } catch {
    return false
  }
}

/**
 * Coerce a raw locale string into a supported `UiLanguage`, or `null`.
 *
 * Accepts bare codes (`en`) and BCP-47 tags (`en-US`, `de-CH`) case-insensitively
 * by matching on the primary subtag, so it works for both `?lang=` params and
 * `navigator.language` values.
 */
export function parseUiLanguage(raw: string | null | undefined): UiLanguage | null {
  if (!raw) return null
  const primary = raw.trim().toLowerCase().split(/[-_]/)[0]
  if (!primary) return null
  return (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(primary)
    ? (primary as UiLanguage)
    : null
}

/**
 * Locale explicitly carried on the URL as `?lang=`. This is how the language
 * chosen on a marketing domain survives the cross-origin redirect to the app
 * shell (localStorage is per-origin and does not cross the hop). SSR/test-safe.
 */
export function readLangParamFromUrl(): UiLanguage | null {
  if (typeof window === 'undefined' || !window.location) return null
  try {
    return parseUiLanguage(new URLSearchParams(window.location.search).get('lang'))
  } catch {
    return null
  }
}

/** Best supported UI language implied by the browser, or `null`. SSR/test-safe. */
export function resolveNavigatorUiLanguage(): UiLanguage | null {
  if (typeof navigator === 'undefined') return null
  const candidates: string[] = []
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
  if (navigator.language) candidates.push(navigator.language)
  for (const candidate of candidates) {
    const parsed = parseUiLanguage(candidate)
    if (parsed) return parsed
  }
  return null
}

/**
 * Locale for first paint, resolved in strict precedence:
 *   (a) an explicit, persisted user preference (per-origin localStorage pin);
 *   (b) the `?lang=` hint carried across the marketing→app domain hop;
 *   (c) on the app shell only, the browser's language (`navigator.language`);
 *   (d) the host's default locale (app shell → `de`, marketing → its locale).
 *
 * Marketing/dev hosts skip (c) and use their domain locale at step (b)/(d) so
 * first paint always matches the server-rendered `<html lang>` shell. Same
 * source as `useLanguageSettings` init, so the resolved value is then persisted.
 */
export function loadBootstrapUiLanguage(): UiLanguage {
  if (hasStoredUiLanguage()) {
    return loadStoredUiLanguage()
  }

  const fromParam = readLangParamFromUrl()
  if (fromParam) return fromParam

  const config = resolveDomainConfig(getEffectiveHostname())

  // Public marketing/dev hosts are authoritative for their own locale and must
  // never browser-sniff (it would diverge from the prerendered <html lang>).
  if (config.siteKind === 'marketing') {
    return config.defaultLocale
  }

  const fromNavigator = resolveNavigatorUiLanguage()
  if (fromNavigator) return fromNavigator

  return config.defaultLocale
}

/**
 * Locale for the very first paint (pre-React, in `main.tsx`). On public marketing
 * domains the request domain wins — matching the server-rendered `<html lang>` shell
 * — so a stale persisted UI-language pin can never flip psychiatry.ink to German
 * before React mounts. On the authenticated app domain the stored user preference
 * (or app default) wins, as before.
 */
export function loadInitialDocumentLanguage(): UiLanguage {
  const host = getEffectiveHostname()
  if (isMarketingDomain(host)) {
    return resolveDomainConfig(host).defaultLocale
  }
  return loadBootstrapUiLanguage()
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

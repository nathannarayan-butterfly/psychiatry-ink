import type { UiLanguage } from '../types/settings'

/**
 * Localized ISO 3166-1 country names.
 *
 * Names are derived at runtime from `Intl.DisplayNames` ({ type: 'region' }),
 * which ships complete, authoritative DE/EN/FR/ES names for every ISO alpha-2
 * code — no hand-maintained string tables. A tiny static fallback covers the
 * legacy `UK` alias and environments without `Intl.DisplayNames`.
 *
 * `UK` is accepted as a legacy alias of ISO `GB` (the prescription scheme uses
 * `UK`, the privacy scheme uses `GB`).
 */

const UI_LANGUAGES: UiLanguage[] = ['de', 'en', 'fr', 'es']

/** Minimal fallback used when `Intl.DisplayNames` is unavailable. */
const FALLBACK_NAMES: Record<string, Record<UiLanguage, string>> = {
  GB: { de: 'Vereinigtes Königreich', en: 'United Kingdom', fr: 'Royaume-Uni', es: 'Reino Unido' },
  UK: { de: 'Vereinigtes Königreich', en: 'United Kingdom', fr: 'Royaume-Uni', es: 'Reino Unido' },
  DE: { de: 'Deutschland', en: 'Germany', fr: 'Allemagne', es: 'Alemania' },
  AT: { de: 'Österreich', en: 'Austria', fr: 'Autriche', es: 'Austria' },
  CH: { de: 'Schweiz', en: 'Switzerland', fr: 'Suisse', es: 'Suiza' },
}

const displayNamesCache = new Map<UiLanguage, Intl.DisplayNames | null>()

function getDisplayNames(language: UiLanguage): Intl.DisplayNames | null {
  if (displayNamesCache.has(language)) return displayNamesCache.get(language) ?? null
  let instance: Intl.DisplayNames | null = null
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      instance = new Intl.DisplayNames([language], { type: 'region' })
    }
  } catch {
    instance = null
  }
  displayNamesCache.set(language, instance)
  return instance
}

/** ISO alpha-2 of a country code, mapping the legacy `UK` prescription code to `GB`. */
export function toIsoCountryCode(code: string): string {
  const normalized = code.trim().toUpperCase()
  return normalized === 'UK' ? 'GB' : normalized
}

/**
 * Localized country name for an ISO alpha-2 code (or the `UK` alias). Falls back
 * to the static table, then to the raw code, so the UI never shows an empty
 * label.
 */
export function countryName(code: string, language: UiLanguage): string {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return code

  const iso = normalized === 'UK' ? 'GB' : normalized
  const display = getDisplayNames(language)
  if (display) {
    try {
      const resolved = display.of(iso)
      // `Intl.DisplayNames` returns the input code unchanged for unknown codes.
      if (resolved && resolved !== iso) return resolved
    } catch {
      // fall through to the static fallback
    }
  }

  return FALLBACK_NAMES[normalized]?.[language] ?? normalized
}

/** All UI languages — exported for callers that pre-build localized label maps. */
export { UI_LANGUAGES }

import { isMarketingDomain, normalizeHostname, resolveLocaleFromHost } from '../config/domainConfig'
import type { UiLanguage } from '../types/settings'
import { getEffectiveHostname } from './resolveHostname'

function readCanonicalAppDomain(): string | undefined {
  const raw = import.meta.env.VITE_CANONICAL_APP_DOMAIN?.trim()
  if (!raw) return undefined
  return normalizeHostname(raw.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
}

export function getCanonicalAppDomain(): string | undefined {
  return readCanonicalAppDomain()
}

/**
 * Merge a `lang` hint into a query string without clobbering an explicit one.
 *
 * localStorage is per-origin, so the locale chosen on a marketing domain
 * (`psychiatry.ink` → en, `psychiatrie.ink` → de, …) is otherwise lost on the
 * cross-origin hop to the app shell, which then falls back to its German
 * default. Carrying `?lang=` lets the app honour the originating domain's
 * locale on first paint. Returns a string beginning with `?`, or `''`.
 */
function withLangParam(search: string, lang: UiLanguage): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (!params.has('lang')) params.set('lang', lang)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function buildCanonicalAppUrl(pathname: string, search = ''): string | null {
  const canonical = getCanonicalAppDomain()
  if (!canonical) return null

  const hostname = getEffectiveHostname()
  if (!isMarketingDomain(hostname)) return null
  if (normalizeHostname(hostname) === canonical) return null

  // The destination may already carry an embedded query string (e.g.
  // `/case/abc?view=overview`); fold it together with the explicit `search`
  // argument before appending the originating domain's locale as `?lang=`.
  const raw = pathname.startsWith('/') ? pathname : `/${pathname}`
  const queryStart = raw.indexOf('?')
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart)
  const embeddedQuery = queryStart === -1 ? '' : raw.slice(queryStart + 1)

  const merged = new URLSearchParams(embeddedQuery)
  const extra = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  for (const [key, value] of extra) merged.set(key, value)

  const finalSearch = withLangParam(merged.toString(), resolveLocaleFromHost(hostname))
  return `https://${canonical}${path}${finalSearch}`
}

/** Redirect logged-in users from a marketing domain to the canonical app host. */
export function redirectToCanonicalAppIfNeeded(pathname: string, search = ''): boolean {
  const url = buildCanonicalAppUrl(pathname, search)
  if (!url || typeof window === 'undefined') return false
  window.location.assign(url)
  return true
}

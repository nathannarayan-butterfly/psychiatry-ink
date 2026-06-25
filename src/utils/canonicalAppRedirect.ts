import { isMarketingDomain, normalizeHostname } from '../config/domainConfig'
import { getEffectiveHostname } from './resolveHostname'

function readCanonicalAppDomain(): string | undefined {
  const raw = import.meta.env.VITE_CANONICAL_APP_DOMAIN?.trim()
  if (!raw) return undefined
  return normalizeHostname(raw.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
}

export function getCanonicalAppDomain(): string | undefined {
  return readCanonicalAppDomain()
}

export function buildCanonicalAppUrl(pathname: string, search = ''): string | null {
  const canonical = getCanonicalAppDomain()
  if (!canonical) return null

  const hostname = getEffectiveHostname()
  if (!isMarketingDomain(hostname)) return null
  if (normalizeHostname(hostname) === canonical) return null

  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `https://${canonical}${path}${search}`
}

/** Redirect logged-in users from a marketing domain to the canonical app host. */
export function redirectToCanonicalAppIfNeeded(pathname: string, search = ''): boolean {
  const url = buildCanonicalAppUrl(pathname, search)
  if (!url || typeof window === 'undefined') return false
  window.location.assign(url)
  return true
}

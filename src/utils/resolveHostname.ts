import { normalizeHostname } from '../config/domainConfig'

/** Browser hostname, with optional dev override via VITE_DEV_MARKETING_DOMAIN. */
export function getEffectiveHostname(fallback = 'localhost'): string {
  if (typeof window === 'undefined') {
    return fallback
  }

  const devOverride = import.meta.env.VITE_DEV_MARKETING_DOMAIN?.trim()
  if (import.meta.env.DEV && devOverride) {
    return normalizeHostname(devOverride)
  }

  return normalizeHostname(window.location.hostname)
}

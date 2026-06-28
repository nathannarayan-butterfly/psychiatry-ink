/**
 * Production-safe redirect target for Supabase auth confirmation emails.
 *
 * Supabase composes the confirmation/verification link from the project's
 * **Site URL** (and the `emailRedirectTo` we pass, IF it is in the project's
 * Redirect-URL allow-list). If neither is correct the link points at the stale
 * default (`http://localhost:3000`) and clicking it fails for real users.
 *
 * Resolution order:
 *   1. `VITE_PUBLIC_APP_URL` / `VITE_SITE_URL` — explicit canonical app origin.
 *      Lets production pin the link to the app front door even when the signup
 *      happens on a marketing domain, and lets local dev override if needed.
 *   2. `window.location.origin` — correct in the browser for both prod
 *      (app.psychiatry.ink) and dev (http://localhost:5173).
 *
 * The returned value is an origin with no trailing slash, or `undefined` when
 * nothing resolves (e.g. SSR/tests without a configured env) so callers can
 * simply omit `emailRedirectTo` and let Supabase fall back to its Site URL.
 */
function sanitizeOrigin(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.origin
  } catch {
    return undefined
  }
}

export function getAuthEmailRedirectUrl(): string | undefined {
  const configured =
    sanitizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL) ??
    sanitizeOrigin(import.meta.env.VITE_SITE_URL)
  if (configured) return configured

  if (typeof window !== 'undefined') {
    const origin = window.location?.origin
    if (origin && origin !== 'null') return origin.replace(/\/+$/, '')
  }

  return undefined
}

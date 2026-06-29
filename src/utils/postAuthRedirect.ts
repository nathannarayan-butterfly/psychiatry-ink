/**
 * Post-authentication redirect resolution.
 *
 * After a successful login OR an email-confirmation link (Supabase points the
 * confirmation link at the site origin "/"), the user must land on the
 * authenticated app — never back on the public marketing homepage. These helpers
 * centralise that decision so the login `onSuccess` handler and the app-level
 * auth guard stay in sync.
 */

/** Default authenticated entry point. */
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'

/**
 * Resolve where to send a user after a successful login.
 *
 * Honours a same-origin `?redirect=` deep-link return target (so opening a
 * protected URL while signed out still lands there after login); otherwise
 * defaults to the dashboard. Off-site / protocol-relative redirect values are
 * rejected to avoid open-redirects.
 */
export function getPostLoginDestination(search: string): string {
  const params = new URLSearchParams(search)
  const redirect = params.get('redirect')
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return DEFAULT_AUTHENTICATED_PATH
}

/**
 * True when an authenticated user sitting on this route should be bounced into
 * the authenticated app. Only the bare public landing page ("/") is redirected —
 * marketing/legal sub-pages (features, pricing, privacy, …) remain viewable while
 * signed in, and login/signup are handled by their own guard.
 */
export function shouldRedirectAuthenticatedToApp(routeView: string): boolean {
  return routeView === 'landing'
}

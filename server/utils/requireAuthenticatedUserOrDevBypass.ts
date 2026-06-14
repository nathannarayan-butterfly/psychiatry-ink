import type { Request, Response } from 'express'
import { resolveAccountId } from '../middleware/auth'

const LEGACY_ACCOUNT_ID = 'default'

/**
 * The dev auth bypass lets the legacy `default` account reach AI/LLM routes
 * WITHOUT a real authenticated session. It is intended only for local
 * development against an unconfigured Supabase/org store.
 *
 * It is enabled ONLY when BOTH conditions hold:
 *   - `NODE_ENV === "development"` (true local dev — not production, preview,
 *     staging, test, or an unset/unknown env), AND
 *   - `ENABLE_DEV_AUTH_BYPASS === "true"` (explicit literal opt-in).
 *
 * In every other environment the bypass is disabled by default so paid AI
 * endpoints can never be reached anonymously.
 */
export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEV_AUTH_BYPASS === 'true'
  )
}

/**
 * Log a denied AI access attempt. Logs route + reason + timestamp ONLY — never
 * prompt content, request body, PHI, headers, or tokens.
 */
function logDeniedAiAccess(req: Request, reason: string): void {
  const route = req.baseUrl || req.path || 'unknown'
  console.warn(
    `[ai-auth] denied unauthenticated AI access route="${req.method} ${route}" reason=${reason} ts=${new Date().toISOString()}`,
  )
}

/**
 * Central guard for AI/LLM routes.
 *
 * Requires an authenticated Supabase user. Falls back to the legacy `default`
 * account ONLY when the dev bypass is explicitly enabled for local development
 * (see {@link isDevAuthBypassEnabled}). Returns the resolved account id on
 * success, or `null` after sending a 401 when access is denied.
 *
 * MUST run before any AI/LLM call and before the legacy `default` fallback in
 * `requireRouteAuth` / `assertCaseAiAccess` / `assertAiQuota` can grant access.
 */
export function requireAuthenticatedUserOrDevBypass(
  req: Request,
  res: Response,
): string | null {
  const userId = resolveAccountId(req)
  if (userId && userId !== LEGACY_ACCOUNT_ID) return userId
  if (isDevAuthBypassEnabled()) return userId
  logDeniedAiAccess(req, 'unauthenticated')
  res.status(401).json({ error: 'Anmeldung erforderlich' })
  return null
}

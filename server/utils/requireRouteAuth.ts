import type { Request, Response } from 'express'
import { isServerAuthConfigured, resolveAccountId } from '../middleware/auth'
import { isOrgStoreConfigured } from '../services/orgStore'
import { isDevAuthBypassEnabled } from './requireAuthenticatedUserOrDevBypass'

/**
 * True when org-scoped access control can be skipped because no org store is
 * configured (pure local/dev). This gates ACL enforcement only — it is NOT an
 * authentication bypass and must never grant the shared `default` account.
 */
export function allowLegacyDevAccount(): boolean {
  return !isServerAuthConfigured() && !isOrgStoreConfigured()
}

/**
 * Central authentication guard for PHI / credit / account routes.
 *
 * Returns the verified Supabase user id on success. A missing or invalid Bearer
 * token is REJECTED with 401 — the request never silently falls back to the
 * shared legacy `default` account (which previously mixed data across users and
 * enabled credit-pool abuse).
 *
 * The legacy `default` account is reachable ONLY via the EXPLICIT, opt-in dev
 * bypass (`NODE_ENV=development` + `ENABLE_DEV_AUTH_BYPASS=true`, see
 * {@link isDevAuthBypassEnabled}) for local development against an unconfigured
 * Supabase. In every other environment unauthenticated requests are rejected.
 */
export function requireRouteAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (userId && userId !== 'default') return userId
  if (isDevAuthBypassEnabled()) return 'default'
  res.status(401).json({ error: 'Anmeldung erforderlich' })
  return null
}

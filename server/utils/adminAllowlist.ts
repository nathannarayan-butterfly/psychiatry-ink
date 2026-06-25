/**
 * Explicit operator allowlists for privileged, non-clinical admin actions
 * (e.g. manual credit grants). Identity must always come from the verified
 * `req.authUserId`; these helpers only decide whether that verified id is
 * authorized.
 */

function parseIdList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * True when `userId` may perform manual AI credit grants.
 *
 * Authorization rules:
 *  - If CREDIT_ADMIN_USER_IDS is set, the user must be on that allowlist
 *    (applies in every environment).
 *  - If the allowlist is empty:
 *      • production  → DENY (no implicit admins in prod), and
 *      • non-prod    → allowed ONLY when ALLOW_DEV_CREDIT_GRANT=true, preserving
 *        the existing local-dev "grant test credits" workflow.
 */
export function isCreditGrantAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  const allowlist = parseIdList(process.env.CREDIT_ADMIN_USER_IDS)
  if (allowlist.size > 0) {
    return allowlist.has(userId.trim().toLowerCase())
  }
  if (isProduction()) return false
  return process.env.ALLOW_DEV_CREDIT_GRANT === 'true'
}

/**
 * True when `userId` is a platform **System Admin** — the single elevated role
 * over the global Knowledge Base (publish / approve / archive / delete and other
 * destructive or global operations).
 *
 * Authorization rules (server-only; identity must come from the verified
 * `req.authUserId`, never a client-supplied header):
 *  - If SYSTEM_ADMIN_USER_IDS is set, the verified id (or email) must be on that
 *    allowlist — this is the SOLE source of system-admin authority and applies in
 *    every environment.
 *  - If the allowlist is empty:
 *      • production  → DENY (no implicit system admins in prod), and
 *      • non-prod    → ALLOW (local-development convenience so the KB review
 *        console is usable against an unconfigured deployment).
 */
export function isSystemAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  const allowlist = parseIdList(process.env.SYSTEM_ADMIN_USER_IDS)
  if (allowlist.size > 0) {
    return allowlist.has(userId.trim().toLowerCase())
  }
  return !isProduction()
}

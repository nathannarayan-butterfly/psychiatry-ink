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
 * True when `userId` is a platform **Knowledge Base admin** — the single elevated
 * role over the global Knowledge Base (publish / approve / archive / delete and
 * other destructive or global operations). This governs ONLY the global KB admin
 * role; it is not a general system-administration capability.
 *
 * Authorization rules (server-only; identity must come from the verified
 * `req.authUserId`, never a client-supplied header):
 *  - If KB_ADMIN_USER_IDS is set, the verified id (or email) must be on that
 *    allowlist — this is the SOLE source of KB-admin authority and applies in
 *    every environment.
 *  - If the allowlist is empty:
 *      • production  → DENY (no implicit KB admins in prod), and
 *      • non-prod    → ALLOW (local-development convenience so the KB review
 *        console is usable against an unconfigured deployment).
 *
 * BACKWARD COMPAT: reads the current `KB_ADMIN_USER_IDS` first and falls back to
 * the deprecated alias `SYSTEM_ADMIN_USER_IDS` when the new var is unset, so
 * production KB-admin auth keeps working until the Cloud Run env var is renamed.
 */
export function isKbAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  // `SYSTEM_ADMIN_USER_IDS` is a deprecated alias kept only for a smooth env-var
  // rename; remove it once production no longer sets the legacy name.
  const raw = process.env.KB_ADMIN_USER_IDS ?? process.env.SYSTEM_ADMIN_USER_IDS
  const allowlist = parseIdList(raw)
  if (allowlist.size > 0) {
    return allowlist.has(userId.trim().toLowerCase())
  }
  return !isProduction()
}

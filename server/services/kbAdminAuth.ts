import type { Request } from 'express'
import { isSystemAdmin } from '../utils/adminAllowlist'

/**
 * Number of approve votes a community contribution needs before a System Admin
 * may publish it. Defaults to 2 in production, 1 elsewhere.
 */
export function getKbAdminApprovalThreshold(): number {
  const raw = process.env.KB_ADMIN_APPROVAL_THRESHOLD?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return process.env.NODE_ENV === 'production' ? 2 : 1
}

/**
 * Resolve the acting user id for KB operations.
 *
 * Identity is taken ONLY from the server-verified `req.authUserId` (set by the
 * Supabase token middleware). The previously-honored, client-supplied
 * `x-kb-user-id` header is no longer trusted in any environment — there is no
 * spoofable identity path.
 */
export function resolveKbAdminActor(req: Request): string | null {
  return req.authUserId ?? null
}

/**
 * Whether a verified user is the platform System Admin — the only elevated role
 * over the global KB. This wraps the server-only {@link isSystemAdmin}
 * allowlist; org role is never sufficient.
 */
export function isKbSystemAdmin(userId: string | null | undefined): boolean {
  return isSystemAdmin(userId)
}

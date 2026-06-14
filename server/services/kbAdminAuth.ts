import type { Request, Response } from 'express'
import type { OrganisationRole } from '../../src/types/organisation'
import { getCurrentMemberRole, getCurrentOrganisation, ORG_HEADER } from './orgPermissions'
import { isOrgStoreConfigured } from './orgStore'

/**
 * Roles permitted to manage the (global) KB via admin routes.
 *
 * The org role model has no dedicated `kb_admin` role, so we map the task's
 * "owner / admin / kb_admin" to the closest existing high-privilege roles:
 *   - single_owner / org_owner → owner
 *   - org_admin               → admin
 * The explicit `kb_admin` designation is expressed out-of-band via the
 * KB_ADMIN_USER_IDS allowlist (see {@link isKbAdminActor}).
 */
const KB_ADMIN_ROLES: ReadonlySet<OrganisationRole> = new Set<OrganisationRole>([
  'single_owner',
  'org_owner',
  'org_admin',
])

function parseIdList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

function resolveRequestActorId(req: Request): string | null {
  if (req.authUserId) return req.authUserId
  const header = req.headers['x-kb-user-id']
  if (typeof header === 'string' && header.trim()) return header.trim()
  return null
}

export function getKbAdminApprovalThreshold(): number {
  const raw = process.env.KB_ADMIN_APPROVAL_THRESHOLD?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return process.env.NODE_ENV === 'production' ? 2 : 1
}

export function isKbAdminActor(actorId: string | null | undefined): boolean {
  if (!actorId) return false
  const allowlist = parseIdList(process.env.KB_ADMIN_USER_IDS)
  if (allowlist.size === 0) {
    return process.env.NODE_ENV !== 'production'
  }
  return allowlist.has(actorId.trim().toLowerCase())
}

export function requireKbAdminUser(req: Request, res: Response): string | null {
  const actorId = resolveRequestActorId(req)
  if (!actorId || !isKbAdminActor(actorId)) {
    res.status(403).json({
      error:
        'KB admin access denied. Add your user id/email to KB_ADMIN_USER_IDS (server) or VITE_KB_ADMIN_USER_IDS / Settings → KB Admin allowlist.',
    })
    return null
  }
  return actorId
}

export function resolveKbAdminActor(req: Request): string | null {
  return resolveRequestActorId(req)
}

/**
 * Determine whether an authenticated user may perform KB admin mutations.
 *
 * Access is granted when EITHER:
 *   1. the user is on the explicit KB_ADMIN_USER_IDS allowlist (the
 *      "kb_admin" designation; in non-production with an empty allowlist this
 *      stays permissive for local development), OR
 *   2. the user holds an owner/admin role in their active organisation.
 *
 * This is layered ON TOP of {@link kbAdminEnabled} (env flag) and an
 * authentication check — never the sole gate.
 */
export async function hasKbAdminRole(req: Request, userId: string): Promise<boolean> {
  if (isKbAdminActor(userId)) return true
  if (!isOrgStoreConfigured()) return false
  try {
    const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
    if (!org) return false
    const role = await getCurrentMemberRole(userId, org.id)
    return role ? KB_ADMIN_ROLES.has(role) : false
  } catch {
    return false
  }
}

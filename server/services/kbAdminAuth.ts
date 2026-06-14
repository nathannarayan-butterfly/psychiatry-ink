import type { Request, Response } from 'express'

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

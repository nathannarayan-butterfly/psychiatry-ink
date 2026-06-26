import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { isKbAdmin } from '../utils/adminAllowlist'
import { isAuditAction, listAuditLogs, recordAuditLog } from '../services/auditLog'
import { buildOrganisationContext, hasPermission, ORG_HEADER } from '../services/orgPermissions'
import { isOrgStoreConfigured } from '../services/orgStore'
import type { AuditAction } from '../../src/types/auditLog'
import { AUDIT_ACTIONS } from '../../src/types/auditLog'

export const auditRouter: Router = createRouter()

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

async function resolveOrgContext(req: Request, userId: string) {
  const displayName =
    typeof req.body?.displayName === 'string' ? req.body.displayName : null
  return buildOrganisationContext(userId, req.headers[ORG_HEADER], displayName)
}

async function canViewAuditLogs(_req: Request, userId: string, organisationId: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true
  if (isKbAdmin(userId)) return true
  return hasPermission(userId, organisationId, 'audit.view')
}

// POST /api/audit — record a client- or server-initiated audit event
auditRouter.post('/', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return

  const action = typeof req.body?.action === 'string' ? req.body.action.trim() : ''
  if (!action || !isAuditAction(action)) {
    res.status(400).json({ error: `Invalid action. Expected one of: ${AUDIT_ACTIONS.join(', ')}` })
    return
  }

  if (!isOrgStoreConfigured()) {
    res.json({ ok: true, skipped: true })
    return
  }

  try {
    const ctx = await resolveOrgContext(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
    const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : null
    const metadata =
      req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
        ? (req.body.metadata as Record<string, unknown>)
        : {}

    void recordAuditLog({
      organisationId: ctx.organisation.id,
      userId,
      action: action as AuditAction,
      caseId,
      documentId,
      metadata,
      req,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[audit] record failed:', err)
    res.json({ ok: true, skipped: true })
  }
})

// GET /api/audit — dev / auditor view (filtered list)
auditRouter.get('/', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return

  if (!isOrgStoreConfigured()) {
    res.json({ logs: [], actions: AUDIT_ACTIONS })
    return
  }

  try {
    const ctx = await resolveOrgContext(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const allowed = await canViewAuditLogs(req, userId, ctx.organisation.id)
    if (!allowed) {
      res.status(403).json({ error: 'Audit log access denied' })
      return
    }

    const actionParam = typeof req.query.action === 'string' ? req.query.action.trim() : undefined
    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : undefined
    const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined
    const offsetRaw = typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : undefined

    const logs = await listAuditLogs(ctx.organisation.id, {
      action: actionParam && isAuditAction(actionParam) ? actionParam : undefined,
      caseId,
      limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      offset: Number.isFinite(offsetRaw) ? offsetRaw : undefined,
    })

    res.json({ logs, actions: AUDIT_ACTIONS, organisationId: ctx.organisation.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list audit logs'
    console.error('[audit] list failed:', err)
    res.status(500).json({ error: message })
  }
})

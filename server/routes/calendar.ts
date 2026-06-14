import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AuditAction } from '../../src/types/auditLog'
import type {
  CreateCalendarItemWireInput,
  RescheduleCalendarInput,
  UpdateCalendarItemWireInput,
} from '../../src/types/calendar'
import { resolveAccountId } from '../middleware/auth'
import { recordAuditLog } from '../services/auditLog'
import {
  getCalendarKeyForUser,
  isCalendarKeyInitialized,
  listMemberVaultPublicKeys,
  upsertCalendarKey,
} from '../services/calendarKeyStore'
import {
  createCalendarItem,
  getCalendarItem,
  isCalendarStoreConfigured,
  listCalendarItems,
  rescheduleCalendarItem,
  setCalendarItemStatus,
  updateCalendarItem,
} from '../services/calendarStore'
import {
  buildOrganisationContext,
  canViewCase,
  hasPermission,
  ORG_HEADER,
} from '../services/orgPermissions'

export const calendarRouter: Router = createRouter()

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function requireSupabase(res: Response): boolean {
  if (!isCalendarStoreConfigured()) {
    res.status(503).json({
      error: 'Calendar requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

async function resolveOrgContext(req: Request, res: Response) {
  const userId = requireAuth(req, res)
  if (!userId) return null
  if (!requireSupabase(res)) return null

  const { organisation, role, member, permissions } = await buildOrganisationContext(
    userId,
    req.headers[ORG_HEADER],
  )
  if (!organisation || !role || !member) {
    res.status(404).json({ error: 'Organisation context unavailable' })
    return null
  }

  return { userId, organisation, role, member, permissions }
}

function requireSmallPraxis(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  res: Response,
): boolean {
  if (ctx.organisation.tier !== 'small_praxis') {
    res.status(400).json({ error: 'Org calendar requires Small Praxis mode' })
    return false
  }
  return true
}

function isOwnerRole(role: string): boolean {
  return role === 'org_owner' || role === 'single_owner'
}

async function canAccessItem(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  item: Awaited<ReturnType<typeof getCalendarItem>>,
): Promise<boolean> {
  if (!item) return false
  if (item.createdBy === ctx.userId) return true
  if (item.assignedUserId === ctx.userId) return true
  if (isOwnerRole(ctx.role)) return true
  // Legacy plaintext case_id fallback for access checks.
  if (item.caseId) {
    return canViewCase(ctx.userId, ctx.organisation.id, item.caseId)
  }
  return hasPermission(ctx.userId, ctx.organisation.id, 'cases.view')
}

async function canEditItem(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  item: Awaited<ReturnType<typeof getCalendarItem>>,
): Promise<boolean> {
  if (!item) return false
  if (item.createdBy === ctx.userId) return true
  if (item.assignedUserId === ctx.userId) return true
  if (isOwnerRole(ctx.role)) return true
  return false
}

async function recordCalendarAudit(
  req: Request,
  organisationId: string,
  userId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAuditLog({
    organisationId,
    userId,
    action,
    caseId: null,
    metadata,
    req,
  })
}

async function assertCaseViewAccess(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  caseId: string | undefined | null,
  res: Response,
): Promise<boolean> {
  if (!caseId?.trim()) return true
  const allowed = await canViewCase(ctx.userId, ctx.organisation.id, caseId.trim())
  if (!allowed) {
    res.status(403).json({ error: 'No access to linked case' })
    return false
  }
  return true
}

// GET /api/calendar/encryption-key/status
calendarRouter.get('/encryption-key/status', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const initialized = await isCalendarKeyInitialized(ctx.organisation.id)
    const row = initialized
      ? await getCalendarKeyForUser(ctx.organisation.id, ctx.userId)
      : null

    res.json({
      initialized,
      hasWrappedKey: Boolean(row),
    })
  } catch (error) {
    console.error('[calendar] encryption-key status failed:', error)
    res.status(500).json({ error: 'Failed to load calendar encryption status' })
  }
})

// GET /api/calendar/encryption-key
calendarRouter.get('/encryption-key', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const row = await getCalendarKeyForUser(ctx.organisation.id, ctx.userId)
    if (!row) {
      res.status(404).json({ error: 'Calendar encryption key not found for user' })
      return
    }

    res.json({ wrappedKey: row.wrappedKey })
  } catch (error) {
    console.error('[calendar] encryption-key fetch failed:', error)
    res.status(500).json({ error: 'Failed to load calendar encryption key' })
  }
})

// POST /api/calendar/encryption-key/init
calendarRouter.post('/encryption-key/init', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return
    if (!isOwnerRole(ctx.role)) {
      res.status(403).json({ error: 'Only org owner can initialize calendar encryption' })
      return
    }

    const wrappedKey = typeof req.body?.wrappedKey === 'string' ? req.body.wrappedKey.trim() : ''
    if (!wrappedKey) {
      res.status(400).json({ error: 'wrappedKey required' })
      return
    }

    const existing = await isCalendarKeyInitialized(ctx.organisation.id)
    if (existing) {
      res.status(409).json({ error: 'Calendar encryption already initialized' })
      return
    }

    await upsertCalendarKey(ctx.organisation.id, ctx.userId, wrappedKey)
    res.status(201).json({ ok: true })
  } catch (error) {
    console.error('[calendar] encryption-key init failed:', error)
    res.status(500).json({ error: 'Failed to initialize calendar encryption key' })
  }
})

// PUT /api/calendar/encryption-key/:userId
calendarRouter.put('/encryption-key/:userId', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const targetUserId = req.params.userId?.trim()
    const wrappedKey = typeof req.body?.wrappedKey === 'string' ? req.body.wrappedKey.trim() : ''

    if (!targetUserId || !wrappedKey) {
      res.status(400).json({ error: 'userId and wrappedKey required' })
      return
    }

    const isSelf = targetUserId === ctx.userId
    if (!isSelf && !isOwnerRole(ctx.role)) {
      res.status(403).json({ error: 'Only org owner can upload keys for other members' })
      return
    }

    await upsertCalendarKey(ctx.organisation.id, targetUserId, wrappedKey)
    res.json({ ok: true })
  } catch (error) {
    console.error('[calendar] encryption-key upload failed:', error)
    res.status(500).json({ error: 'Failed to upload calendar encryption key' })
  }
})

// GET /api/calendar/encryption-key/member-public-keys (owner only)
calendarRouter.get('/encryption-key/member-public-keys', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return
    if (!isOwnerRole(ctx.role)) {
      res.status(403).json({ error: 'Permission denied' })
      return
    }

    const keys = await listMemberVaultPublicKeys(ctx.organisation.id)
    res.json({ members: keys })
  } catch (error) {
    console.error('[calendar] member-public-keys failed:', error)
    res.status(500).json({ error: 'Failed to list member public keys' })
  }
})

// GET /api/calendar?from=&to=&assignedUserId=
calendarRouter.get('/', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const from = typeof req.query.from === 'string' ? req.query.from.trim() : ''
    const to = typeof req.query.to === 'string' ? req.query.to.trim() : ''
    if (!from || !to) {
      res.status(400).json({ error: 'from and to query params required (ISO timestamps)' })
      return
    }

    let assignedUserId =
      typeof req.query.assignedUserId === 'string' ? req.query.assignedUserId.trim() : undefined

    if (assignedUserId && !isOwnerRole(ctx.role) && assignedUserId !== ctx.userId) {
      res.status(403).json({ error: 'Cannot filter by another user schedule' })
      return
    }

    if (!assignedUserId && !isOwnerRole(ctx.role)) {
      assignedUserId = ctx.userId
    }

    const items = await listCalendarItems(ctx.organisation.id, { from, to, assignedUserId })
    res.json({ items })
  } catch (error) {
    console.error('[calendar] list failed:', error)
    res.status(500).json({ error: 'Failed to list calendar items' })
  }
})

// POST /api/calendar
calendarRouter.post('/', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const body = (req.body ?? {}) as CreateCalendarItemWireInput & {
      title?: string
      notes?: string
      patientId?: string
    }

    if (!body.type?.trim() || !body.startTime || !body.endTime) {
      res.status(400).json({ error: 'type, startTime, and endTime required' })
      return
    }

    const encryptedPayload =
      typeof body.encryptedPayload === 'string' ? body.encryptedPayload.trim() : ''
    if (!encryptedPayload) {
      res.status(400).json({ error: 'encryptedPayload required' })
      return
    }

    if (body.title || body.notes || body.patientId) {
      res.status(400).json({ error: 'Plaintext PHI fields are not accepted' })
      return
    }

    if (!(await assertCaseViewAccess(ctx, body.caseId, res))) return

    const item = await createCalendarItem(ctx.organisation.id, ctx.userId, {
      type: body.type,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
      priority: body.priority,
      assignedUserId: body.assignedUserId,
      location: body.location,
      encryptedPayload,
      caseId: body.caseId,
    })

    void recordCalendarAudit(req, ctx.organisation.id, ctx.userId, 'calendar_item_created', {
      calendarItemId: item.id,
      type: item.type,
    })
    res.status(201).json({ item })
  } catch (error) {
    console.error('[calendar] create failed:', error)
    res.status(500).json({ error: 'Failed to create calendar item' })
  }
})

// GET /api/calendar/:id
calendarRouter.get('/:id', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const item = await getCalendarItem(ctx.organisation.id, req.params.id)
    if (!item) {
      res.status(404).json({ error: 'Calendar item not found' })
      return
    }

    if (!(await canAccessItem(ctx, item))) {
      res.status(403).json({ error: 'Not allowed to view this item' })
      return
    }

    res.json({ item })
  } catch (error) {
    console.error('[calendar] get failed:', error)
    res.status(500).json({ error: 'Failed to load calendar item' })
  }
})

// PATCH /api/calendar/:id
calendarRouter.patch('/:id', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const itemId = req.params.id
    const existing = await getCalendarItem(ctx.organisation.id, itemId)
    if (!existing) {
      res.status(404).json({ error: 'Calendar item not found' })
      return
    }

    if (!(await canEditItem(ctx, existing))) {
      res.status(403).json({ error: 'Not allowed to edit this item' })
      return
    }

    const body = (req.body ?? {}) as UpdateCalendarItemWireInput & {
      title?: string
      notes?: string
      patientId?: string
      reason?: string
    }

    if (body.title || body.notes || body.patientId || body.reason) {
      res.status(400).json({ error: 'Plaintext PHI fields are not accepted' })
      return
    }

    const nextCaseId = body.caseId !== undefined ? body.caseId : undefined
    if (!(await assertCaseViewAccess(ctx, nextCaseId, res))) return

    const item = await updateCalendarItem(ctx.organisation.id, itemId, body)
    res.json({ item })
  } catch (error) {
    console.error('[calendar] update failed:', error)
    res.status(500).json({ error: 'Failed to update calendar item' })
  }
})

// POST /api/calendar/:id/reschedule
calendarRouter.post('/:id/reschedule', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const itemId = req.params.id
    const existing = await getCalendarItem(ctx.organisation.id, itemId)
    if (!existing) {
      res.status(404).json({ error: 'Calendar item not found' })
      return
    }

    if (!(await canEditItem(ctx, existing))) {
      res.status(403).json({ error: 'Not allowed to reschedule this item' })
      return
    }

    const body = (req.body ?? {}) as RescheduleCalendarInput
    if (!body.startTime || !body.endTime) {
      res.status(400).json({ error: 'startTime and endTime required' })
      return
    }

    const item = await rescheduleCalendarItem(
      ctx.organisation.id,
      itemId,
      ctx.userId,
      body.startTime,
      body.endTime,
    )

    void recordCalendarAudit(req, ctx.organisation.id, ctx.userId, 'calendar_item_rescheduled', {
      calendarItemId: item.id,
    })

    res.json({ item })
  } catch (error) {
    console.error('[calendar] reschedule failed:', error)
    res.status(500).json({ error: 'Failed to reschedule calendar item' })
  }
})

// POST /api/calendar/:id/complete
calendarRouter.post('/:id/complete', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const itemId = req.params.id
    const existing = await getCalendarItem(ctx.organisation.id, itemId)
    if (!existing) {
      res.status(404).json({ error: 'Calendar item not found' })
      return
    }

    if (!(await canEditItem(ctx, existing))) {
      res.status(403).json({ error: 'Not allowed to complete this item' })
      return
    }

    const item = await setCalendarItemStatus(ctx.organisation.id, itemId, 'completed')
    void recordCalendarAudit(req, ctx.organisation.id, ctx.userId, 'calendar_item_completed', {
      calendarItemId: item.id,
    })
    res.json({ item })
  } catch (error) {
    console.error('[calendar] complete failed:', error)
    res.status(500).json({ error: 'Failed to complete calendar item' })
  }
})

// POST /api/calendar/:id/cancel
calendarRouter.post('/:id/cancel', async (req, res) => {
  try {
    const ctx = await resolveOrgContext(req, res)
    if (!ctx) return
    if (!requireSmallPraxis(ctx, res)) return

    const itemId = req.params.id
    const existing = await getCalendarItem(ctx.organisation.id, itemId)
    if (!existing) {
      res.status(404).json({ error: 'Calendar item not found' })
      return
    }

    if (!(await canEditItem(ctx, existing))) {
      res.status(403).json({ error: 'Not allowed to cancel this item' })
      return
    }

    const item = await setCalendarItemStatus(ctx.organisation.id, itemId, 'cancelled')
    void recordCalendarAudit(req, ctx.organisation.id, ctx.userId, 'calendar_item_cancelled', {
      calendarItemId: item.id,
    })
    res.json({ item })
  } catch (error) {
    console.error('[calendar] cancel failed:', error)
    res.status(500).json({ error: 'Failed to cancel calendar item' })
  }
})

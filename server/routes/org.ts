import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { isCaseAccessLevel, normalizeCaseAccessLevel } from '../../src/data/org/caseAccessLevels'
import { normalizePermissionOverrides } from '../../src/data/org/memberPermissions'
import { isSmallPraxisInviteRole, isSmallPraxisUiRole } from '../../src/data/org/teamRoles'
import type { OrganisationRole, TherapyDiscipline } from '../../src/types/organisation'
import type { AuditAction } from '../../src/types/auditLog'
import { resolveAccountId } from '../middleware/auth'
import { recordAuditLog } from '../services/auditLog'
import {
  buildOrganisationContext,
  canViewCase,
  hasPermission,
  ORG_HEADER,
} from '../services/orgPermissions'
import { isOrgStoreConfigured, provisionPersonalOrganisation, listModuleAccessForUser } from '../services/orgStore'
import { isEnterpriseOrgHierarchyEnabled, isEnterpriseTier } from '../utils/featureFlags'
import {
  acceptInvitation,
  claimCaseOwner,
  createInvitation,
  deactivateMember,
  getCaseAccessSnapshot,
  getTeamSnapshot,
  listCaseAccessGrants,
  previewInvitation,
  revokeInvitation,
  setCaseAccessGrantValidated,
  updateMember,
  updateOrganisationName,
  upgradeToSmallPraxis,
  setDevOrganisationTier,
  canManageCaseAccess,
} from '../services/orgTeamStore'
import { deleteCaseVaultKeyForUser } from '../services/orgCaseVaultStore'
import { orgCaseVaultRouter } from './orgCaseVault'

export const orgRouter: Router = createRouter()

orgRouter.use(orgCaseVaultRouter)

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function requireSupabase(res: Response): boolean {
  if (!isOrgStoreConfigured()) {
    res.status(503).json({
      error: 'Organisation features require Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

function appOrigin(req: Request): string {
  const origin = req.get('origin')
  if (origin) return origin
  const referer = req.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {
      // ignore
    }
  }
  return 'http://localhost:5173'
}

async function recordOrgAudit(
  req: Request,
  organisationId: string,
  userId: string,
  action: AuditAction,
  options: {
    caseId?: string | null
    documentId?: string | null
    metadata?: Record<string, unknown>
  } = {},
): Promise<void> {
  await recordAuditLog({
    organisationId,
    userId,
    action,
    caseId: options.caseId,
    documentId: options.documentId,
    metadata: options.metadata,
    req,
  })
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

async function requirePermission(
  req: Request,
  res: Response,
  permission: Parameters<typeof hasPermission>[2],
): Promise<Awaited<ReturnType<typeof resolveOrgContext>> | null> {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return null

  const allowed = await hasPermission(ctx.userId, ctx.organisation.id, permission)
  if (!allowed) {
    res.status(403).json({ error: 'Permission denied' })
    return null
  }

  return ctx
}

orgRouter.get('/context', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!requireSupabase(res)) return

  try {
    const displayName =
      typeof req.query.displayName === 'string' ? req.query.displayName : null
    const ctx = await buildOrganisationContext(userId, req.headers[ORG_HEADER], displayName)

    if (!ctx.organisation || !ctx.role) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    let moduleAccess: Awaited<ReturnType<typeof listModuleAccessForUser>> | undefined
    if (isEnterpriseOrgHierarchyEnabled() && isEnterpriseTier(ctx.organisation.tier)) {
      moduleAccess = await listModuleAccessForUser(userId, ctx.organisation.id)
    }

    res.json({
      organisation: ctx.organisation,
      role: ctx.role,
      permissions: ctx.permissions,
      member: ctx.member,
      ...(moduleAccess ? { moduleAccess } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load organisation context'
    res.status(500).json({ error: message })
  }
})

orgRouter.post('/provision', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!requireSupabase(res)) return

  try {
    const displayName =
      typeof req.body?.displayName === 'string' ? req.body.displayName : null
    await provisionPersonalOrganisation(userId, displayName)
    const ctx = await buildOrganisationContext(userId, req.headers[ORG_HEADER], displayName)

    res.json({
      organisation: ctx.organisation,
      role: ctx.role,
      permissions: ctx.permissions,
      provisioned: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to provision organisation'
    res.status(500).json({ error: message })
  }
})

orgRouter.get('/team', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  try {
    const snapshot = await getTeamSnapshot(ctx.organisation.id, appOrigin(req))
    if (!snapshot) {
      res.status(404).json({ error: 'Organisation not found' })
      return
    }
    res.json(snapshot)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load team'
    res.status(500).json({ error: message })
  }
})

orgRouter.patch('/', async (req, res) => {
  const ctx = await requirePermission(req, res, 'org.manage')
  if (!ctx) return

  const name = typeof req.body?.name === 'string' ? req.body.name : null
  if (!name?.trim()) {
    res.status(400).json({ error: 'name required' })
    return
  }

  try {
    const organisation = await updateOrganisationName(ctx.organisation.id, name)
    res.json({ organisation })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update organisation'
    res.status(500).json({ error: message })
  }
})

orgRouter.post('/upgrade-small-praxis', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  if (ctx.organisation.tier !== 'single_use') {
    res.status(400).json({ error: 'Organisation is not eligible for Praxis upgrade' })
    return
  }

  const isOwner = ctx.role === 'single_owner' || ctx.role === 'org_owner'
  if (!isOwner) {
    res.status(403).json({ error: 'Only the organisation owner can upgrade' })
    return
  }

  try {
    const name = typeof req.body?.name === 'string' ? req.body.name : null
    const organisation = await upgradeToSmallPraxis(ctx.organisation.id, ctx.userId, name)
    const refreshed = await buildOrganisationContext(ctx.userId, req.headers[ORG_HEADER])
    res.json({
      organisation,
      role: refreshed.role,
      permissions: refreshed.permissions,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upgrade organisation'
    res.status(500).json({ error: message })
  }
})

orgRouter.post('/invites', async (req, res) => {
  const ctx = await requirePermission(req, res, 'users.invite')
  if (!ctx) return

  if (ctx.organisation.tier !== 'small_praxis') {
    res.status(400).json({ error: 'Invites require Small Praxis mode' })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : null
  const invitedName = typeof req.body?.invitedName === 'string' ? req.body.invitedName : null
  const role = typeof req.body?.role === 'string' ? req.body.role : null
  const therapyDiscipline =
    typeof req.body?.therapyDiscipline === 'string' ? req.body.therapyDiscipline : null
  const therapyDisciplineCustom =
    typeof req.body?.therapyDisciplineCustom === 'string'
      ? req.body.therapyDisciplineCustom
      : null

  if (!email?.trim()) {
    res.status(400).json({ error: 'email required' })
    return
  }
  if (!role || !isSmallPraxisInviteRole(role)) {
    res.status(400).json({ error: 'Invalid invite role' })
    return
  }

  try {
    const result = await createInvitation(
      ctx.organisation.id,
      email,
      role,
      ctx.userId,
      appOrigin(req),
      {
        invitedName,
        discipline: {
          therapyDiscipline: therapyDiscipline as TherapyDiscipline | null,
          therapyDisciplineCustom,
        },
      },
    )
    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'user_invited', {
      metadata: {
        email: result.invitation.email,
        invitedName: result.invitation.invitedName,
        role: result.invitation.role,
        invitationId: result.invitation.id,
      },
    })
    res.status(201).json({
      inviteUrl: result.inviteUrl,
      invitation: result.invitation,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create invitation'
    const status =
      message.includes('Maximum') || message.includes('already exists') ? 409
      : message.includes('therapyDiscipline') ? 400
      : 500
    res.status(status).json({ error: message })
  }
})

orgRouter.delete('/invites/:id', async (req, res) => {
  const ctx = await requirePermission(req, res, 'users.invite')
  if (!ctx) return

  try {
    await revokeInvitation(ctx.organisation.id, req.params.id)
    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'invitation_revoked', {
      metadata: { invitationId: req.params.id },
    })
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke invitation'
    res.status(500).json({ error: message })
  }
})

orgRouter.post('/invites/accept', async (req, res) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!requireSupabase(res)) return

  const token = typeof req.body?.token === 'string' ? req.body.token : null
  if (!token?.trim()) {
    res.status(400).json({ error: 'token required' })
    return
  }

  try {
    const { getKbSupabaseAdmin } = await import('../services/kbSupabaseAdmin')
    const admin = getKbSupabaseAdmin()
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId)
    if (authError) throw new Error(authError.message)

    const userEmail = authUser?.user?.email ?? null
    const result = await acceptInvitation(token, userId, userEmail)
    await recordOrgAudit(req, result.organisation.id, userId, 'invitation_accepted', {
      metadata: { role: result.member.role, memberId: result.member.id },
    })
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to accept invitation'
    const status =
      message.includes('not found') || message.includes('expired') || message.includes('match')
        ? 400
        : message.includes('Maximum')
          ? 409
          : 500
    res.status(status).json({ error: message })
  }
})

orgRouter.patch('/members/:id', async (req, res) => {
  const ctx = await requirePermission(req, res, 'roles.manage')
  if (!ctx) return

  if (ctx.organisation.tier !== 'small_praxis') {
    res.status(400).json({ error: 'Member editing requires Small Praxis mode' })
    return
  }

  const role =
    typeof req.body?.role === 'string' ? (req.body.role as OrganisationRole) : undefined
  const therapyDiscipline =
    typeof req.body?.therapyDiscipline === 'string' ? req.body.therapyDiscipline : undefined
  const therapyDisciplineCustom =
    typeof req.body?.therapyDisciplineCustom === 'string'
      ? req.body.therapyDisciplineCustom
      : undefined
  const permissionOverrides =
    req.body?.permissionOverrides !== undefined
      ? normalizePermissionOverrides(req.body.permissionOverrides)
      : undefined

  let aiQuotaMonthly: number | null | undefined
  let resetAiQuotaMonthly = false
  if (req.body?.resetAiQuotaMonthly === true) {
    resetAiQuotaMonthly = true
  } else if (req.body?.aiQuotaMonthly === null) {
    aiQuotaMonthly = null
  } else if (typeof req.body?.aiQuotaMonthly === 'number') {
    aiQuotaMonthly = Math.max(0, Math.floor(req.body.aiQuotaMonthly))
  }

  if (
    !role &&
    therapyDiscipline === undefined &&
    therapyDisciplineCustom === undefined &&
    permissionOverrides === undefined &&
    aiQuotaMonthly === undefined &&
    !resetAiQuotaMonthly
  ) {
    res.status(400).json({ error: 'No updates provided' })
    return
  }

  if (role && !isSmallPraxisUiRole(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }

  try {
    const member = await updateMember(ctx.organisation.id, req.params.id, {
      ...(role ? { role } : {}),
      ...(therapyDiscipline !== undefined
        ? { therapyDiscipline: therapyDiscipline as TherapyDiscipline | null }
        : {}),
      ...(therapyDisciplineCustom !== undefined ? { therapyDisciplineCustom } : {}),
      ...(permissionOverrides !== undefined ? { permissionOverrides } : {}),
      ...(resetAiQuotaMonthly ? { resetAiQuotaMonthly: true } : {}),
      ...(aiQuotaMonthly !== undefined ? { aiQuotaMonthly } : {}),
    })

    const auditMeta: Record<string, unknown> = { memberId: member.id, role: member.role }
    if (permissionOverrides !== undefined) {
      auditMeta.permissionOverrides = member.permissionOverrides
    }
    if (aiQuotaMonthly !== undefined) {
      auditMeta.aiQuotaMonthly = member.aiQuotaMonthly ?? null
    }

    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'permission_changed', {
      metadata: auditMeta,
    })
    res.json({ member })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update member'
    const status =
      message.includes('therapyDiscipline') ||
      message.includes('therapyDisciplineCustom') ||
      message.includes('medication.approve')
        ? 400
        : message.includes('last owner') || message.includes('already has an owner')
          ? 409
          : message.includes('No updates')
            ? 400
            : 500
    res.status(status).json({ error: message })
  }
})

orgRouter.delete('/members/:id', async (req, res) => {
  const ctx = await requirePermission(req, res, 'users.remove')
  if (!ctx) return

  try {
    await deactivateMember(ctx.organisation.id, req.params.id, ctx.userId)
    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'member_deactivated', {
      metadata: { memberId: req.params.id },
    })
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deactivate member'
    const status = message.includes('last owner') || message.includes('yourself') ? 409 : 500
    res.status(status).json({ error: message })
  }
})

orgRouter.get('/case-access/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = req.params.caseId?.trim()
  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }

  try {
    const canManage = await canManageCaseAccess(
      ctx.organisation.id,
      caseId,
      ctx.userId,
      ctx.role!,
    )
    const canView = await canViewCase(ctx.userId, ctx.organisation.id, caseId)
    if (!canManage && !canView) {
      res.status(403).json({ error: 'Permission denied' })
      return
    }

    const snapshot = await getCaseAccessSnapshot(
      ctx.organisation.id,
      caseId,
      ctx.userId,
      ctx.role!,
    )
    res.json(snapshot)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load case access'
    res.status(500).json({ error: message })
  }
})

orgRouter.put('/case-access/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!ctx.role) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  const caseId = req.params.caseId?.trim()
  const targetUserId = typeof req.body?.userId === 'string' ? req.body.userId : null
  const levelRaw = typeof req.body?.level === 'string' ? req.body.level : null

  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }
  if (!targetUserId?.trim()) {
    res.status(400).json({ error: 'userId required' })
    return
  }
  if (!levelRaw || !isCaseAccessLevel(normalizeCaseAccessLevel(levelRaw))) {
    res.status(400).json({ error: 'Invalid access level' })
    return
  }

  const level = normalizeCaseAccessLevel(levelRaw)

  try {
    const { grant, oldLevel } = await setCaseAccessGrantValidated(
      ctx.organisation.id,
      caseId,
      targetUserId,
      level,
      ctx.userId,
      ctx.role,
    )

    if (
      ctx.organisation.tier === 'small_praxis' &&
      level === 'no_access' &&
      oldLevel !== 'no_access'
    ) {
      try {
        await deleteCaseVaultKeyForUser(ctx.organisation.id, caseId, targetUserId)
      } catch {
        // Non-fatal — access revoked even if key row missing
      }
    }

    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'case_access_changed', {
      caseId,
      metadata: {
        targetUserId,
        oldLevel,
        newLevel: level,
        changedBy: ctx.userId,
      },
    })
    const snapshot = await getCaseAccessSnapshot(
      ctx.organisation.id,
      caseId,
      ctx.userId,
      ctx.role,
    )
    res.json({ grant, snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set case access'
    const status = message.includes('Permission denied') || message.includes('not allowed') ? 403 : 500
    res.status(status).json({ error: message })
  }
})

orgRouter.post('/case-access/claim-owner', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }

  try {
    const grant = await claimCaseOwner(ctx.organisation.id, caseId, ctx.userId)
    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'case_access_changed', {
      caseId,
      metadata: {
        targetUserId: ctx.userId,
        oldLevel: 'no_access',
        newLevel: 'full_access',
        changedBy: ctx.userId,
        claimedOwner: true,
      },
    })
    const snapshot = await getCaseAccessSnapshot(
      ctx.organisation.id,
      caseId,
      ctx.userId,
      ctx.role!,
    )
    res.json({ grant, snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim case owner'
    const status = message.includes('already assigned') ? 409 : 500
    res.status(status).json({ error: message })
  }
})

/** Bulk grants list — team settings matrix (legacy). */
orgRouter.get('/case-access', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const canManage =
    (await hasPermission(ctx.userId, ctx.organisation.id, 'org.manage')) ||
    (await hasPermission(ctx.userId, ctx.organisation.id, 'roles.manage'))

  if (!canManage) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const grants = await listCaseAccessGrants(ctx.organisation.id)
    res.json({ grants })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load case access'
    res.status(500).json({ error: message })
  }
})

orgRouter.put('/case-access', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!ctx.role) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId : null
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : null
  const levelRaw = typeof req.body?.level === 'string' ? req.body.level : null

  if (!caseId?.trim() || !userId?.trim()) {
    res.status(400).json({ error: 'caseId and userId required' })
    return
  }
  if (!levelRaw || !isCaseAccessLevel(normalizeCaseAccessLevel(levelRaw))) {
    res.status(400).json({ error: 'Invalid access level' })
    return
  }

  const level = normalizeCaseAccessLevel(levelRaw)

  try {
    const { grant, oldLevel } = await setCaseAccessGrantValidated(
      ctx.organisation.id,
      caseId,
      userId,
      level,
      ctx.userId,
      ctx.role,
    )

    if (
      ctx.organisation.tier === 'small_praxis' &&
      level === 'no_access' &&
      oldLevel !== 'no_access'
    ) {
      try {
        await deleteCaseVaultKeyForUser(ctx.organisation.id, caseId, userId)
      } catch {
        // Non-fatal
      }
    }

    await recordOrgAudit(req, ctx.organisation.id, ctx.userId, 'case_access_changed', {
      caseId,
      metadata: {
        targetUserId: userId,
        oldLevel,
        newLevel: level,
        changedBy: ctx.userId,
      },
    })
    res.json({ grant })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set case access'
    const status = message.includes('Permission denied') || message.includes('not allowed') ? 403 : 500
    res.status(status).json({ error: message })
  }
})

/** Public invite preview — token validity only, no member data. */
orgRouter.get('/invites/preview/:token', async (req, res) => {
  if (!requireSupabase(res)) return

  try {
    const preview = await previewInvitation(req.params.token)
    if (!preview) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    res.json({
      email: preview.email,
      role: preview.role,
      organisationName: preview.organisationName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to preview invitation'
    res.status(500).json({ error: message })
  }
})

/** Dev-only organisation tier toggle — hidden in production (404). */
orgRouter.post('/dev/set-tier', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const tier = req.body?.tier
  if (tier !== 'single_use' && tier !== 'small_praxis') {
    res.status(400).json({ error: "tier must be 'single_use' or 'small_praxis'" })
    return
  }

  if (!ctx.organisation.isPersonal) {
    res.status(400).json({ error: 'Dev tier toggle only applies to personal organisations' })
    return
  }

  const isOwner = ctx.role === 'single_owner' || ctx.role === 'org_owner'
  if (!isOwner) {
    res.status(403).json({ error: 'Only the organisation owner can change dev tier' })
    return
  }

  try {
    const organisation = await setDevOrganisationTier(ctx.organisation.id, ctx.userId, tier)
    const refreshed = await buildOrganisationContext(ctx.userId, req.headers[ORG_HEADER])
    res.json({
      organisation,
      role: refreshed.role,
      permissions: refreshed.permissions,
      member: refreshed.member,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set dev tier'
    res.status(500).json({ error: message })
  }
})

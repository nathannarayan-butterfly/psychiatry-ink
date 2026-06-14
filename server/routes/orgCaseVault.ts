import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AuditAction } from '../../src/types/auditLog'
import { resolveAccountId } from '../middleware/auth'
import { recordAuditLog } from '../services/auditLog'
import {
  deleteCaseVaultKeyForUser,
  getCaseOwnerUserId,
  getCaseVaultKeyForUser,
  getCaseVaultSnapshot,
  getMemberVaultPublicKey,
  isCaseVaultInitialized,
  upsertCaseVaultKey,
  upsertCaseVaultSnapshot,
  upsertMemberVaultPublicKey,
} from '../services/orgCaseVaultStore'
import {
  buildOrganisationContext,
  canEditCase,
  canViewCase,
  ORG_HEADER,
} from '../services/orgPermissions'
import { isOrgStoreConfigured } from '../services/orgStore'
import { canManageCaseAccess } from '../services/orgTeamStore'

export const orgCaseVaultRouter: Router = createRouter()

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
    res.status(400).json({ error: 'Org case vault requires Small Praxis mode' })
    return false
  }
  return true
}

async function recordVaultAudit(
  req: Request,
  organisationId: string,
  userId: string,
  action: AuditAction,
  caseId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAuditLog({
    organisationId,
    userId,
    action,
    caseId,
    metadata,
    req,
  })
}

/** Register member RSA public key for vault key wrapping. */
orgCaseVaultRouter.put('/vault-public-key', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const publicKeyJwk = req.body?.publicKeyJwk as JsonWebKey | undefined
  if (!publicKeyJwk || typeof publicKeyJwk !== 'object') {
    res.status(400).json({ error: 'publicKeyJwk required' })
    return
  }

  try {
    const row = await upsertMemberVaultPublicKey(ctx.organisation.id, ctx.userId, publicKeyJwk)
    res.json({ ok: true, keyVersion: row.keyVersion, updatedAt: row.updatedAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register vault public key'
    res.status(500).json({ error: message })
  }
})

/** Fetch a member's vault public key (case managers or self). */
orgCaseVaultRouter.get('/vault-public-key/:userId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const targetUserId = req.params.userId?.trim()
  const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : null

  if (!targetUserId) {
    res.status(400).json({ error: 'userId required' })
    return
  }

  const isSelf = targetUserId === ctx.userId
  let canFetch = isSelf
  if (!canFetch && caseId) {
    canFetch = await canManageCaseAccess(
      ctx.organisation.id,
      caseId,
      ctx.userId,
      ctx.role!,
    )
  }

  if (!canFetch) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const row = await getMemberVaultPublicKey(ctx.organisation.id, targetUserId)
    if (!row) {
      res.status(404).json({ error: 'Vault public key not registered' })
      return
    }
    res.json({
      userId: row.userId,
      publicKeyJwk: row.publicKeyJwk,
      keyVersion: row.keyVersion,
      updatedAt: row.updatedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load vault public key'
    res.status(500).json({ error: message })
  }
})

/** Owner initializes case vault key + optional first snapshot. */
orgCaseVaultRouter.post('/case-vault/init', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
  const wrappedKey =
    typeof req.body?.wrappedKey === 'string' ? req.body.wrappedKey.trim() : null

  if (!caseId || !wrappedKey) {
    res.status(400).json({ error: 'caseId and wrappedKey required' })
    return
  }

  const canManage = await canManageCaseAccess(
    ctx.organisation.id,
    caseId,
    ctx.userId,
    ctx.role!,
  )
  if (!canManage) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const already = await isCaseVaultInitialized(ctx.organisation.id, caseId)
    if (already) {
      res.status(409).json({ error: 'Case vault already initialized' })
      return
    }

    await upsertCaseVaultKey(ctx.organisation.id, caseId, ctx.userId, wrappedKey)

    const snapshotBody = req.body?.snapshot as
      | { ciphertext?: string; iv?: string; version?: number; payloadVersion?: number }
      | undefined

    let snapshot = null
    if (
      snapshotBody?.ciphertext?.trim() &&
      snapshotBody?.iv?.trim()
    ) {
      snapshot = await upsertCaseVaultSnapshot(ctx.organisation.id, caseId, {
        ciphertext: snapshotBody.ciphertext.trim(),
        iv: snapshotBody.iv.trim(),
        version: snapshotBody.version ?? 1,
        payloadVersion: snapshotBody.payloadVersion ?? null,
        updatedBy: ctx.userId,
      })
      await recordVaultAudit(req, ctx.organisation.id, ctx.userId, 'case_vault_snapshot_saved', caseId, {
        initialized: true,
      })
    }

    res.status(201).json({ ok: true, snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize case vault'
    res.status(500).json({ error: message })
  }
})

/** Get wrapped case vault key for current user. */
orgCaseVaultRouter.get('/case-vault-key/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }

  const canView = await canViewCase(ctx.userId, ctx.organisation.id, caseId)
  if (!canView) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const row = await getCaseVaultKeyForUser(ctx.organisation.id, caseId, ctx.userId)
    if (!row) {
      res.status(404).json({ error: 'Case vault key not found' })
      return
    }
    res.json({
      wrappedKey: row.wrappedKey,
      keyVersion: row.keyVersion,
      createdAt: row.createdAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load case vault key'
    res.status(500).json({ error: message })
  }
})

/** Owner/admin uploads wrapped key for a member (on grant). */
orgCaseVaultRouter.put('/case-vault-key/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  const targetUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : null
  const wrappedKey =
    typeof req.body?.wrappedKey === 'string' ? req.body.wrappedKey.trim() : null

  if (!caseId || !targetUserId || !wrappedKey) {
    res.status(400).json({ error: 'userId and wrappedKey required' })
    return
  }

  const canManage = await canManageCaseAccess(
    ctx.organisation.id,
    caseId,
    ctx.userId,
    ctx.role!,
  )
  if (!canManage) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const initialized = await isCaseVaultInitialized(ctx.organisation.id, caseId)
    if (!initialized) {
      res.status(409).json({ error: 'Case vault not initialized' })
      return
    }

    const row = await upsertCaseVaultKey(
      ctx.organisation.id,
      caseId,
      targetUserId,
      wrappedKey,
    )

    await recordVaultAudit(req, ctx.organisation.id, ctx.userId, 'case_vault_key_granted', caseId, {
      targetUserId,
    })

    res.json({
      ok: true,
      userId: row.userId,
      keyVersion: row.keyVersion,
      createdAt: row.createdAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store case vault key'
    res.status(500).json({ error: message })
  }
})

/** Revoke wrapped key for a member. */
orgCaseVaultRouter.delete('/case-vault-key/:caseId/:userId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  const targetUserId = req.params.userId?.trim()
  if (!caseId || !targetUserId) {
    res.status(400).json({ error: 'caseId and userId required' })
    return
  }

  const canManage = await canManageCaseAccess(
    ctx.organisation.id,
    caseId,
    ctx.userId,
    ctx.role!,
  )
  if (!canManage) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    await deleteCaseVaultKeyForUser(ctx.organisation.id, caseId, targetUserId)
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke case vault key'
    res.status(500).json({ error: message })
  }
})

/** Get encrypted org case vault snapshot. */
orgCaseVaultRouter.get('/case-vault/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }

  const canView = await canViewCase(ctx.userId, ctx.organisation.id, caseId)
  if (!canView) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const row = await getCaseVaultSnapshot(ctx.organisation.id, caseId)
    if (!row) {
      res.status(404).json({ error: 'Case vault snapshot not found' })
      return
    }
    res.json({
      ciphertext: row.ciphertext,
      iv: row.iv,
      version: row.version,
      payloadVersion: row.payloadVersion,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load case vault snapshot'
    res.status(500).json({ error: message })
  }
})

/** Save encrypted org case vault snapshot. */
orgCaseVaultRouter.put('/case-vault/:caseId', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  const ciphertext =
    typeof req.body?.ciphertext === 'string' ? req.body.ciphertext.trim() : null
  const iv = typeof req.body?.iv === 'string' ? req.body.iv.trim() : null

  if (!caseId || !ciphertext || !iv) {
    res.status(400).json({ error: 'ciphertext and iv required' })
    return
  }

  const canEdit = await canEditCase(ctx.userId, ctx.organisation.id, caseId)
  if (!canEdit) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const hasKey = await getCaseVaultKeyForUser(ctx.organisation.id, caseId, ctx.userId)
    if (!hasKey) {
      res.status(403).json({ error: 'Case vault key not available for this user' })
      return
    }

    const row = await upsertCaseVaultSnapshot(ctx.organisation.id, caseId, {
      ciphertext,
      iv,
      version: typeof req.body?.version === 'number' ? req.body.version : 1,
      payloadVersion:
        typeof req.body?.payloadVersion === 'number' ? req.body.payloadVersion : null,
      updatedBy: ctx.userId,
    })

    await recordVaultAudit(req, ctx.organisation.id, ctx.userId, 'case_vault_snapshot_saved', caseId)

    res.json({
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save case vault snapshot'
    res.status(500).json({ error: message })
  }
})

/** Case vault status for client bootstrap. */
orgCaseVaultRouter.get('/case-vault/:caseId/status', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return
  if (!requireSmallPraxis(ctx, res)) return

  const caseId = req.params.caseId?.trim()
  if (!caseId) {
    res.status(400).json({ error: 'caseId required' })
    return
  }

  const canView = await canViewCase(ctx.userId, ctx.organisation.id, caseId)
  if (!canView) {
    res.status(403).json({ error: 'Permission denied' })
    return
  }

  try {
    const [initialized, hasKey, snapshot, ownerUserId] = await Promise.all([
      isCaseVaultInitialized(ctx.organisation.id, caseId),
      getCaseVaultKeyForUser(ctx.organisation.id, caseId, ctx.userId),
      getCaseVaultSnapshot(ctx.organisation.id, caseId),
      getCaseOwnerUserId(ctx.organisation.id, caseId),
    ])

    res.json({
      initialized,
      hasWrappedKey: Boolean(hasKey),
      hasSnapshot: Boolean(snapshot),
      snapshotUpdatedAt: snapshot?.updatedAt ?? null,
      caseOwnerUserId: ownerUserId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load case vault status'
    res.status(500).json({ error: message })
  }
})

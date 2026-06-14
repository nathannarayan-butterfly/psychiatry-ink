import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import {
  getKbSubstanceById,
  listKbSubstances,
  updateKbSubstance,
} from '../services/kbNormalizedStore'
import { publishAllKbSubstances, publishKbSubstance } from '../services/kbPublish'
import { listKbContributions } from '../services/kbContributionsStore'
import { isKbAdminConfigured } from '../services/kbSupabaseAdmin'
import { hasKbAdminRole } from '../services/kbAdminAuth'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { recordKbAdminAudit } from '../services/auditLog'
import {
  handleAdminConfig,
  handleCastVote,
  handleCreateDiscussion,
  handleGetVoteSummary,
  handleListDiscussions,
  handlePublishContribution,
  handleRejectContribution,
} from './kbAdminContributions'

declare module 'express-serve-static-core' {
  interface Request {
    /** Resolved KB admin actor, set by requireKbAdmin once gating passes. */
    kbAdminActorId?: string
  }
}

export const kbAdminRouter: Router = createRouter()

/** Non-PHI scalar summary of a substance for audit before/after fields. */
function summarizeSubstance(substance: unknown): Record<string, unknown> | null {
  if (!substance || typeof substance !== 'object') return null
  const s = substance as Record<string, unknown>
  return {
    id: s.id ?? null,
    genericName: s.genericName ?? null,
    status: s.status ?? null,
    reviewStatus: s.reviewStatus ?? null,
    needsClinicalReview: s.needsClinicalReview ?? null,
  }
}

/**
 * KB Admin API is DISABLED by default (secure-by-default). It is enabled only
 * when `ENABLE_KB_ADMIN_API=true` (preferred) or the legacy alias
 * `KB_ADMIN_API_ENABLED=true`. An explicit `…=false` on either flag wins.
 */
export function kbAdminEnabled(): boolean {
  const next = process.env.ENABLE_KB_ADMIN_API
  const legacy = process.env.KB_ADMIN_API_ENABLED
  if (next === 'false' || legacy === 'false') return false
  return next === 'true' || legacy === 'true'
}

/**
 * Gate every KB admin endpoint. Ordering (defence in depth):
 *   1. env flag not enabled            → 404 (hide the admin surface)
 *   2. unauthenticated                 → 401
 *   3. authenticated but not admin     → 403
 *   4. service role key not configured → 503
 * Returns the resolved actor id, or null when a response was already sent.
 */
async function requireKbAdmin(req: Request, res: Response): Promise<string | null> {
  if (!kbAdminEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return null
  }
  const userId = requireRouteAuth(req, res)
  if (!userId) return null
  const allowed = await hasKbAdminRole(req, userId)
  if (!allowed) {
    res.status(403).json({
      error: 'KB admin access denied: requires owner/admin/kb_admin role.',
    })
    return null
  }
  if (!isKbAdminConfigured()) {
    res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.' })
    return null
  }
  req.kbAdminActorId = userId
  return userId
}

kbAdminRouter.get('/status', (_req, res) => {
  res.json({
    enabled: kbAdminEnabled(),
    supabaseConfigured: isKbAdminConfigured(),
  })
})

kbAdminRouter.get('/substances', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  try {
    const substances = await listKbSubstances({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      reviewStatus:
        typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : undefined,
    })
    res.json({ substances })
  } catch (error) {
    console.error('[kb-admin] list failed:', error)
    res.status(500).json({ error: 'Failed to list substances' })
  }
})

kbAdminRouter.post('/substances/approve-all', async (req, res) => {
  const actorId = await requireKbAdmin(req, res)
  if (!actorId) return
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const category = typeof req.query.category === 'string' ? req.query.category : undefined
    const reviewStatus =
      typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : undefined

    const filters: { status?: string; category?: string; reviewStatus?: string } = {}
    if (category) filters.category = category
    if (status) filters.status = status
    if (reviewStatus) filters.reviewStatus = reviewStatus

    const summary = await publishAllKbSubstances(filters)
    for (const item of summary.failed) {
      console.error(`[kb-admin] approve-all failed for ${item.genericName}:`, item.error)
    }

    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'substance.approve-all',
      entityType: 'kb_substance',
      afterSummary: {
        total: summary.total,
        succeeded: summary.succeeded?.length ?? null,
        skipped: summary.skipped?.length ?? null,
        failed: summary.failed?.length ?? null,
        filters,
      },
      source: 'admin',
      req,
    })

    res.json({ summary })
  } catch (error) {
    console.error('[kb-admin] approve-all failed:', error)
    res.status(500).json({ error: 'Failed to approve all substances' })
  }
})

kbAdminRouter.get('/contributions', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
    const contributions = await listKbContributions({
      status: status as 'pending' | 'accepted' | 'rejected' | 'modified',
      limit: 200,
    })
    res.json({ contributions })
  } catch (error) {
    console.error('[kb-admin] list contributions failed:', error)
    res.status(500).json({ error: 'Failed to list contributions' })
  }
})

kbAdminRouter.get('/substances/:id', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  try {
    const detail = await getKbSubstanceById(req.params.id)
    if (!detail) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] get failed:', error)
    res.status(500).json({ error: 'Failed to load substance' })
  }
})

kbAdminRouter.patch('/substances/:id', async (req, res) => {
  const actorId = await requireKbAdmin(req, res)
  if (!actorId) return
  try {
    const before = await getKbSubstanceById(req.params.id)
    const body = req.body ?? {}
    await updateKbSubstance(req.params.id, body, body.revisionType ?? 'manual_edit')
    const detail = await getKbSubstanceById(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'substance.update',
      entityType: 'kb_substance',
      entityId: req.params.id,
      beforeSummary: summarizeSubstance(before),
      afterSummary: summarizeSubstance(detail),
      source: 'manual',
      req,
    })
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] patch failed:', error)
    res.status(500).json({ error: 'Failed to update substance' })
  }
})

kbAdminRouter.post('/substances/:id/publish', async (req, res) => {
  const actorId = await requireKbAdmin(req, res)
  if (!actorId) return
  try {
    const detail = await getKbSubstanceById(req.params.id)
    if (!detail) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    let projectedDrugId: string
    try {
      projectedDrugId = await publishKbSubstance(req.params.id)
    } catch (projErr) {
      console.error('[kb-admin] projection failed after publish:', projErr)
      const afterUpdate = await getKbSubstanceById(req.params.id)
      res.status(500).json({
        error: 'Published in kb_substances but JSONB projection failed',
        substance: afterUpdate,
        projectionError: projErr instanceof Error ? projErr.message : String(projErr),
      })
      return
    }
    const updated = await getKbSubstanceById(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'substance.publish',
      entityType: 'kb_substance',
      entityId: req.params.id,
      beforeSummary: summarizeSubstance(detail),
      afterSummary: { ...summarizeSubstance(updated), projectedDrugId },
      source: 'admin',
      req,
    })
    res.json({ substance: updated, projectedDrugId })
  } catch (error) {
    console.error('[kb-admin] publish failed:', error)
    res.status(500).json({ error: 'Failed to publish' })
  }
})

kbAdminRouter.post('/substances/:id/archive', async (req, res) => {
  const actorId = await requireKbAdmin(req, res)
  if (!actorId) return
  try {
    await updateKbSubstance(req.params.id, { status: 'archived' }, 'archive')
    const detail = await getKbSubstanceById(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'substance.archive',
      entityType: 'kb_substance',
      entityId: req.params.id,
      afterSummary: summarizeSubstance(detail),
      source: 'admin',
      req,
    })
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] archive failed:', error)
    res.status(500).json({ error: 'Failed to archive' })
  }
})

kbAdminRouter.post('/substances/:id/approve', async (req, res) => {
  const actorId = await requireKbAdmin(req, res)
  if (!actorId) return
  try {
    await updateKbSubstance(
      req.params.id,
      { reviewStatus: 'approved', status: 'reviewed', needsClinicalReview: false },
      'approve',
    )
    const detail = await getKbSubstanceById(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'substance.approve',
      entityType: 'kb_substance',
      entityId: req.params.id,
      afterSummary: summarizeSubstance(detail),
      source: 'admin',
      req,
    })
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] approve failed:', error)
    res.status(500).json({ error: 'Failed to approve' })
  }
})

kbAdminRouter.get('/config', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  handleAdminConfig(req, res)
})

kbAdminRouter.get('/discussions', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handleListDiscussions(req, res)
})
kbAdminRouter.post('/discussions', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handleCreateDiscussion(req, res)
})

kbAdminRouter.get('/contributions/:contributionId/votes', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handleGetVoteSummary(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/votes', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handleCastVote(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/publish', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handlePublishContribution(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/reject', async (req, res) => {
  if (!(await requireKbAdmin(req, res))) return
  await handleRejectContribution(req, res)
})

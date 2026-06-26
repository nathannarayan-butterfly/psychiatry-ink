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
import { isKbSystemAdmin } from '../services/kbAdminAuth'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { recordKbAdminAudit } from '../services/auditLog'
import {
  adminDeleteKnowledgeBaseDrug,
  adminDeletePreparation,
  adminUpsertKnowledgeBaseDrugs,
  adminUpsertPreparations,
} from '../services/kbLegacyJsonbStore'
import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
} from '../../src/types/knowledgeBase'
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
 * Gate destructive / global KB operations (publish, approve, archive, delete,
 * contribution review). These require the platform **Knowledge Base admin** —
 * the only elevated role over the global KB. Ordering (defence in depth):
 *   1. unauthenticated                 → 401
 *   2. authenticated but not KB admin  → 403
 *   3. service role key not configured → 503
 * Returns the resolved actor id, or null when a response was already sent.
 */
function requireSystemAdmin(req: Request, res: Response): string | null {
  const userId = requireRouteAuth(req, res)
  if (!userId) return null
  if (!isKbSystemAdmin(userId)) {
    res.status(403).json({
      error: 'KB admin access denied: requires the platform Knowledge Base admin role.',
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

/**
 * Gate the KB editing write endpoints (legacy JSONB drugs / preparations).
 *
 * Any authenticated user may edit KB content — there is no longer a KB-admin
 * tier. These service-role writes stand in for the direct browser writes the
 * secure RLS blocks for the anon client, so they still require a verified
 * identity:
 *   1. unauthenticated                 → 401
 *   2. service role key not configured → 503
 * Returns the resolved actor id, or null when a response was already sent.
 */
function requireKbEditor(req: Request, res: Response): string | null {
  const userId = requireRouteAuth(req, res)
  if (!userId) return null
  if (!isKbAdminConfigured()) {
    res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.' })
    return null
  }
  req.kbAdminActorId = userId
  return userId
}

// Bootstrap probe used by the Knowledge Base admin console UI. Unauthenticated by
// design — it only reveals whether the server-side service role is configured,
// never any KB content.
kbAdminRouter.get('/status', (_req, res) => {
  res.json({
    enabled: true,
    supabaseConfigured: isKbAdminConfigured(),
  })
})

kbAdminRouter.get('/substances', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
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
  const actorId = requireSystemAdmin(req, res)
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
  if (!requireSystemAdmin(req, res)) return
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
  if (!requireSystemAdmin(req, res)) return
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
  const actorId = requireSystemAdmin(req, res)
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
  const actorId = requireSystemAdmin(req, res)
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
  const actorId = requireSystemAdmin(req, res)
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
  const actorId = requireSystemAdmin(req, res)
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
  if (!requireSystemAdmin(req, res)) return
  handleAdminConfig(req, res)
})

kbAdminRouter.get('/discussions', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handleListDiscussions(req, res)
})
kbAdminRouter.post('/discussions', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handleCreateDiscussion(req, res)
})

kbAdminRouter.get('/contributions/:contributionId/votes', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handleGetVoteSummary(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/votes', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handleCastVote(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/publish', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handlePublishContribution(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/reject', async (req, res) => {
  if (!requireSystemAdmin(req, res)) return
  await handleRejectContribution(req, res)
})

// ── Legacy JSONB KB write-through (drugs / preparations) ─────────────────────
// Service-role writes that stand in for direct browser writes the secure RLS now
// blocks for non-editors. Reads stay public/direct from the browser anon client.

kbAdminRouter.post('/drugs', async (req, res) => {
  const actorId = requireKbEditor(req, res)
  if (!actorId) return
  try {
    const body = req.body as { drugs?: unknown }
    const drugs = Array.isArray(body?.drugs) ? (body.drugs as KnowledgeBaseDrug[]) : null
    if (!drugs || drugs.some((drug) => !drug || typeof drug.id !== 'string' || !drug.id)) {
      res.status(400).json({ error: 'Body must be { drugs: KnowledgeBaseDrug[] } with valid ids.' })
      return
    }
    await adminUpsertKnowledgeBaseDrugs(drugs)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'legacy-drug.upsert',
      entityType: 'knowledge_base_drugs',
      afterSummary: { count: drugs.length, ids: drugs.slice(0, 25).map((drug) => drug.id) },
      source: 'manual',
      req,
    })
    res.json({ upserted: drugs.length })
  } catch (error) {
    console.error('[kb-admin] legacy drug upsert failed:', error)
    res.status(500).json({ error: 'Failed to save KB drugs' })
  }
})

kbAdminRouter.delete('/drugs/:id', async (req, res) => {
  const actorId = requireKbEditor(req, res)
  if (!actorId) return
  try {
    await adminDeleteKnowledgeBaseDrug(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'legacy-drug.delete',
      entityType: 'knowledge_base_drugs',
      entityId: req.params.id,
      source: 'manual',
      req,
    })
    res.json({ deleted: req.params.id })
  } catch (error) {
    console.error('[kb-admin] legacy drug delete failed:', error)
    res.status(500).json({ error: 'Failed to delete KB drug' })
  }
})

kbAdminRouter.post('/preparations', async (req, res) => {
  const actorId = requireKbEditor(req, res)
  if (!actorId) return
  try {
    const body = req.body as { preparations?: unknown }
    const preparations = Array.isArray(body?.preparations)
      ? (body.preparations as MedicationMarketAvailability[])
      : null
    if (
      !preparations ||
      preparations.some((entry) => !entry || typeof entry.id !== 'string' || !entry.id)
    ) {
      res.status(400).json({
        error: 'Body must be { preparations: MedicationMarketAvailability[] } with valid ids.',
      })
      return
    }
    await adminUpsertPreparations(preparations)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'legacy-preparation.upsert',
      entityType: 'knowledge_base_preparations',
      afterSummary: {
        count: preparations.length,
        ids: preparations.slice(0, 25).map((entry) => entry.id),
      },
      source: 'manual',
      req,
    })
    res.json({ upserted: preparations.length })
  } catch (error) {
    console.error('[kb-admin] legacy preparation upsert failed:', error)
    res.status(500).json({ error: 'Failed to save KB preparations' })
  }
})

kbAdminRouter.delete('/preparations/:id', async (req, res) => {
  const actorId = requireKbEditor(req, res)
  if (!actorId) return
  try {
    await adminDeletePreparation(req.params.id)
    void recordKbAdminAudit({
      actorUserId: actorId,
      action: 'legacy-preparation.delete',
      entityType: 'knowledge_base_preparations',
      entityId: req.params.id,
      source: 'manual',
      req,
    })
    res.json({ deleted: req.params.id })
  } catch (error) {
    console.error('[kb-admin] legacy preparation delete failed:', error)
    res.status(500).json({ error: 'Failed to delete KB preparation' })
  }
})

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
import { requireKbAdminUser } from '../services/kbAdminAuth'
import {
  handleAdminConfig,
  handleCastVote,
  handleCreateDiscussion,
  handleGetVoteSummary,
  handleListDiscussions,
  handlePublishContribution,
  handleRejectContribution,
} from './kbAdminContributions'

export const kbAdminRouter: Router = createRouter()

function kbAdminEnabled(): boolean {
  if (process.env.KB_ADMIN_API_ENABLED === 'false') return false
  return process.env.KB_ADMIN_API_ENABLED === 'true' || process.env.NODE_ENV !== 'production'
}

function requireKbAdmin(req: Request, res: Response): boolean {
  if (!kbAdminEnabled()) {
    res.status(403).json({ error: 'KB admin API disabled. Set KB_ADMIN_API_ENABLED=true.' })
    return false
  }
  if (!isKbAdminConfigured()) {
    res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.',
    })
    return false
  }
  if (!requireKbAdminUser(req, res)) return false
  return true
}

kbAdminRouter.get('/status', (_req, res) => {
  res.json({
    enabled: kbAdminEnabled(),
    supabaseConfigured: isKbAdminConfigured(),
  })
})

kbAdminRouter.get('/substances', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
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
  if (!requireKbAdmin(req, res)) return
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

    res.json({ summary })
  } catch (error) {
    console.error('[kb-admin] approve-all failed:', error)
    res.status(500).json({ error: 'Failed to approve all substances' })
  }
})

kbAdminRouter.get('/contributions', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
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
  if (!requireKbAdmin(req, res)) return
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
  if (!requireKbAdmin(req, res)) return
  try {
    const body = req.body ?? {}
    await updateKbSubstance(req.params.id, body, body.revisionType ?? 'manual_edit')
    const detail = await getKbSubstanceById(req.params.id)
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] patch failed:', error)
    res.status(500).json({ error: 'Failed to update substance' })
  }
})

kbAdminRouter.post('/substances/:id/publish', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
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
    res.json({ substance: updated, projectedDrugId })
  } catch (error) {
    console.error('[kb-admin] publish failed:', error)
    res.status(500).json({ error: 'Failed to publish' })
  }
})

kbAdminRouter.post('/substances/:id/archive', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  try {
    await updateKbSubstance(req.params.id, { status: 'archived' }, 'archive')
    const detail = await getKbSubstanceById(req.params.id)
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] archive failed:', error)
    res.status(500).json({ error: 'Failed to archive' })
  }
})

kbAdminRouter.post('/substances/:id/approve', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  try {
    await updateKbSubstance(
      req.params.id,
      { reviewStatus: 'approved', status: 'reviewed', needsClinicalReview: false },
      'approve',
    )
    const detail = await getKbSubstanceById(req.params.id)
    res.json({ substance: detail })
  } catch (error) {
    console.error('[kb-admin] approve failed:', error)
    res.status(500).json({ error: 'Failed to approve' })
  }
})

kbAdminRouter.get('/config', (req, res) => {
  if (!requireKbAdmin(req, res)) return
  handleAdminConfig(req, res)
})

kbAdminRouter.get('/discussions', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handleListDiscussions(req, res)
})
kbAdminRouter.post('/discussions', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handleCreateDiscussion(req, res)
})

kbAdminRouter.get('/contributions/:contributionId/votes', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handleGetVoteSummary(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/votes', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handleCastVote(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/publish', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handlePublishContribution(req, res)
})
kbAdminRouter.post('/contributions/:contributionId/reject', async (req, res) => {
  if (!requireKbAdmin(req, res)) return
  await handleRejectContribution(req, res)
})

/**
 * Admin AI analytics route.
 *
 * GET /api/admin/ai-analytics?from=ISO&to=ISO
 *
 * Gating (defence-in-depth, matches the kb-admin pattern):
 *   1. env flag `ENABLE_ADMIN_AI_ANALYTICS_API` not 'true' → 404 (hide route)
 *   2. unauthenticated                                     → 401
 *   3. authenticated but not admin                         → 403
 *
 * Returns the full {@link AnalyticsResponse} payload.
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { hasKbAdminRole } from '../services/kbAdminAuth'
import { computeAnalytics, resolveWindow } from '../ai/analyticsService'
import { listProviderCosts } from '../ai/providerCosts'

export const adminAiAnalyticsRouter: Router = createRouter()

export function adminAiAnalyticsEnabled(): boolean {
  const next = process.env.ENABLE_ADMIN_AI_ANALYTICS_API
  const legacy = process.env.ADMIN_AI_ANALYTICS_API_ENABLED
  if (next === 'false' || legacy === 'false') return false
  return next === 'true' || legacy === 'true'
}

/**
 * Gate every admin analytics endpoint. Returns the actor id on success or
 * `null` when a 4xx response has already been written.
 */
async function requireAnalyticsAdmin(req: Request, res: Response): Promise<string | null> {
  if (!adminAiAnalyticsEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return null
  }
  const userId = requireRouteAuth(req, res)
  if (!userId) return null
  const allowed = await hasKbAdminRole(req, userId)
  if (!allowed) {
    res.status(403).json({
      error: 'Admin analytics access denied: requires owner/admin role.',
    })
    return null
  }
  return userId
}

adminAiAnalyticsRouter.get('/', async (req: Request, res: Response) => {
  const actor = await requireAnalyticsAdmin(req, res)
  if (!actor) return

  try {
    const window = resolveWindow({
      from: typeof req.query.from === 'string' ? req.query.from : null,
      to: typeof req.query.to === 'string' ? req.query.to : null,
    })
    const analytics = await computeAnalytics(window)
    res.json(analytics)
  } catch (error) {
    console.error('[admin-ai-analytics] read failed:', error)
    res.status(500).json({ error: 'Failed to compute AI analytics' })
  }
})

/**
 * Expose the active provider cost table for debugging / sanity checking
 * (e.g. when an operator suspects an env override didn't take effect).
 * No PHI here — pure config.
 */
adminAiAnalyticsRouter.get('/provider-costs', async (req: Request, res: Response) => {
  const actor = await requireAnalyticsAdmin(req, res)
  if (!actor) return
  res.json({ providerCosts: listProviderCosts() })
})

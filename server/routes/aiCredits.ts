/**
 * AI Credit Account API routes.
 *
 * GET  /api/ai-credits          — Returns credit summary for the current user.
 * GET  /api/ai-credits/usage    — Returns usage summary for the current month.
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { getCreditSummary } from '../ai/creditGuard'
import { getUsageSummaryForUser } from '../ai/usageLogger'

export const aiCreditsRouter: Router = createRouter()

aiCreditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const summary = await getCreditSummary(userId)
    res.json(summary)
  } catch (error) {
    console.error('[ai-credits] read failed:', error)
    res.status(500).json({ error: 'Failed to read credit summary' })
  }
})

aiCreditsRouter.get('/usage', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const usage = await getUsageSummaryForUser(userId)
    res.json(usage)
  } catch (error) {
    console.error('[ai-credits] usage read failed:', error)
    res.status(500).json({ error: 'Failed to read usage summary' })
  }
})

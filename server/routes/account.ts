import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { getCreditBalance, getUserPlan, setUserPlan } from '../services/credits'
import { resolveAccountId } from '../middleware/auth'

export const accountRouter: Router = createRouter()

accountRouter.get('/plan', async (req: Request, res: Response) => {
  try {
    const userId = resolveAccountId(req)
    const [plan, balance] = await Promise.all([getUserPlan(userId), getCreditBalance(userId)])
    res.json({ plan, balance, userId: userId === 'default' ? null : userId })
  } catch (error) {
    console.error('[account] plan read failed:', error)
    res.status(500).json({ error: 'Failed to read plan' })
  }
})

/** Dev-only plan toggle — Stripe integration stub. */
accountRouter.post('/plan', async (req: Request, res: Response) => {
  try {
    // Guard the unbilled self-upgrade path: only allowed outside production,
    // unless explicitly opted in. Real plan changes belong to a billing flow.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_PLAN_TOGGLE !== 'true') {
      res.status(403).json({ error: 'Plan changes are handled via billing' })
      return
    }

    const userId = resolveAccountId(req)
    if (userId === 'default') {
      res.status(400).json({ error: 'Authentication required' })
      return
    }

    const plan = req.body?.plan === 'pro' ? 'pro' : 'free'
    const next = await setUserPlan(userId, plan)
    res.json({ plan: next })
  } catch (error) {
    console.error('[account] plan update failed:', error)
    res.status(500).json({ error: 'Failed to update plan' })
  }
})

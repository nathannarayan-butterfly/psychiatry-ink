import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { canAfford, getCreditBalance } from '../services/credits'
import { requireRouteAuth } from '../utils/requireRouteAuth'

export const creditsRouter: Router = createRouter()

creditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const balance = await getCreditBalance(userId)
    res.json({ balance })
  } catch (error) {
    console.error('[credits] read failed:', error)
    res.status(500).json({ error: 'Failed to read balance' })
  }
})

creditsRouter.post('/check', async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount ?? 0)
    if (!Number.isFinite(amount) || amount < 0) {
      res.status(400).json({ error: 'Invalid amount' })
      return
    }

    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const balance = await getCreditBalance(userId)
    const ok = await canAfford(amount, userId)

    res.json({ ok, balance })
  } catch (error) {
    console.error('[credits] check failed:', error)
    res.status(500).json({ error: 'Failed to check balance' })
  }
})

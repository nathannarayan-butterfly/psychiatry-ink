import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { canAfford, getCreditBalance } from '../services/credits'

export const creditsRouter: Router = createRouter()

creditsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const balance = await getCreditBalance()
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

    const balance = await getCreditBalance()
    const ok = await canAfford(amount)

    res.json({ ok, balance })
  } catch (error) {
    console.error('[credits] check failed:', error)
    res.status(500).json({ error: 'Failed to check balance' })
  }
})

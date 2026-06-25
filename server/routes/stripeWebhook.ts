import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { handleStripeWebhook, isStripeCreditsConfigured } from '../services/stripeCredits'

export const stripeWebhookRouter: Router = createRouter()

stripeWebhookRouter.post('/', async (req: Request, res: Response) => {
  if (!isStripeCreditsConfigured()) {
    res.status(503).json({ error: 'Stripe is not configured' })
    return
  }

  try {
    const signature = req.headers['stripe-signature']
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''))
    await handleStripeWebhook(rawBody, typeof signature === 'string' ? signature : undefined)
    res.json({ received: true })
  } catch (error) {
    console.error('[stripe] webhook failed:', error)
    res.status(400).json({ error: 'Webhook verification failed' })
  }
})

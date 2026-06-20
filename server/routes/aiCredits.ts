/**
 * AI Credit Account API routes.
 *
 * GET  /api/ai-credits           — Returns credit summary for the current user.
 * GET  /api/ai-credits/usage     — Returns usage summary for the current month.
 * GET  /api/ai-credits/bundles   — List active credit bundles (SKU, credits, GBP).
 * POST /api/ai-credits/purchase  — Record a pending bundle purchase (Stripe wiring deferred).
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { getCreditSummary } from '../ai/creditGuard'
import { getUsageSummaryForUser } from '../ai/usageLogger'
import { CREDIT_BUNDLE_SKUS, findBundleBySku } from '../ai/aiPricingConfig'
import { ensureBundlesSeeded, recordPendingPurchase } from '../ai/bundleStore'

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

aiCreditsRouter.get('/bundles', async (_req: Request, res: Response) => {
  try {
    const bundles = await ensureBundlesSeeded()
    // Public payload — no DB ids leaked, only SKUs + prices.
    res.json({
      bundles: bundles.map((b) => ({
        sku: b.sku,
        credits: b.credits,
        priceGbp: Number(b.priceGbp),
        unitPriceGbp: Number(b.priceGbp) / b.credits,
        active: b.active,
      })),
    })
  } catch (error) {
    console.error('[ai-credits] bundles read failed:', error)
    // Fail open with the static SKU list so the UI can still render.
    res.json({
      bundles: CREDIT_BUNDLE_SKUS.map((b) => ({
        sku: b.sku,
        credits: b.credits,
        priceGbp: b.priceGbp,
        unitPriceGbp: b.priceGbp / b.credits,
        active: true,
      })),
    })
  }
})

aiCreditsRouter.post('/purchase', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const body = (req.body ?? {}) as { bundleId?: unknown; sku?: unknown }
    const rawSku =
      typeof body.bundleId === 'string'
        ? body.bundleId.trim()
        : typeof body.sku === 'string'
          ? body.sku.trim()
          : ''

    if (!rawSku) {
      res.status(400).json({ error: 'bundleId is required.' })
      return
    }

    const bundle = findBundleBySku(rawSku)
    if (!bundle) {
      res.status(400).json({ error: `Unknown bundle SKU: ${rawSku}` })
      return
    }

    // TODO(beta): wire Stripe checkout. For Beta we record the purchase
    // intent as `status='pending'` and return the new row id; a future
    // Stripe webhook moves the row to 'paid' and credits the account via
    // `creditPurchasedCredits` (see server/ai/creditGuard.ts).
    const purchase = await recordPendingPurchase({
      userId,
      sku: bundle.sku,
      credits: bundle.credits,
      priceGbp: bundle.priceGbp,
    })

    res.status(201).json({
      purchase: {
        id: purchase.id,
        sku: bundle.sku,
        credits: bundle.credits,
        priceGbp: bundle.priceGbp,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
      checkout: {
        // Stripe redirect URL will be populated when wiring lands. Returning
        // null lets the UI render a "payment provider not configured yet"
        // notice instead of failing hard.
        url: null,
      },
    })
  } catch (error) {
    console.error('[ai-credits] purchase failed:', error)
    res.status(500).json({ error: 'Failed to record bundle purchase' })
  }
})

aiCreditsRouter.get('/purchases', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const { listUserPurchases } = await import('../ai/bundleStore')
    const purchases = await listUserPurchases(userId)
    res.json({ purchases })
  } catch (error) {
    console.error('[ai-credits] purchases read failed:', error)
    res.status(500).json({ error: 'Failed to read purchases' })
  }
})

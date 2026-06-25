/**
 * AI Credit Account API routes.
 *
 * GET  /api/ai-credits              — Credit summary for the current user.
 * GET  /api/ai-credits/usage        — Usage summary for the current month.
 * GET  /api/ai-credits/ledger       — Recent ledger movements.
 * GET  /api/ai-credits/history      — Recent AI call history (metadata only).
 * POST /api/ai-credits/grant        — Dev/admin credit grant (non-production).
 * POST /api/ai-credits/checkout     — Create Stripe Checkout session.
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import {
  addPurchasedCredits,
  getCreditLedgerForUser,
  getCreditSummary,
  getRecentAiUsageForUser,
} from '../ai/creditGuard'
import { getUsageSummaryForUser } from '../ai/usageLogger'
import { createCreditCheckoutSession, isStripeCreditsConfigured } from '../services/stripeCredits'
import { findCreditPack } from '../../src/data/creditPacks'
import { isCreditGrantAdmin } from '../utils/adminAllowlist'

export const aiCreditsRouter: Router = createRouter()

aiCreditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const summary = await getCreditSummary(userId)
    res.json({
      ...summary,
      monthlyResetAt: summary.monthlyResetAt.toISOString(),
      stripeConfigured: isStripeCreditsConfigured(),
    })
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

aiCreditsRouter.get('/ledger', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50))
    const rows = await getCreditLedgerForUser(userId, limit)
    res.json({
      entries: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[ai-credits] ledger read failed:', error)
    res.status(500).json({ error: 'Failed to read credit ledger' })
  }
})

aiCreditsRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50))
    const rows = await getRecentAiUsageForUser(userId, limit)
    res.json({
      logs: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[ai-credits] history read failed:', error)
    res.status(500).json({ error: 'Failed to read usage history' })
  }
})

aiCreditsRouter.post('/grant', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    // Credit grants are an admin operation: require an explicit operator
    // allowlist (CREDIT_ADMIN_USER_IDS). NODE_ENV alone is NOT sufficient — in
    // production an empty allowlist denies everyone; in dev the legacy
    // ALLOW_DEV_CREDIT_GRANT flag still works for local testing.
    if (!isCreditGrantAdmin(userId)) {
      res.status(403).json({ error: 'Credit grants require an admin operator (CREDIT_ADMIN_USER_IDS).' })
      return
    }

    const credits = Number(req.body?.credits ?? 0)
    if (!Number.isFinite(credits) || credits <= 0 || credits > 100_000) {
      res.status(400).json({ error: 'Invalid credits amount' })
      return
    }

    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : 'dev_grant'
    const result = await addPurchasedCredits({
      userId,
      credits,
      note: note || 'dev_grant',
    })
    const summary = await getCreditSummary(userId)
    res.json({
      ok: true,
      granted: credits,
      totalAvailable: result.totalAvailable,
      summary: {
        ...summary,
        monthlyResetAt: summary.monthlyResetAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[ai-credits] grant failed:', error)
    res.status(500).json({ error: 'Failed to grant credits' })
  }
})

aiCreditsRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    if (!isStripeCreditsConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured' })
      return
    }

    const packId = typeof req.body?.packId === 'string' ? req.body.packId : ''
    const pack = findCreditPack(packId)
    if (!pack) {
      res.status(400).json({ error: 'Unknown credit pack' })
      return
    }

    const origin =
      typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
        ? req.body.origin
        : `${req.protocol}://${req.get('host') ?? 'localhost:5173'}`

    const session = await createCreditCheckoutSession({
      userId,
      pack,
      successUrl: `${origin}/dashboard/credits?checkout=success`,
      cancelUrl: `${origin}/dashboard/credits?checkout=cancelled`,
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[ai-credits] checkout failed:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

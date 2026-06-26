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
import {
  createCreditCheckoutSession,
  createSetupCheckoutSession,
  createSubscriptionCheckoutSession,
  isStripeCreditsConfigured,
  type SubscriptionInterval,
} from '../services/stripeCredits'
import { findCreditPack } from '../../src/data/creditPacks'
import { isCreditGrantAdmin } from '../utils/adminAllowlist'
import { getAccessForUser } from '../services/subscriptionAccess'
import { getAutoRechargeState } from '../services/autoRecharge'
import { creditsRepo } from '../data/credits'

export const aiCreditsRouter: Router = createRouter()

aiCreditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const [summary, autoRecharge] = await Promise.all([
      getCreditSummary(userId),
      getAutoRechargeState(userId),
    ])
    res.json({
      ...summary,
      monthlyResetAt: summary.monthlyResetAt.toISOString(),
      stripeConfigured: isStripeCreditsConfigured(),
      autoRecharge,
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

/**
 * Subscription/access status for the current user. Drives the pre-lapse warning
 * banner and the subscribe/recharge CTA in the frontend.
 */
aiCreditsRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const access = await getAccessForUser(userId)
    res.json({
      trialEndsAt: access.trialEndsAt,
      daysRemaining: access.daysRemaining,
      subscriptionStatus: access.subscriptionStatus,
      plan: access.plan,
      interval: access.interval,
      locked: access.locked,
      access: access.access,
      reason: access.reason,
      stripeConfigured: isStripeCreditsConfigured(),
    })
  } catch (error) {
    console.error('[ai-credits] status read failed:', error)
    res.status(500).json({ error: 'Failed to read subscription status' })
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

/** Create a subscription Checkout session (monthly £24.99 / yearly £239.90). */
aiCreditsRouter.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    if (!isStripeCreditsConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured' })
      return
    }

    const intervalRaw = typeof req.body?.interval === 'string' ? req.body.interval : 'month'
    if (intervalRaw !== 'month' && intervalRaw !== 'year') {
      res.status(400).json({ error: 'interval must be "month" or "year"' })
      return
    }
    const interval: SubscriptionInterval = intervalRaw

    const origin =
      typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
        ? req.body.origin
        : `${req.protocol}://${req.get('host') ?? 'localhost:5173'}`

    const customerEmail =
      typeof req.body?.email === 'string' && req.body.email.includes('@')
        ? req.body.email.trim()
        : undefined

    const session = await createSubscriptionCheckoutSession({
      userId,
      interval,
      customerEmail,
      successUrl: `${origin}/dashboard/credits?subscription=success`,
      cancelUrl: `${origin}/dashboard/credits?subscription=cancelled`,
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[ai-credits] subscription checkout failed:', error)
    res.status(500).json({ error: 'Failed to create subscription checkout session' })
  }
})

/** Read the current auto-recharge configuration/state for the user. */
aiCreditsRouter.get('/auto-recharge', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const state = await getAutoRechargeState(userId)
    res.json({ ...state, stripeConfigured: isStripeCreditsConfigured() })
  } catch (error) {
    console.error('[ai-credits] auto-recharge read failed:', error)
    res.status(500).json({ error: 'Failed to read auto-recharge settings' })
  }
})

/**
 * Update the opt-in auto-recharge settings. Enabling requires a saved payment
 * method (capture one first via /save-card or a credit purchase).
 */
aiCreditsRouter.post('/auto-recharge', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const body = (req.body ?? {}) as {
      enabled?: unknown
      threshold?: unknown
      packId?: unknown
    }

    const enabled = typeof body.enabled === 'boolean' ? body.enabled : undefined

    let threshold: number | undefined
    if (body.threshold !== undefined) {
      const parsed = Number(body.threshold)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100_000) {
        res.status(400).json({ error: 'threshold must be between 1 and 100000' })
        return
      }
      threshold = Math.floor(parsed)
    }

    let packId: string | undefined
    let amount: number | undefined
    if (body.packId !== undefined) {
      const pack = typeof body.packId === 'string' ? findCreditPack(body.packId) : undefined
      if (!pack) {
        res.status(400).json({ error: 'Unknown credit pack' })
        return
      }
      packId = pack.id
      amount = pack.credits
    }

    // Guard: enabling without a saved payment method would never charge.
    if (enabled === true) {
      const current = await getAutoRechargeState(userId)
      if (!current.hasPaymentMethod) {
        res.status(409).json({ error: 'no_payment_method', message: 'Save a card before enabling auto-recharge.' })
        return
      }
    }

    await creditsRepo.setAutoRecharge(userId, { enabled, threshold, packId, amount })
    const state = await getAutoRechargeState(userId)
    res.json({ ...state, stripeConfigured: isStripeCreditsConfigured() })
  } catch (error) {
    console.error('[ai-credits] auto-recharge update failed:', error)
    res.status(500).json({ error: 'Failed to update auto-recharge settings' })
  }
})

/**
 * Start a hosted "save card" (Stripe Checkout setup mode) session so the user
 * can store a reusable off-session payment method for auto-recharge.
 */
aiCreditsRouter.post('/save-card', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    if (!isStripeCreditsConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured' })
      return
    }

    const origin =
      typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
        ? req.body.origin
        : `${req.protocol}://${req.get('host') ?? 'localhost:5173'}`

    const customerEmail =
      typeof req.body?.email === 'string' && req.body.email.includes('@')
        ? req.body.email.trim()
        : undefined

    const session = await createSetupCheckoutSession({
      userId,
      customerEmail,
      successUrl: `${origin}/dashboard/credits?savecard=success`,
      cancelUrl: `${origin}/dashboard/credits?savecard=cancelled`,
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[ai-credits] save-card session failed:', error)
    res.status(500).json({ error: 'Failed to start save-card session' })
  }
})

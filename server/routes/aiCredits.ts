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
  createGiftVoucherCheckoutSession,
  createSubscriptionCheckoutSession,
  isStripeCreditsConfigured,
  type SubscriptionInterval,
} from '../services/stripeCredits'
import { findCreditPack } from '../../src/data/creditPacks'
import { findGiftVoucherPack } from '../../src/data/giftVoucherPacks'
import { isCreditGrantAdmin } from '../utils/adminAllowlist'
import { getAccessForUser } from '../services/subscriptionAccess'
import { claimDueVoucherPeriods, redeemVoucherForUser } from '../services/voucherService'
import { voucherRepo } from '../data/vouchers'
import { attributeInvitee, getReferralInfo } from '../services/referralService'

export const aiCreditsRouter: Router = createRouter()

aiCreditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    // Grant any voucher periods now due (idempotent, cheap no-op when nothing
    // is due). This is the "claim due voucher periods on balance check" path.
    await claimDueVoucherPeriods(userId).catch((error) => {
      console.error('[ai-credits] voucher claim during summary failed:', error)
    })

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

// ── Gutschein (voucher) ──────────────────────────────────────────────────────

/** Redeem a Gutschein code → bind to the user + grant the first period. */
aiCreditsRouter.post('/voucher/redeem', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      res.status(400).json({ error: 'Code erforderlich' })
      return
    }

    const outcome = await redeemVoucherForUser(userId, code)
    if (!outcome.ok) {
      res.status(400).json({ ok: false, error: outcome.error })
      return
    }
    res.json({
      ok: true,
      creditsGranted: outcome.creditsGranted,
      creditsPerPeriod: outcome.creditsPerPeriod,
      totalPeriods: outcome.totalPeriods,
      periodMonths: outcome.periodMonths,
    })
  } catch (error) {
    console.error('[ai-credits] voucher redeem failed:', error)
    res.status(500).json({ error: 'Gutschein konnte nicht eingelöst werden' })
  }
})

/** Claim any voucher periods now due for the current user (idempotent). */
aiCreditsRouter.post('/voucher/claim', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const result = await claimDueVoucherPeriods(userId)
    res.json(result)
  } catch (error) {
    console.error('[ai-credits] voucher claim failed:', error)
    res.status(500).json({ error: 'Voucher-Gutschriften konnten nicht angewendet werden' })
  }
})

/** Start a buy-a-gift Checkout for a gift voucher pack. */
aiCreditsRouter.post('/voucher/gift/checkout', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    if (!isStripeCreditsConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured' })
      return
    }

    const packId = typeof req.body?.giftPackId === 'string' ? req.body.giftPackId : ''
    const pack = findGiftVoucherPack(packId)
    if (!pack) {
      res.status(400).json({ error: 'Unknown gift voucher' })
      return
    }

    const origin =
      typeof req.body?.origin === 'string' && req.body.origin.startsWith('http')
        ? req.body.origin
        : `${req.protocol}://${req.get('host') ?? 'localhost:5173'}`

    const session = await createGiftVoucherCheckoutSession({
      userId,
      pack,
      successUrl: `${origin}/dashboard/credits?gift=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/dashboard/credits?gift=cancelled`,
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[ai-credits] gift checkout failed:', error)
    res.status(500).json({ error: 'Failed to create gift checkout session' })
  }
})

/** Fetch the generated voucher code for a completed gift purchase (buyer only). */
aiCreditsRouter.get('/voucher/gift/result', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : ''
    if (!sessionId) {
      res.status(400).json({ error: 'session_id erforderlich' })
      return
    }

    const voucher = await voucherRepo.getPurchasedVoucherBySession(sessionId, userId)
    if (!voucher) {
      // Webhook may not have processed yet — let the client retry.
      res.status(404).json({ ok: false, pending: true })
      return
    }
    res.json({
      ok: true,
      code: voucher.code,
      creditsPerPeriod: voucher.credits_per_period,
      periodMonths: voucher.period_months,
      totalPeriods: voucher.total_periods,
    })
  } catch (error) {
    console.error('[ai-credits] gift result read failed:', error)
    res.status(500).json({ error: 'Gutschein-Code konnte nicht geladen werden' })
  }
})

// ── Invite / referral ────────────────────────────────────────────────────────

/** The current user's invite code, link and referral stats. */
aiCreditsRouter.get('/referral', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const origin =
      typeof req.query.origin === 'string' && req.query.origin.startsWith('http')
        ? req.query.origin
        : `${req.protocol}://${req.get('host') ?? 'localhost:5173'}`

    const info = await getReferralInfo(userId, origin)
    res.json(info)
  } catch (error) {
    console.error('[ai-credits] referral info failed:', error)
    res.status(500).json({ error: 'Einladungsdaten konnten nicht geladen werden' })
  }
})

/** Attribute the current user as an invitee of a referral code (idempotent). */
aiCreditsRouter.post('/referral/attribute', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      res.status(400).json({ error: 'Code erforderlich' })
      return
    }

    const result = await attributeInvitee(userId, code)
    res.json(result)
  } catch (error) {
    console.error('[ai-credits] referral attribute failed:', error)
    res.status(500).json({ error: 'Einladung konnte nicht zugeordnet werden' })
  }
})

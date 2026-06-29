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
  getCreditsUsedThisPeriod,
  getRecentAiUsageForUser,
} from '../ai/creditGuard'
import { getUsageSummaryForUser } from '../ai/usageLogger'
import {
  createCreditCheckoutSession,
  createGiftVoucherCheckoutSession,
  createSetupCheckoutSession,
  createSubscriptionCheckoutSession,
  isStripeCreditsConfigured,
  type SubscriptionInterval,
} from '../services/stripeCredits'
import { findCreditPack } from '../../src/data/creditPacks'
import { findGiftVoucherPack } from '../../src/data/giftVoucherPacks'
import { isCreditGrantAdmin, isKbAdmin } from '../utils/adminAllowlist'
import { getAccessForUser } from '../services/subscriptionAccess'
import { claimDueVoucherPeriods, redeemVoucherForUser } from '../services/voucherService'
import { voucherRepo } from '../data/vouchers'
import { attributeInvitee, getReferralInfo } from '../services/referralService'
import { getAutoRechargeState } from '../services/autoRecharge'
import { creditsRepo } from '../data/credits'

export const aiCreditsRouter: Router = createRouter()

/**
 * True when the verified user may operate the promo-voucher admin surface.
 * Either operator allowlist (credit-grant or KB admin) qualifies; identity
 * always comes from the verified `requireRouteAuth` id, never a client header.
 */
function isVoucherAdmin(userId: string | null | undefined): boolean {
  return isCreditGrantAdmin(userId) || isKbAdmin(userId)
}

aiCreditsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    // Grant any voucher periods now due (idempotent, cheap no-op when nothing
    // is due). This is the "claim due voucher periods on balance check" path.
    await claimDueVoucherPeriods(userId).catch((error) => {
      console.error('[ai-credits] voucher claim during summary failed:', error)
    })

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

    // `getUsageSummaryForUser` provides the call/token/success metadata from the
    // ai_usage_logs telemetry. The credit total, however, must come from the
    // credit LEDGER (the authoritative record that moves the balance) so the
    // displayed "used" reconciles with the balance — usage-log credits omit
    // direct debits like dictation. See getCreditsUsedThisPeriod.
    const [usage, totalCredits] = await Promise.all([
      getUsageSummaryForUser(userId),
      getCreditsUsedThisPeriod(userId),
    ])
    res.json({ ...usage, totalCredits })
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

// ── Gutschein (voucher) — Owner/operator admin surface ───────────────────────

/**
 * Admin-status signal for the client. The UI uses it only to decide whether to
 * render the promo-voucher admin panel; server-side gating on the create/list
 * routes remains the source of truth regardless of what the client renders.
 */
aiCreditsRouter.get('/admin/status', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    res.json({ isAdmin: isVoucherAdmin(userId) })
  } catch (error) {
    console.error('[ai-credits] admin status read failed:', error)
    res.status(500).json({ error: 'Failed to read admin status' })
  }
})

/** Create a promo (source='admin') Gutschein. Owner/operator only. */
aiCreditsRouter.post('/voucher/admin/create', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    // Promo-voucher minting is an operator action: require an explicit allowlist
    // (CREDIT_ADMIN_USER_IDS or KB_ADMIN_USER_IDS). The user-bought gift flow
    // is unaffected by this gate.
    if (!isVoucherAdmin(userId)) {
      res.status(403).json({ error: 'Promo-Gutscheine erfordern einen Operator (CREDIT_ADMIN_USER_IDS).' })
      return
    }

    const body = (req.body ?? {}) as Record<string, unknown>

    const creditsPerPeriod = Number(body.creditsPerPeriod)
    if (!Number.isInteger(creditsPerPeriod) || creditsPerPeriod <= 0 || creditsPerPeriod > 1_000_000) {
      res.status(400).json({ error: 'creditsPerPeriod muss eine positive Ganzzahl sein' })
      return
    }

    const periodMonths = Number(body.periodMonths ?? 1)
    if (!Number.isInteger(periodMonths) || periodMonths <= 0 || periodMonths > 60) {
      res.status(400).json({ error: 'periodMonths muss zwischen 1 und 60 liegen' })
      return
    }

    const totalPeriods = Number(body.totalPeriods)
    if (!Number.isInteger(totalPeriods) || totalPeriods <= 0 || totalPeriods > 120) {
      res.status(400).json({ error: 'totalPeriods muss zwischen 1 und 120 liegen' })
      return
    }

    const maxRedemptions = Number(body.maxRedemptions ?? 1)
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100_000) {
      res.status(400).json({ error: 'maxRedemptions muss mindestens 1 sein' })
      return
    }

    const code =
      typeof body.code === 'string' && body.code.trim() ? body.code.trim().toUpperCase() : null

    let validUntil: string | null = null
    if (typeof body.validUntil === 'string' && body.validUntil.trim()) {
      const parsed = new Date(body.validUntil)
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'validUntil ist kein gültiges Datum' })
        return
      }
      validUntil = parsed.toISOString()
    }

    let validDays: number | null = null
    if (body.validDays != null && validUntil == null) {
      const days = Number(body.validDays)
      if (!Number.isInteger(days) || days <= 0 || days > 3650) {
        res.status(400).json({ error: 'validDays muss zwischen 1 und 3650 liegen' })
        return
      }
      validDays = days
    }
    if (body.validMonths != null && validUntil == null && validDays == null) {
      const months = Number(body.validMonths)
      if (!Number.isInteger(months) || months <= 0 || months > 120) {
        res.status(400).json({ error: 'validMonths muss zwischen 1 und 120 liegen' })
        return
      }
      validDays = months * 30
    }

    const result = await voucherRepo.createAdminVoucher({
      createdBy: userId,
      code,
      creditsPerPeriod,
      periodMonths,
      totalPeriods,
      maxRedemptions,
      validUntil,
      validDays,
    })

    if (!result.ok) {
      const status = result.error === 'code_exists' ? 409 : 400
      res.status(status).json({ ok: false, error: result.error ?? 'create_failed' })
      return
    }

    res.json({
      ok: true,
      code: result.code,
      creditsPerPeriod: result.creditsPerPeriod,
      periodMonths: result.periodMonths,
      totalPeriods: result.totalPeriods,
      maxRedemptions: result.maxRedemptions,
      validUntil: result.validUntil,
    })
  } catch (error) {
    console.error('[ai-credits] admin voucher create failed:', error)
    res.status(500).json({ error: 'Promo-Gutschein konnte nicht erstellt werden' })
  }
})

/** List existing promo (source='admin') Gutscheine with redemption counts. */
aiCreditsRouter.get('/voucher/admin/list', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    if (!isVoucherAdmin(userId)) {
      res.status(403).json({ error: 'Promo-Gutscheine erfordern einen Operator (CREDIT_ADMIN_USER_IDS).' })
      return
    }

    const vouchers = await voucherRepo.listAdminVouchers()
    res.json({ vouchers })
  } catch (error) {
    console.error('[ai-credits] admin voucher list failed:', error)
    res.status(500).json({ error: 'Promo-Gutscheine konnten nicht geladen werden' })
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

// ── Auto-recharge (opt-in, off by default) ───────────────────────────────────

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

/**
 * AI Credit Account API routes.
 *
 * GET  /api/ai-credits           — Returns credit summary for the current user.
 * GET  /api/ai-credits/usage     — Returns usage summary for the current month.
 * GET  /api/ai-credits/bundles   — List active credit bundles (SKU, credits, GBP).
 * POST /api/ai-credits/purchase  — Create a Stripe Checkout Session for a bundle.
 * GET  /api/ai-credits/purchases — List the current user's purchase history.
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { getCreditSummary } from '../ai/creditGuard'
import { getUsageSummaryForUser } from '../ai/usageLogger'
import { CREDIT_BUNDLE_SKUS, findBundleBySku } from '../ai/aiPricingConfig'
import {
  attachExternalRef,
  ensureBundlesSeeded,
  markPurchaseFailed,
  recordPendingPurchase,
} from '../ai/bundleStore'
import {
  getStripe,
  isStripeCheckoutConfigured,
  resolvePriceIdForSku,
  resolvePublicAppOrigin,
} from '../services/stripeClient'

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
  let purchaseRowId: string | null = null
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

    // Stripe configured?
    if (!isStripeCheckoutConfigured()) {
      res.status(503).json({ error: 'Payments are not configured. Contact your administrator.' })
      return
    }

    const priceId = resolvePriceIdForSku(bundle.sku)
    if (!priceId) {
      console.error(
        `[ai-credits] missing Stripe price for SKU ${bundle.sku} — set STRIPE_PRICE_CREDITS_${bundle.sku.replace(/^credits-/, '')} in .env.local.`,
      )
      res
        .status(503)
        .json({ error: 'This bundle is not available for purchase right now.' })
      return
    }

    // 1) Record the pending purchase so the webhook can join on
    //    `client_reference_id`. Snapshot credits + price at intent time.
    const purchase = await recordPendingPurchase({
      userId,
      sku: bundle.sku,
      credits: bundle.credits,
      priceGbp: bundle.priceGbp,
    })
    purchaseRowId = purchase.id

    // 2) Create the Stripe Checkout Session.
    const stripe = getStripe()
    if (!stripe) {
      // Cannot happen — isStripeCheckoutConfigured() above guards this, but
      // satisfies the type narrowing and protects against a future refactor
      // where the two are decoupled.
      await markPurchaseFailed(purchase.id)
      res.status(503).json({ error: 'Payments are not configured. Contact your administrator.' })
      return
    }

    const origin = resolvePublicAppOrigin(req.headers.origin as string | undefined)
    const successUrl = `${origin}/settings/ai-credits?purchase=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/settings/ai-credits?purchase=cancelled`

    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        // NOTE: per Stripe best practices we deliberately omit
        // `payment_method_types` so dynamic payment methods (cards, wallets,
        // SEPA, …) configured in the Stripe dashboard apply. See
        // https://docs.stripe.com/payments/payment-method-configurations.
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: purchase.id,
        metadata: {
          purchaseId: purchase.id,
          userId,
          bundleSku: bundle.sku,
          credits: String(bundle.credits),
        },
        // Carry the bundle metadata onto the PaymentIntent so a Stripe
        // dashboard inspector sees the SKU even when navigating from the
        // Payment view (Sessions are short-lived).
        payment_intent_data: {
          metadata: {
            purchaseId: purchase.id,
            userId,
            bundleSku: bundle.sku,
            credits: String(bundle.credits),
          },
        },
      })
    } catch (stripeError) {
      console.error('[ai-credits] Stripe checkout creation failed:', stripeError)
      await markPurchaseFailed(purchase.id).catch((rollbackError) => {
        console.error('[ai-credits] rollback failed:', rollbackError)
      })
      // Never expose internal Stripe error details to the client.
      res
        .status(502)
        .json({ error: 'Payment provider unavailable. Please try again in a moment.' })
      return
    }

    // 3) Persist the session id so the webhook can dedupe by externalRef
    //    if `client_reference_id` is ever scrubbed by Stripe (it shouldn't).
    if (session.id) {
      await attachExternalRef(purchase.id, session.id).catch((linkError) => {
        // Non-fatal — webhook still finds the row via client_reference_id.
        console.warn('[ai-credits] failed to persist externalRef:', linkError)
      })
    }

    if (!session.url) {
      // Stripe returned a session without a hosted URL — extremely rare for
      // mode=payment but treat as a soft failure.
      await markPurchaseFailed(purchase.id).catch(() => undefined)
      res.status(502).json({ error: 'Could not start checkout. Please try again.' })
      return
    }

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
        url: session.url,
        sessionId: session.id,
      },
    })
  } catch (error) {
    console.error('[ai-credits] purchase failed:', error)
    if (purchaseRowId) {
      await markPurchaseFailed(purchaseRowId).catch(() => undefined)
    }
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

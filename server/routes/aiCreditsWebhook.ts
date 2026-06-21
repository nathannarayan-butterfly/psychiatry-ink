/**
 * Stripe webhook endpoint for AI credit bundle purchases.
 *
 * Mount path:  POST /api/ai-credits/webhook
 *
 * Body parsing: Stripe webhook signatures are computed over the EXACT raw
 * payload bytes. The router below is wrapped in
 * `express.raw({ type: 'application/json' })` BEFORE the global JSON parser
 * runs (see `server/index.ts`), so `req.body` is a `Buffer` here.
 *
 * Events handled:
 *   - `checkout.session.completed`         → mark purchase paid, credit account
 *   - `checkout.session.expired`           → mark purchase failed
 *   - `checkout.session.async_payment_failed` → mark purchase failed
 *   - `charge.refunded`                    → mark refunded, decrement credits
 *                                            (clamped at 0)
 *   - `refund.created`                     → same as charge.refunded (newer
 *                                            event shape; emitted by Stripe
 *                                            when a refund is initiated)
 *
 * Idempotency:
 *   - Every Stripe `event.id` we've finished processing is recorded in
 *     `ProcessedWebhookEvent`. A duplicate delivery short-circuits to 200
 *     without re-processing. This protects against Stripe's at-least-once
 *     delivery semantics (which retry on non-2xx OR client timeout).
 *   - Within `checkout.session.completed`, the conditional update keyed on
 *     `status: 'pending'` is the secondary safety net: a row already
 *     `paid` is left alone even if the dedupe table were ever truncated.
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type Stripe from 'stripe'
import { prisma } from '../db'
import { getStripe, getStripeWebhookSecret } from '../services/stripeClient'

export const aiCreditsWebhookRouter: Router = createRouter()

interface PurchaseRow {
  id: string
  userId: string
  bundleId: string
  credits: number
  status: string
  externalRef: string | null
}

/**
 * Locate the purchase that a Stripe Checkout Session refers to. Prefer
 * `client_reference_id` (set deterministically at session-create time);
 * fall back to `metadata.purchaseId` or the persisted `externalRef` lookup
 * so a checkout session that lost its client_reference_id is still routable.
 */
async function resolvePurchaseFromSession(
  session: Stripe.Checkout.Session,
): Promise<PurchaseRow | null> {
  const candidateId =
    (typeof session.client_reference_id === 'string' && session.client_reference_id) ||
    (typeof session.metadata?.purchaseId === 'string' && session.metadata.purchaseId) ||
    null

  if (candidateId) {
    const direct = await prisma.aiCreditPurchase.findUnique({ where: { id: candidateId } })
    if (direct) return direct as PurchaseRow
  }

  if (session.id) {
    const byExternalRef = await prisma.aiCreditPurchase.findFirst({
      where: { externalRef: session.id },
    })
    if (byExternalRef) return byExternalRef as PurchaseRow
  }
  return null
}

/**
 * Locate the purchase associated with a refunded charge. Refund events
 * carry `payment_intent` → which traces back to the session via metadata
 * (`metadata.purchaseId` was copied onto the PaymentIntent at session
 * create time).
 */
async function resolvePurchaseFromCharge(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<{ purchase: PurchaseRow | null; refundedAmount: number; currency: string }> {
  const purchaseIdFromMeta =
    typeof charge.metadata?.purchaseId === 'string' && charge.metadata.purchaseId
      ? charge.metadata.purchaseId
      : null

  if (purchaseIdFromMeta) {
    const direct = await prisma.aiCreditPurchase.findUnique({
      where: { id: purchaseIdFromMeta },
    })
    if (direct) {
      return {
        purchase: direct as PurchaseRow,
        refundedAmount: charge.amount_refunded ?? 0,
        currency: charge.currency,
      }
    }
  }

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null

  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      const purchaseId =
        typeof pi.metadata?.purchaseId === 'string' && pi.metadata.purchaseId
          ? pi.metadata.purchaseId
          : null
      if (purchaseId) {
        const direct = await prisma.aiCreditPurchase.findUnique({ where: { id: purchaseId } })
        if (direct) {
          return {
            purchase: direct as PurchaseRow,
            refundedAmount: charge.amount_refunded ?? 0,
            currency: charge.currency,
          }
        }
      }
    } catch (error) {
      console.warn('[ai-credits.webhook] could not retrieve PaymentIntent:', error)
    }
  }

  return { purchase: null, refundedAmount: charge.amount_refunded ?? 0, currency: charge.currency }
}

/**
 * Apply a `checkout.session.completed` event: flip the purchase to paid,
 * increment the user's purchased-credit bucket, and emit a positive ledger
 * row tagged `bucket: 'purchased'` so analytics can split monthly vs
 * purchased consumption.
 *
 * Returns true when credits were actually applied (i.e. the purchase moved
 * from pending → paid). Returns false on no-op (already paid, refunded,
 * etc.) so the caller can short-circuit idempotency logging cleanly.
 */
async function applyPaidPurchase(purchase: PurchaseRow): Promise<boolean> {
  if (purchase.status === 'paid') return false
  // Refunded → ignore; do not resurrect a refunded purchase.
  if (purchase.status === 'refunded') return false

  return prisma.$transaction(async (tx) => {
    // Conditional update: only flip a still-pending row. A row already
    // paid/refunded by a concurrent webhook delivery returns count=0 and
    // we no-op so no double-credit can occur.
    const result = await tx.aiCreditPurchase.updateMany({
      where: { id: purchase.id, status: { in: ['pending', 'failed'] } },
      data: { status: 'paid', paidAt: new Date() },
    })
    if (result.count === 0) return false

    // Resolve or create the AiCreditAccount.
    let account = await tx.aiCreditAccount.findUnique({
      where: { userId: purchase.userId },
    })
    if (!account) {
      account = await tx.aiCreditAccount.create({
        data: {
          userId: purchase.userId,
          monthlyCredits: 500,
          purchasedCredits: 0,
          monthlyResetAt: nextMonthlyReset(),
        },
      })
    }

    await tx.aiCreditAccount.update({
      where: { id: account.id },
      data: { purchasedCredits: { increment: purchase.credits } },
    })

    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: 'purchase_credit',
        credits: purchase.credits,
        bucket: 'purchased',
        featureKey: null,
        usageLogId: null,
        note: `bundle_purchase:${purchase.id}`,
      },
    })
    return true
  })
}

/**
 * Apply a refund: flip the purchase row to `refunded` and decrement the
 * user's purchased-credit balance by the refunded credit amount, CLAMPED
 * AT 0 (a user who already spent some of the purchased credits should not
 * end up with a negative bucket). A compensating ledger row is always
 * emitted, even when the clamp kicks in, so the audit trail records the
 * full intent.
 *
 * `refundFraction` is the share of the original payment that was refunded
 * (1.0 for a full refund, <1.0 for a partial refund). We refund credits
 * proportionally so a partial refund returns a partial credit allowance.
 */
async function applyRefund(
  purchase: PurchaseRow,
  refundFraction: number,
): Promise<{ refundedCredits: number; clamped: number }> {
  if (purchase.status === 'refunded') return { refundedCredits: 0, clamped: 0 }

  const refundCreditsRaw = Math.max(0, Math.round(purchase.credits * refundFraction))
  if (refundCreditsRaw <= 0) return { refundedCredits: 0, clamped: 0 }

  return prisma.$transaction(async (tx) => {
    const result = await tx.aiCreditPurchase.updateMany({
      where: { id: purchase.id, status: { not: 'refunded' } },
      data: { status: 'refunded' },
    })
    if (result.count === 0) return { refundedCredits: 0, clamped: 0 }

    const account = await tx.aiCreditAccount.findUnique({
      where: { userId: purchase.userId },
    })
    if (!account) {
      // Refund recorded but no account exists — emit a compensating no-op
      // ledger entry would require an account id, so we simply log here.
      console.warn(
        `[ai-credits.webhook] refund for purchase ${purchase.id} found no AiCreditAccount for user ${purchase.userId}; row marked refunded.`,
      )
      return { refundedCredits: 0, clamped: refundCreditsRaw }
    }

    // Clamp at 0 — a clinician who already spent the purchased credits
    // shouldn't be billed for credits twice via a negative balance.
    const decrement = Math.min(account.purchasedCredits, refundCreditsRaw)
    const clamped = refundCreditsRaw - decrement

    if (decrement > 0) {
      await tx.aiCreditAccount.update({
        where: { id: account.id },
        data: { purchasedCredits: { decrement } },
      })
    }

    await tx.aiCreditLedger.create({
      data: {
        accountId: account.id,
        type: 'refund',
        credits: -decrement,
        bucket: 'purchased',
        featureKey: null,
        usageLogId: null,
        note:
          clamped > 0
            ? `bundle_refund:${purchase.id} (clamped at 0; ${clamped} credits already spent)`
            : `bundle_refund:${purchase.id}`,
      },
    })
    return { refundedCredits: decrement, clamped }
  })
}

function nextMonthlyReset(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

async function markPurchaseFailedByExternalRef(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const purchase = await resolvePurchaseFromSession(session)
  if (!purchase) return
  if (purchase.status === 'paid' || purchase.status === 'refunded') return
  await prisma.aiCreditPurchase.updateMany({
    where: { id: purchase.id, status: { in: ['pending'] } },
    data: { status: 'failed' },
  })
}

/**
 * Mark the event id as processed. Race-safe via the primary-key constraint
 * on `eventId` — a concurrent second insert throws and we report processed.
 */
async function markEventProcessed(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.processedWebhookEvent.create({
      data: { eventId: event.id, eventType: event.type },
    })
    return true
  } catch {
    return false
  }
}

aiCreditsWebhookRouter.post('/', async (req: Request, res: Response) => {
  const stripe = getStripe()
  const secret = getStripeWebhookSecret()
  if (!stripe || !secret) {
    console.error('[ai-credits.webhook] Stripe is not fully configured (key or webhook secret missing).')
    res.status(503).end()
    return
  }

  const signature = req.headers['stripe-signature']
  if (!signature || typeof signature !== 'string') {
    res.status(400).end()
    return
  }

  // `express.raw` populates req.body as a Buffer when mounted before the
  // JSON parser. If something downstream parsed it to JSON anyway, we
  // can't recompute the signature reliably — reject with 400 so Stripe
  // surfaces the misconfiguration in its dashboard.
  const rawBody = req.body
  if (!Buffer.isBuffer(rawBody)) {
    console.error('[ai-credits.webhook] req.body is not a Buffer; raw-body middleware missing.')
    res.status(400).end()
    return
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    // Signature verification failed — return 400 with NO body so the
    // exact verification failure isn't echoed back to a hostile sender.
    console.warn('[ai-credits.webhook] signature verification failed:', error instanceof Error ? error.message : 'unknown')
    res.status(400).end()
    return
  }

  // Idempotency dedupe: if we've already processed this event, ACK fast.
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { eventId: event.id },
  }).catch(() => null)
  if (existing) {
    res.status(200).json({ received: true, duplicate: true })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Only payment-mode sessions correspond to one-time bundle purchases.
        // Subscription/setup sessions (future products) won't touch credits.
        if (session.mode !== 'payment') break
        const purchase = await resolvePurchaseFromSession(session)
        if (!purchase) {
          console.warn(
            `[ai-credits.webhook] checkout.session.completed: no purchase found for session ${session.id}.`,
          )
          break
        }
        // Some payment methods complete asynchronously: only credit when
        // the session is actually paid. async_payment_succeeded carries
        // payment_status='paid' too; the no-op branch is safe.
        if (session.payment_status && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
          break
        }
        await applyPaidPurchase(purchase)
        break
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'payment') break
        const purchase = await resolvePurchaseFromSession(session)
        if (purchase) await applyPaidPurchase(purchase)
        break
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        await markPurchaseFailedByExternalRef(session)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const refundedAmount = charge.amount_refunded ?? 0
        const totalAmount = charge.amount ?? 0
        if (refundedAmount <= 0 || totalAmount <= 0) break
        const fraction = Math.min(1, refundedAmount / totalAmount)
        const { purchase } = await resolvePurchaseFromCharge(stripe, charge)
        if (purchase) await applyRefund(purchase, fraction)
        break
      }

      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund
        if (refund.status && refund.status !== 'succeeded') break
        const chargeId =
          typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? null
        if (!chargeId) break
        try {
          const charge = await stripe.charges.retrieve(chargeId)
          const refundedAmount = charge.amount_refunded ?? refund.amount ?? 0
          const totalAmount = charge.amount ?? refundedAmount
          if (refundedAmount <= 0 || totalAmount <= 0) break
          const fraction = Math.min(1, refundedAmount / totalAmount)
          const { purchase } = await resolvePurchaseFromCharge(stripe, charge)
          if (purchase) await applyRefund(purchase, fraction)
        } catch (error) {
          console.warn('[ai-credits.webhook] refund handling failed:', error)
        }
        break
      }

      default:
        // Ignore unrelated events so a noisy Stripe account doesn't fill
        // the log; Stripe still expects a 2xx.
        break
    }
  } catch (error) {
    console.error('[ai-credits.webhook] handler error:', error)
    // Do NOT record this event as processed — surface the failure to
    // Stripe so it retries.
    res.status(500).end()
    return
  }

  await markEventProcessed(event)
  res.status(200).json({ received: true })
})

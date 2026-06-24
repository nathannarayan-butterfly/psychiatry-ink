/**
 * Stripe Checkout for AI credit packs.
 *
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the server environment.
 * Uses Checkout Sessions (hosted) — no payment_method_types (dynamic methods).
 */

import { Prisma } from '@prisma/client'
import Stripe from 'stripe'
import type { CreditPack } from '../../src/data/creditPacks'
import { ensureCreditAccount, grantPurchasedCreditsWithinTx } from '../ai/creditGuard'
import { prisma } from '../db'

let stripeClient: Stripe | null = null

/** Bounded Stripe network behaviour — see security hardening #6. */
const STRIPE_TIMEOUT_MS = Number(process.env.STRIPE_TIMEOUT_MS ?? 30_000)
const STRIPE_MAX_NETWORK_RETRIES = Number(process.env.STRIPE_MAX_NETWORK_RETRIES ?? 1)

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      // Per-request timeout + one bounded retry for idempotent API calls.
      timeout: STRIPE_TIMEOUT_MS,
      maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
    })
  }
  return stripeClient
}

export function isStripeCreditsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export async function createCreditCheckoutSession(params: {
  userId: string
  pack: CreditPack
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: params.pack.priceGbpPence,
          product_data: {
            name: `Psychiatry.Ink — ${params.pack.labelEn}`,
            description: `${params.pack.credits} AI credits (non-expiring purchased balance)`,
          },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId,
      packId: params.pack.id,
      credits: String(params.pack.credits),
    },
  })
}

/** Resolve the credit grant implied by a paid checkout session (if any). */
function resolveCheckoutGrant(
  session: Stripe.Checkout.Session,
): { userId: string; credits: number; note: string } | null {
  if (session.payment_status !== 'paid') return null
  const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined
  const credits = Number(session.metadata?.credits ?? 0)
  const packId = session.metadata?.packId ?? 'unknown'
  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    console.warn('[stripe] checkout.session.completed missing userId/credits metadata', session.id)
    return null
  }
  return { userId, credits, note: `stripe:checkout:${session.id}:${packId}` }
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): Promise<{ received: true }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }
  if (!signature) {
    throw new Error('Missing Stripe-Signature header')
  }

  const stripe = getStripe()
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  const markerKey = `stripe:event:${event.id}`

  // Resolve the (idempotent) credit grant BEFORE opening the transaction so the
  // account row is created outside the critical section. Creating the account is
  // itself idempotent and is NOT the part that must be atomic.
  const grant =
    event.type === 'checkout.session.completed'
      ? resolveCheckoutGrant(event.data.object as Stripe.Checkout.Session)
      : null
  const accountId = grant ? (await ensureCreditAccount(grant.userId)).id : null

  // Atomic idempotency + grant: the "event processed" marker row and the credit
  // grant commit together or not at all. Serializable isolation + the unique
  // AppSetting key make concurrent duplicate deliveries impossible to double-grant
  // — the second delivery's marker insert raises P2002 (or a serialization
  // failure) and the whole transaction rolls back without granting again.
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.appSetting.create({
          data: { key: markerKey, value: new Date().toISOString() },
        })
        if (grant && accountId) {
          await grantPurchasedCreditsWithinTx(tx, {
            accountId,
            credits: grant.credits,
            note: grant.note,
          })
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    // Duplicate delivery (marker already exists) — already processed, succeed
    // idempotently. Serialization conflicts from concurrent duplicates surface
    // as P2034 and are equally safe to treat as "already handled".
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      return { received: true }
    }
    throw error
  }

  return { received: true }
}

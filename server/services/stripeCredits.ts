/**
 * Stripe Checkout for AI credit packs.
 *
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the server environment.
 * Uses Checkout Sessions (hosted) — no payment_method_types (dynamic methods).
 */

import Stripe from 'stripe'
import type { CreditPack } from '../../src/data/creditPacks'
import { addPurchasedCredits } from '../ai/creditGuard'
import { prisma } from '../db'

let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key)
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

async function hasProcessedStripeEvent(eventId: string): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: `stripe:event:${eventId}` } })
  return Boolean(row)
}

async function markStripeEventProcessed(eventId: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: `stripe:event:${eventId}` },
    update: { value: new Date().toISOString() },
    create: { key: `stripe:event:${eventId}`, value: new Date().toISOString() },
  })
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

  if (await hasProcessedStripeEvent(event.id)) {
    return { received: true }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.userId ?? session.client_reference_id
      const credits = Number(session.metadata?.credits ?? 0)
      const packId = session.metadata?.packId ?? 'unknown'

      if (userId && Number.isFinite(credits) && credits > 0) {
        await addPurchasedCredits({
          userId,
          credits,
          note: `stripe:checkout:${session.id}:${packId}`,
        })
      } else {
        console.warn('[stripe] checkout.session.completed missing userId/credits metadata', session.id)
      }
    }
  }

  await markStripeEventProcessed(event.id)
  return { received: true }
}

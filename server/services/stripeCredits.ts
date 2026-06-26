/**
 * Stripe Checkout for AI credit packs.
 *
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the server environment.
 * Uses Checkout Sessions (hosted) — no payment_method_types (dynamic methods).
 */

import Stripe from 'stripe'
import type { CreditPack } from '../../src/data/creditPacks'
import { type GiftVoucherPack, findGiftVoucherPack } from '../../src/data/giftVoucherPacks'
import { addPurchasedCredits } from '../ai/creditGuard'
import { MONTHLY_CREDIT_GRANT } from '../ai/aiPricingConfig'
import { creditsRepo } from '../data/credits'
import { voucherRepo } from '../data/vouchers'
import { generateVoucherCode } from './voucherService'
import { rewardReferrerForConversion } from './referralService'
import { claimEventMarker, releaseEventMarker } from '../data/appSettings'

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

/**
 * Buy-a-gift Checkout (payment mode). On `checkout.session.completed` the
 * webhook mints a new voucher (source='purchase') and the buyer can copy the
 * generated code. Priced in GBP to match the one-off credit packs.
 */
export async function createGiftVoucherCheckoutSession(params: {
  userId: string
  pack: GiftVoucherPack
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const totalCredits = params.pack.creditsPerPeriod * params.pack.totalPeriods

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: params.pack.priceGbpPence,
          product_data: {
            name: `Psychiatry.Ink — Gutschein · ${params.pack.labelEn}`,
            description: `Gift voucher: ${params.pack.creditsPerPeriod} credits/month for ${params.pack.totalPeriods} months (${totalCredits} credits total).`,
          },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: {
      kind: 'gift_voucher',
      userId: params.userId,
      giftPackId: params.pack.id,
    },
  })
}

// ── Subscription billing (monthly £24.99 / yearly £239.90) ──────────────────

export type SubscriptionInterval = 'month' | 'year'

/**
 * LIVE Stripe price ids for the single-user subscription (account
 * acct_1TkXazGUamToC80X, product prod_UlqgAP1QhnbSDG; metadata
 * monthly_credit_grant=500, plan=single_user). Overridable via env so test-mode
 * keys can point at test-mode prices — set STRIPE_PRICE_SUB_MONTHLY /
 * STRIPE_PRICE_SUB_YEARLY in any non-live environment.
 */
const LIVE_SUBSCRIPTION_PRICE_MONTHLY = 'price_1TmIz4GUamToC80XxfxbK97Y'
const LIVE_SUBSCRIPTION_PRICE_YEARLY = 'price_1TmIz8GUamToC80XY8xDcAWd'

/** Credits granted (reset) for each paid subscription period. */
const SUBSCRIPTION_PERIOD_CREDITS = MONTHLY_CREDIT_GRANT

export function subscriptionPriceId(interval: SubscriptionInterval): string {
  if (interval === 'year') {
    return process.env.STRIPE_PRICE_SUB_YEARLY?.trim() || LIVE_SUBSCRIPTION_PRICE_YEARLY
  }
  return process.env.STRIPE_PRICE_SUB_MONTHLY?.trim() || LIVE_SUBSCRIPTION_PRICE_MONTHLY
}

/**
 * Stripe Checkout requires `subscription_data.trial_end` to be at least ~48h in
 * the future (the docs say "at least 2 days") and at most 5 years out. The free
 * trial is app-managed in Supabase (`ai_credit_accounts.trial_ends_at`), not
 * Stripe-managed, so we only defer Stripe's first billing date when it makes
 * sense to.
 */
const STRIPE_MIN_TRIAL_LEAD_MS = 48 * 60 * 60 * 1000
const STRIPE_MAX_TRIAL_LEAD_MS = 5 * 365 * 24 * 60 * 60 * 1000

/**
 * Resolve the Stripe `subscription_data.trial_end` (unix epoch seconds) for a
 * user subscribing while still inside their app-managed free trial, so Stripe
 * defers the first charge to the moment their existing free time runs out
 * instead of double-charging them for time they already have.
 *
 * Returns `null` (→ bill immediately, the pre-existing behaviour) when:
 *  - there is no recorded trial (`trial_ends_at` null/unparseable),
 *  - the trial has already ended (lead ≤ 0), or
 *  - the remaining trial is below Stripe's ~48h floor — falling back to
 *    immediate billing rather than letting Stripe reject the request.
 *
 * Also guards Stripe's 5-year ceiling defensively (app trials are days long, so
 * this never fires in practice) by falling back to immediate billing.
 *
 * `now` is injectable for deterministic tests.
 */
export function resolveSubscriptionTrialEnd(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!trialEndsAt) return null
  const trialEndMs = Date.parse(trialEndsAt)
  if (!Number.isFinite(trialEndMs)) return null
  const leadMs = trialEndMs - now.getTime()
  if (leadMs < STRIPE_MIN_TRIAL_LEAD_MS) return null
  if (leadMs > STRIPE_MAX_TRIAL_LEAD_MS) return null
  return Math.floor(trialEndMs / 1000)
}

/**
 * Create a subscription-mode Checkout Session for the single-user plan. Reuses
 * the user's existing Stripe customer when one is already mapped on the account
 * (so a re-subscribe doesn't fork a duplicate customer); otherwise Stripe
 * creates the customer on completion and the webhook persists the mapping. The
 * app user id is carried on both the session (`client_reference_id` + metadata)
 * and the subscription metadata so every downstream event resolves back to the
 * user even before the customer mapping is stored.
 */
export async function createSubscriptionCheckoutSession(params: {
  userId: string
  interval: SubscriptionInterval
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  const account = await creditsRepo.getAccountByUserId(params.userId)
  const existingCustomer = account?.stripe_customer_id ?? undefined

  const customerBinding: Pick<
    Stripe.Checkout.SessionCreateParams,
    'customer' | 'customer_email'
  > = existingCustomer
    ? { customer: existingCustomer }
    : params.customerEmail
      ? { customer_email: params.customerEmail }
      : {}

  // Align Stripe's first billing date to the end of the user's app-managed free
  // trial so they aren't charged for time they already have free. Falls back to
  // immediate billing when there's no usable future trial (see helper).
  const trialEnd = resolveSubscriptionTrialEnd(account?.trial_ends_at)

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      userId: params.userId,
      interval: params.interval,
      plan: 'single_user',
    },
  }
  if (trialEnd !== null) {
    subscriptionData.trial_end = trialEnd
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: subscriptionPriceId(params.interval), quantity: 1 }],
    ...customerBinding,
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId,
      interval: params.interval,
      plan: 'single_user',
    },
    subscription_data: subscriptionData,
    // When deferring the first charge to the trial end, force card collection at
    // checkout so the first real charge succeeds once the trial lapses. (Stripe
    // collects a payment method during trials by default; we set it explicitly
    // so the behaviour can't silently change.)
    ...(trialEnd !== null
      ? { payment_method_collection: 'always' as const }
      : {}),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription') {
        await processStripeEventOnce(event.id, () => applySubscriptionFromCheckout(session))
        break
      }
      await handleOneTimeCheckout(event.id, session)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await processStripeEventOnce(event.id, () => applySubscriptionFromStripe(subscription))
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      await processStripeEventOnce(event.id, () => handleInvoicePaid(invoice))
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await processStripeEventOnce(event.id, () => handleInvoicePaymentFailed(invoice))
      break
    }

    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break
  }

  return { received: true }
}

/**
 * One-time credit-bundle checkout. Routed through the same per-event idempotency
 * gate as the subscription handlers: the first delivery claims the
 * `app_settings` marker and performs the grant; duplicate deliveries see the
 * marker and no-op. If the grant throws, the marker is released so Stripe's
 * retry reprocesses the event. `addPurchasedCredits` is itself a single atomic
 * RPC (`ai_credit_grant_purchased`), so the grant is all-or-nothing.
 */
async function handleOneTimeCheckout(
  eventId: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  await processStripeEventOnce(eventId, async () => {
    // Buy-a-gift checkout → mint a voucher (idempotent on the session id).
    if (session.metadata?.kind === 'gift_voucher') {
      await createGiftVoucherFromCheckout(session)
      return
    }

    const grant = resolveCheckoutGrant(session)
    if (!grant) return
    await addPurchasedCredits({
      userId: grant.userId,
      credits: grant.credits,
      note: grant.note,
    })
  })
}

/**
 * checkout.session.completed (gift voucher) → create the purchased voucher. The
 * underlying RPC is idempotent on the Stripe session id, so webhook retries
 * never mint duplicate codes.
 */
async function createGiftVoucherFromCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') return
  const buyerUserId = session.metadata?.userId ?? session.client_reference_id ?? undefined
  const giftPackId = session.metadata?.giftPackId ?? ''
  const pack = findGiftVoucherPack(giftPackId)
  if (!buyerUserId || !pack) {
    console.warn('[stripe] gift_voucher checkout missing buyer/pack metadata', session.id)
    return
  }

  await voucherRepo.createVoucherFromPurchase({
    sessionId: session.id,
    buyerUserId,
    code: generateVoucherCode(),
    creditsPerPeriod: pack.creditsPerPeriod,
    periodMonths: pack.periodMonths,
    totalPeriods: pack.totalPeriods,
    validDays: pack.validDays,
  })
}

/**
 * Per-event idempotency for all webhook handlers. The `app_settings` marker
 * (unique key) is the gate: the first delivery claims it and runs the work;
 * concurrent/duplicate deliveries see the marker and no-op. If the work throws,
 * the marker is released so Stripe's retry reprocesses the event.
 *
 * The credit RPCs are themselves atomic/convergent (grant_purchased increments
 * inside one statement; apply_subscription = upsert of state; the period grant
 * = reset of the allotment, not an increment), so even in the rare window where
 * two deliveries race past the gate the financial state stays correct — the
 * marker simply suppresses duplicate ledger rows.
 */
async function processStripeEventOnce(
  eventId: string,
  work: () => Promise<void>,
): Promise<void> {
  const markerKey = `stripe:event:${eventId}`
  const claimed = await claimEventMarker(markerKey)
  if (!claimed) {
    // Already processed (or being processed) — succeed idempotently.
    return
  }

  try {
    await work()
  } catch (error) {
    // Release the gate so Stripe's automatic retry can reprocess the event.
    await releaseEventMarker(markerKey).catch(() => {})
    throw error
  }
}

/** Stripe customer id as a plain string, regardless of expansion. */
function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

/**
 * Resolve the app user id behind a Stripe object. Prefers explicit metadata /
 * client_reference_id, then the stored customer mapping. Returns null when the
 * user cannot be determined (logged by the caller).
 */
async function resolveAppUserId(opts: {
  hint?: string | null
  metadataUserId?: string | null
  customerId?: string | null
}): Promise<string | null> {
  const direct = opts.hint?.trim() || opts.metadataUserId?.trim()
  if (direct) return direct
  if (opts.customerId) {
    const mapped = await creditsRepo.getUserIdByStripeCustomerId(opts.customerId)
    if (mapped) return mapped
  }
  return null
}

/**
 * Current-period-end as ISO, defensive across Stripe API versions that moved
 * `current_period_end` from the subscription onto its items.
 */
function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined
  const subEnd = (subscription as unknown as { current_period_end?: number }).current_period_end
  const unix = item?.current_period_end ?? subEnd
  return typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null
}

/** Map a Stripe Subscription onto the account via the apply-subscription RPC. */
async function applySubscriptionFromStripe(
  subscription: Stripe.Subscription,
  hint?: string,
): Promise<void> {
  const customerId = customerIdOf(subscription.customer)
  const userId = await resolveAppUserId({
    hint,
    metadataUserId: subscription.metadata?.userId,
    customerId,
  })
  if (!userId) {
    console.warn('[stripe] subscription event without resolvable user', subscription.id)
    return
  }

  const item = subscription.items?.data?.[0]
  const price = item?.price
  const interval = price?.recurring?.interval ?? null
  const plan =
    (price?.metadata?.plan as string | undefined) ?? subscription.metadata?.plan ?? 'single_user'

  await creditsRepo.applySubscription(userId, {
    status: subscription.status,
    plan,
    interval,
    customerId,
    subscriptionId: subscription.id,
    priceId: price?.id ?? null,
    currentPeriodEnd: subscriptionPeriodEndIso(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
  })
}

/** checkout.session.completed (subscription) → fetch the sub and apply it. */
async function applySubscriptionFromCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null)
  if (!subId) {
    console.warn('[stripe] subscription checkout completed without a subscription id', session.id)
    return
  }
  const subscription = await getStripe().subscriptions.retrieve(subId)
  await applySubscriptionFromStripe(
    subscription,
    session.metadata?.userId ?? session.client_reference_id ?? undefined,
  )
}

/** Extract the subscription id + carried user metadata from an invoice. */
function invoiceSubscriptionMeta(invoice: Stripe.Invoice): {
  subscriptionId: string | null
  metadataUserId?: string | null
} {
  const anyInvoice = invoice as unknown as {
    subscription?: string | { id?: string } | null
    subscription_details?: { metadata?: Record<string, string>; subscription?: string | { id?: string } } | null
    parent?: {
      subscription_details?: {
        metadata?: Record<string, string>
        subscription?: string | { id?: string }
      } | null
    } | null
  }

  const details = anyInvoice.parent?.subscription_details ?? anyInvoice.subscription_details ?? null

  const candidates = [anyInvoice.subscription, details?.subscription]
  let subscriptionId: string | null = null
  for (const candidate of candidates) {
    if (!candidate) continue
    subscriptionId = typeof candidate === 'string' ? candidate : (candidate.id ?? null)
    if (subscriptionId) break
  }

  if (!subscriptionId) {
    const line = invoice.lines?.data?.[0] as unknown as {
      subscription?: string | { id?: string } | null
    } | undefined
    const lineSub = line?.subscription
    if (lineSub) subscriptionId = typeof lineSub === 'string' ? lineSub : (lineSub.id ?? null)
  }

  return { subscriptionId, metadataUserId: details?.metadata?.userId ?? null }
}

/** invoice.paid → grant the subscription period allotment + clear soft-lock. */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const { subscriptionId, metadataUserId } = invoiceSubscriptionMeta(invoice)
  // Only subscription invoices grant the period allotment; one-off invoices are
  // handled by the bundle checkout flow.
  if (!subscriptionId) return

  // A subscription created while the user is still inside their app-managed free
  // trial carries `trial_end`, which makes Stripe emit an immediate $0
  // "trial-start" invoice that is marked paid. That is NOT a real payment, so it
  // must not grant the paid-period credit allotment — the app trial credits
  // stand until the first real charge fires invoice.paid at trial end. (Before
  // trial alignment the live prices had no trial, so every invoice.paid was a
  // real charge; this guard preserves that invariant.)
  if ((invoice.amount_paid ?? 0) <= 0) return

  const customerId = customerIdOf(invoice.customer)
  let userId = await resolveAppUserId({ metadataUserId, customerId })

  if (!userId) {
    // Mapping not stored yet (event ordering): fetch the sub, apply it (which
    // persists the customer mapping), then resolve.
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    userId = subscription.metadata?.userId ?? null
    if (userId) await applySubscriptionFromStripe(subscription, userId)
  }

  if (!userId) {
    console.warn('[stripe] invoice.paid without resolvable user', invoice.id)
    return
  }

  // Pass null for the period end so monthly_reset_at keeps its monthly cadence
  // (managed by creditGuard for all plans incl. yearly); the authoritative
  // subscription_current_period_end is set by applySubscriptionFromStripe.
  await creditsRepo.grantSubscriptionPeriod(
    userId,
    SUBSCRIPTION_PERIOD_CREDITS,
    null,
    `stripe:invoice:${invoice.id}`,
  )

  // Referral reward: this is a REAL paid invoice (amount_paid > 0, the $0
  // trial-start invoice was excluded above), i.e. the invitee just converted to
  // a real paid subscription. Reward the referrer exactly once (atomic + idempotent
  // in the RPC; also inside processStripeEventOnce). A no-attribution / already-
  // rewarded invitee is a silent no-op. Reward failures must not roll back the
  // already-granted subscription period, so they are logged and swallowed.
  try {
    await rewardReferrerForConversion(userId)
  } catch (error) {
    console.error('[stripe] referral reward failed (subscription period already granted):', error)
  }
}

/** invoice.payment_failed → mark the subscription past_due (keeps soft-lock). */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const { subscriptionId, metadataUserId } = invoiceSubscriptionMeta(invoice)
  if (!subscriptionId) return

  const customerId = customerIdOf(invoice.customer)
  let userId = await resolveAppUserId({ metadataUserId, customerId })

  if (!userId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    userId = subscription.metadata?.userId ?? null
  }

  if (!userId) {
    console.warn('[stripe] invoice.payment_failed without resolvable user', invoice.id)
    return
  }

  // Status-only update: every other field coalesces to its stored value.
  await creditsRepo.applySubscription(userId, { status: 'past_due' })
}

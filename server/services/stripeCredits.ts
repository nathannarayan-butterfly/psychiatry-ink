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

/**
 * Marker on a PaymentIntent's `metadata.kind` that distinguishes an auto-recharge
 * off-session charge from a manual hosted-checkout purchase. The webhook grants
 * credits for auto-recharge intents via `payment_intent.succeeded`; manual
 * purchases keep granting via `checkout.session.completed`, so this guard keeps
 * the two paths from double-granting.
 */
export const AUTO_RECHARGE_PI_KIND = 'auto_recharge'
const MANUAL_PURCHASE_PI_KIND = 'manual_purchase'

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

/**
 * Resolve (or lazily create) a persistent Stripe customer for an app user and
 * persist the mapping on `ai_credit_accounts.stripe_customer_id`. Required so
 * saved payment methods and off-session charges all attach to one customer.
 */
export async function ensureCustomerForUser(
  userId: string,
  customerEmail?: string,
): Promise<string> {
  const account = await creditsRepo.getAccountByUserId(userId)
  if (account?.stripe_customer_id) return account.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: customerEmail,
    metadata: { userId },
  })
  await creditsRepo.setPaymentMethod(userId, customer.id, null)
  return customer.id
}

export async function createCreditCheckoutSession(params: {
  userId: string
  pack: CreditPack
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()

  // Bind every credit purchase to a persistent customer and save the payment
  // method off-session, so a later opt-in to auto-recharge already has a
  // reusable card without a separate capture step. The PaymentIntent is tagged
  // `manual_purchase` so the webhook's payment_intent.succeeded path skips it
  // (manual grants run through checkout.session.completed).
  const customerId = await ensureCustomerForUser(params.userId, params.customerEmail)

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
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
    payment_intent_data: {
      setup_future_usage: 'off_session',
      metadata: {
        userId: params.userId,
        kind: MANUAL_PURCHASE_PI_KIND,
      },
    },
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
            description: `Gift voucher: one-time ${totalCredits}-credit top-up. Redeem within ${params.pack.validDays} days; the credits never expire once redeemed.`,
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

/**
 * Create a hosted Checkout Session in `setup` mode — the "Karte speichern" flow.
 * Saves a reusable off-session payment method WITHOUT charging. On completion
 * the webhook (`checkout.session.completed`, mode 'setup') reads the SetupIntent
 * and persists the payment method as the account default.
 */
export async function createSetupCheckoutSession(params: {
  userId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const customerId = await ensureCustomerForUser(params.userId, params.customerEmail)

  return stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    currency: 'gbp',
    payment_method_types: ['card'],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    setup_intent_data: {
      metadata: { userId: params.userId, kind: 'auto_recharge_setup' },
    },
    metadata: { userId: params.userId, kind: 'auto_recharge_setup' },
  })
}

/**
 * Charge a saved off-session payment method for ONE credit pack. Confirms
 * synchronously (`confirm: true`, `off_session: true`); the credit grant is
 * performed by the `payment_intent.succeeded` webhook (tagged with
 * {@link AUTO_RECHARGE_PI_KIND}). The deterministic idempotency key prevents a
 * duplicate trigger (same in-flight lock) from charging twice.
 *
 * Throws `Stripe.errors.StripeError` on decline / SCA-required so the caller can
 * classify the failure. Returns the confirmed PaymentIntent on success.
 */
export async function chargeAutoRechargeOffSession(params: {
  userId: string
  customerId: string
  paymentMethodId: string
  pack: CreditPack
  idempotencyKey: string
}): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe()
  return stripe.paymentIntents.create(
    {
      amount: params.pack.priceGbpPence,
      currency: 'gbp',
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        userId: params.userId,
        packId: params.pack.id,
        credits: String(params.pack.credits),
        kind: AUTO_RECHARGE_PI_KIND,
      },
    },
    { idempotencyKey: params.idempotencyKey },
  )
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
      if (session.mode === 'setup') {
        // "Karte speichern" flow — no charge, just persist the saved card.
        await processStripeEventOnce(event.id, () => handleSetupCheckout(session))
        break
      }
      await handleOneTimeCheckout(event.id, session)
      break
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent
      // Only auto-recharge intents grant here; manual purchases are granted by
      // checkout.session.completed (their PI is tagged manual_purchase).
      if (intent.metadata?.kind !== AUTO_RECHARGE_PI_KIND) break
      await processStripeEventOnce(event.id, () => handleAutoRechargeSucceeded(intent))
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      if (intent.metadata?.kind !== AUTO_RECHARGE_PI_KIND) break
      await processStripeEventOnce(event.id, () => handleAutoRechargeFailed(intent))
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
    // The checkout saved the card off-session (setup_future_usage); persist it
    // as the account default so a later opt-in to auto-recharge can use it.
    await captureDefaultPaymentMethodFromCheckout(session, grant.userId).catch((error) => {
      console.warn('[stripe] failed to capture payment method from checkout', session.id, error)
    })
  })
}

/**
 * "Karte speichern" (mode 'setup') completion → read the SetupIntent's payment
 * method and persist it as the account default + the customer's invoice default.
 */
async function handleSetupCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null
  const customerId = customerIdOf(session.customer)
  if (!userId) {
    console.warn('[stripe] setup checkout completed without resolvable user', session.id)
    return
  }

  const setupIntentId =
    typeof session.setup_intent === 'string'
      ? session.setup_intent
      : (session.setup_intent?.id ?? null)
  if (!setupIntentId) {
    console.warn('[stripe] setup checkout without a setup_intent', session.id)
    return
  }

  const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId)
  const paymentMethodId = paymentMethodIdOf(setupIntent.payment_method)
  if (!paymentMethodId) {
    console.warn('[stripe] setup_intent has no payment method', setupIntentId)
    return
  }

  await persistDefaultPaymentMethod(userId, customerId, paymentMethodId)
}

/** Read + persist the payment method saved by a paid (mode 'payment') checkout. */
async function captureDefaultPaymentMethodFromCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
): Promise<void> {
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)
  if (!paymentIntentId) return

  const intent = await getStripe().paymentIntents.retrieve(paymentIntentId)
  const paymentMethodId = paymentMethodIdOf(intent.payment_method)
  if (!paymentMethodId) return

  const customerId = customerIdOf(session.customer) ?? customerIdOf(intent.customer)
  await persistDefaultPaymentMethod(userId, customerId, paymentMethodId)
}

/**
 * Persist a saved payment method as the account default AND set it as the Stripe
 * customer's invoice default so off-session charges resolve it automatically.
 */
async function persistDefaultPaymentMethod(
  userId: string,
  customerId: string | null,
  paymentMethodId: string,
): Promise<void> {
  await creditsRepo.setPaymentMethod(userId, customerId, paymentMethodId)
  if (customerId) {
    await getStripe()
      .customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
      .catch((error) => {
        console.warn('[stripe] failed to set customer default payment method', customerId, error)
      })
  }
}

/**
 * Auto-recharge PaymentIntent succeeded → grant the credits (idempotent via the
 * per-event marker + 'stripe:' note) and clear the in-flight lock. Distinct from
 * manual purchases by the {@link AUTO_RECHARGE_PI_KIND} metadata guard upstream.
 */
async function handleAutoRechargeSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const customerId = customerIdOf(intent.customer)
  const userId = await resolveAppUserId({
    metadataUserId: intent.metadata?.userId,
    customerId,
  })
  if (!userId) {
    console.warn('[stripe] auto-recharge payment_intent.succeeded without resolvable user', intent.id)
    return
  }

  const credits = Number(intent.metadata?.credits ?? 0)
  const packId = intent.metadata?.packId ?? 'unknown'
  if (Number.isFinite(credits) && credits > 0) {
    await addPurchasedCredits({
      userId,
      credits,
      note: `stripe:auto_recharge:${intent.id}:${packId}`,
    })
  } else {
    console.warn('[stripe] auto-recharge intent missing credits metadata', intent.id)
  }

  // Release the in-flight lock + stamp the cooldown (best-effort; the
  // synchronous trigger path usually already did this).
  await creditsRepo.finishAutoRecharge(userId, { success: true }).catch(() => {})
}

/**
 * Auto-recharge PaymentIntent failed asynchronously (e.g. delayed decline) →
 * disable auto-recharge and surface a needs-attention flag. Never silently loop.
 */
async function handleAutoRechargeFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const customerId = customerIdOf(intent.customer)
  const userId = await resolveAppUserId({
    metadataUserId: intent.metadata?.userId,
    customerId,
  })
  if (!userId) {
    console.warn('[stripe] auto-recharge payment_intent.payment_failed without resolvable user', intent.id)
    return
  }

  const reason = intent.last_payment_error?.code ?? intent.last_payment_error?.decline_code ?? 'payment_failed'
  await creditsRepo.finishAutoRecharge(userId, {
    success: false,
    disable: true,
    failureReason: reason,
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

/** Stripe payment-method id as a plain string, regardless of expansion. */
function paymentMethodIdOf(
  paymentMethod: string | Stripe.PaymentMethod | null | undefined,
): string | null {
  if (!paymentMethod) return null
  return typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.id
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

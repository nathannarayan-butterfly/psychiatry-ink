/**
 * Auto-recharge orchestration (Cursor-style, opt-in).
 *
 * `maybeTriggerAutoRecharge` is the out-of-band entry point fired (fire-and-
 * forget) after a credit debit drops a user's balance. It is deliberately
 * non-blocking: the AI request that drained the balance has already completed,
 * and a failure here must never surface to that request.
 *
 * Safety model (no runaway / no stacked charges):
 *   1. `ai_credit_auto_recharge_begin` is a single conditional UPDATE that
 *      atomically checks eligibility (enabled, has saved card, under threshold,
 *      not in-flight, cooldown elapsed, under the per-period cap) AND claims the
 *      in-flight lock. Only one of N concurrent triggers can win it.
 *   2. The off-session PaymentIntent uses a deterministic idempotency key
 *      derived from the claimed in-flight timestamp, so even a retried trigger
 *      for the same claim can't double-charge at Stripe.
 *   3. The credit GRANT happens only in the Stripe webhook
 *      (payment_intent.succeeded), idempotent via the per-event marker.
 *   4. Hard failures (declined / SCA-required) DISABLE auto-recharge and flag
 *      needs-attention — we never silently loop.
 *
 * @module autoRecharge
 */

import Stripe from 'stripe'
import { creditsRepo } from '../data/credits'
import { findCreditPack, CREDIT_PACKS, type CreditPack } from '../../src/data/creditPacks'
import {
  chargeAutoRechargeOffSession,
  isStripeCreditsConfigured,
} from './stripeCredits'

/** Default pack charged when a user enabled auto-recharge without choosing one. */
const DEFAULT_AUTO_RECHARGE_PACK_ID = 'pack_1000'

/** Per-period cap + window + cooldown + stale-lock timeout (env-overridable). */
const MAX_PER_PERIOD = Number(process.env.AUTO_RECHARGE_MAX_PER_PERIOD ?? 5)
const PERIOD = process.env.AUTO_RECHARGE_PERIOD ?? '1 day'
const COOLDOWN = process.env.AUTO_RECHARGE_COOLDOWN ?? '00:05:00'
const STALE_LOCK = process.env.AUTO_RECHARGE_STALE_LOCK ?? '00:10:00'

/** Resolve the configured pack for an account, falling back to a sane default. */
function resolveAutoRechargePack(packId: string | null | undefined): CreditPack {
  return (
    (packId ? findCreditPack(packId) : undefined) ??
    findCreditPack(DEFAULT_AUTO_RECHARGE_PACK_ID) ??
    CREDIT_PACKS[0]
  )
}

interface FailureClassification {
  /** Whether to flip auto-recharge off (hard, user-actionable failures). */
  disable: boolean
  /** needs-attention reason to surface, or null for a transient retryable error. */
  reason: string | null
}

/**
 * Classify a charge failure. Hard, user-actionable failures (card declined, SCA
 * / authentication required, no/expired payment method) disable auto-recharge
 * and surface a reason. Transient/unknown errors are left retryable (still
 * bounded by the per-period cap + cooldown) so a blip doesn't permanently opt a
 * user out.
 */
export function classifyChargeFailure(error: unknown): FailureClassification {
  const code =
    error instanceof Stripe.errors.StripeError
      ? (error.code ?? (error as { decline_code?: string }).decline_code ?? error.type)
      : undefined

  const HARD_CODES = new Set([
    'card_declined',
    'authentication_required',
    'expired_card',
    'incorrect_cvc',
    'insufficient_funds',
    'payment_method_unactivated',
    'setup_intent_authentication_failure',
  ])

  if (code && HARD_CODES.has(code)) {
    return { disable: true, reason: code }
  }
  // A requires_action / requires_payment_method status surfaced without a
  // StripeError still means the off-session charge needs the customer present.
  if (error instanceof Stripe.errors.StripeError && error.type === 'StripeCardError') {
    return { disable: true, reason: code ?? 'card_error' }
  }
  return { disable: false, reason: null }
}

/**
 * Attempt an auto-recharge for a user if (and only if) they are eligible. Safe
 * to call fire-and-forget after any debit; returns silently when Stripe is not
 * configured or the user is not eligible. Never throws to the caller.
 */
export async function maybeTriggerAutoRecharge(userId: string): Promise<void> {
  if (!userId || !isStripeCreditsConfigured()) return

  let claimed: Awaited<ReturnType<typeof creditsRepo.beginAutoRecharge>> = null
  try {
    claimed = await creditsRepo.beginAutoRecharge(userId, {
      maxPerPeriod: MAX_PER_PERIOD,
      period: PERIOD,
      cooldown: COOLDOWN,
      stale: STALE_LOCK,
    })
  } catch (error) {
    console.warn('[auto-recharge] begin failed', userId, error)
    return
  }

  // Not eligible (disabled / over threshold not met / capped / in-flight / cooldown).
  if (!claimed) return

  const customerId = claimed.stripe_customer_id
  const paymentMethodId = claimed.default_payment_method_id
  if (!customerId || !paymentMethodId) {
    // Defensive: begin already gates on these, but never charge without them.
    await creditsRepo
      .finishAutoRecharge(userId, { success: false, disable: true, failureReason: 'no_payment_method' })
      .catch(() => {})
    return
  }

  const pack = resolveAutoRechargePack(claimed.auto_recharge_pack_id)

  // Deterministic key tied to the claimed in-flight stamp: a duplicate trigger
  // for the same claim reuses the key and can't double-charge at Stripe.
  const idempotencyKey = `auto_recharge:${userId}:${pack.id}:${claimed.auto_recharge_in_flight_at ?? 'now'}`

  try {
    const intent = await chargeAutoRechargeOffSession({
      userId,
      customerId,
      paymentMethodId,
      pack,
      idempotencyKey,
    })

    if (intent.status === 'succeeded' || intent.status === 'processing') {
      // Grant happens in the webhook; here we just release + start the cooldown.
      await creditsRepo.finishAutoRecharge(userId, { success: true })
      return
    }

    // requires_action / requires_payment_method etc. → needs the customer present.
    await creditsRepo.finishAutoRecharge(userId, {
      success: false,
      disable: true,
      failureReason: intent.status,
    })
  } catch (error) {
    const { disable, reason } = classifyChargeFailure(error)
    await creditsRepo
      .finishAutoRecharge(userId, { success: false, disable, failureReason: reason })
      .catch((finishError) => {
        console.warn('[auto-recharge] finish (failure) failed', userId, finishError)
      })
    if (!disable) {
      console.warn('[auto-recharge] transient charge failure (will retry, capped)', userId, error)
    }
  }
}

export interface AutoRechargeState {
  enabled: boolean
  threshold: number
  packId: string | null
  amount: number | null
  hasPaymentMethod: boolean
  status: string | null
  failureReason: string | null
  lastRechargeAt: string | null
}

/** Read the current auto-recharge configuration/state for a user (UI summary). */
export async function getAutoRechargeState(userId: string): Promise<AutoRechargeState> {
  const account = await creditsRepo.getAccountByUserId(userId)
  return {
    enabled: account?.auto_recharge_enabled ?? false,
    threshold: account?.auto_recharge_threshold ?? 100,
    packId: account?.auto_recharge_pack_id ?? null,
    amount: account?.auto_recharge_amount ?? null,
    hasPaymentMethod: Boolean(account?.default_payment_method_id),
    status: account?.auto_recharge_status ?? null,
    failureReason: account?.auto_recharge_failure_reason ?? null,
    lastRechargeAt: account?.auto_recharge_last_at ?? null,
  }
}

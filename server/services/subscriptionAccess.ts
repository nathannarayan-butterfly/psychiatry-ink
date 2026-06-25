/**
 * Subscription access computation + soft-lock enforcement.
 *
 * Single source of truth for "can this user use AI / credit-consuming features
 * right now?". The authoritative decision is computed LIVE from the account row
 * rather than relying on the `locked_at` audit stamp (which is best-effort, set
 * lazily by the lapse sweep / webhooks):
 *
 *   access = subscription active   (subscription_status ∈ {active, trialing})
 *          OR trial active         (now < trial_ends_at)
 *          OR purchased credits    (purchased_credits > 0)
 *          OR trial never started  (legacy / pre-enrolment accounts keep access)
 *
 * The soft-lock (read-only / no AI, never data deletion) engages only when an
 * account that HAS started a trial sees that trial lapse with no active
 * subscription and no purchased credits. Accounts that never started a trial
 * (e.g. created by the legacy Prisma `ensureCreditAccount` path before the trial
 * flow shipped) are deliberately NOT locked — this preserves current behaviour
 * for existing users and avoids retroactively locking anyone out.
 *
 * @module subscriptionAccess
 */

import { creditsRepo, type AiCreditAccount } from '../data/credits'
import { InsufficientCreditsError } from '../ai/creditGuard'

/** Stripe subscription statuses that grant live access. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

const MS_PER_DAY = 86_400_000

export type AccessReason =
  | 'subscription_active'
  | 'trial_active'
  | 'purchased_credits'
  | 'trial_not_started'
  | 'no_account'
  | 'locked_trial_expired'

export interface SubscriptionAccess {
  /** Whether the user may currently use AI / credit-consuming features. */
  access: boolean
  /** Whether the account is soft-locked (a strict negation of `access` only for started-and-lapsed trials). */
  locked: boolean
  /** Machine-readable reason for the access decision. */
  reason: AccessReason
  /** ISO timestamp the app-managed trial ends, or null if no trial recorded. */
  trialEndsAt: string | null
  /** Whole days remaining in the trial (ceil), or null when not in an active trial. */
  daysRemaining: number | null
  /** Mirror of the Stripe subscription status, or null. */
  subscriptionStatus: string | null
  /** Product plan tag (e.g. `single_user`), or null. */
  plan: string | null
  /** Billing interval (`month` | `year`), or null. */
  interval: string | null
}

/** Subset of the account row the access decision depends on. */
export type AccountAccessFields = Pick<
  AiCreditAccount,
  | 'trial_ends_at'
  | 'subscription_status'
  | 'subscription_plan'
  | 'subscription_interval'
  | 'purchased_credits'
>

/**
 * Pure access computation from an account row (or null for "no account yet").
 * `now` is injectable for deterministic tests.
 */
export function computeAccess(
  account: AccountAccessFields | null,
  now: Date = new Date(),
): SubscriptionAccess {
  if (!account) {
    return {
      access: true,
      locked: false,
      reason: 'no_account',
      trialEndsAt: null,
      daysRemaining: null,
      subscriptionStatus: null,
      plan: null,
      interval: null,
    }
  }

  const subscriptionStatus = account.subscription_status ?? null
  const subscriptionActive =
    subscriptionStatus !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
  const purchasedCredits = account.purchased_credits ?? 0
  const trialEndsAt = account.trial_ends_at ?? null
  const trialStarted = trialEndsAt !== null
  const trialEndsMs = trialEndsAt ? Date.parse(trialEndsAt) : Number.NaN
  const trialActive =
    trialStarted && Number.isFinite(trialEndsMs) && now.getTime() < trialEndsMs
  const daysRemaining = trialActive
    ? Math.max(0, Math.ceil((trialEndsMs - now.getTime()) / MS_PER_DAY))
    : null

  let access: boolean
  let locked: boolean
  let reason: AccessReason

  if (subscriptionActive) {
    access = true
    locked = false
    reason = 'subscription_active'
  } else if (trialActive) {
    access = true
    locked = false
    reason = 'trial_active'
  } else if (purchasedCredits > 0) {
    access = true
    locked = false
    reason = 'purchased_credits'
  } else if (!trialStarted) {
    access = true
    locked = false
    reason = 'trial_not_started'
  } else {
    access = false
    locked = true
    reason = 'locked_trial_expired'
  }

  return {
    access,
    locked,
    reason,
    trialEndsAt,
    daysRemaining,
    subscriptionStatus,
    plan: account.subscription_plan ?? null,
    interval: account.subscription_interval ?? null,
  }
}

/**
 * Thrown when a user attempts a credit-consuming / AI action while soft-locked.
 *
 * Subclasses {@link InsufficientCreditsError} so the existing 402 handlers in
 * every AI route block the call with a clear, human-readable message WITHOUT
 * per-route changes. The distinct `code`/`reason` let newer clients (and the
 * status endpoint) drive a "subscribe / recharge" CTA instead of a plain
 * "buy more credits" prompt.
 */
export class AccessLockedError extends InsufficientCreditsError {
  readonly code = 'subscription_required'
  readonly reason: AccessReason

  constructor(reason: AccessReason = 'locked_trial_expired') {
    super(0, 1)
    this.name = 'AccessLockedError'
    this.reason = reason
    this.message =
      'Your free trial has ended. Subscribe or add a credit bundle to keep using AI features. Your data stays safe and accessible.'
  }
}

/** Live access decision for a user (reads the account via the Supabase seam). */
export async function getAccessForUser(userId: string): Promise<SubscriptionAccess> {
  const account = await creditsRepo.getAccountByUserId(userId)
  return computeAccess(account)
}

/**
 * Throw {@link AccessLockedError} when the user is soft-locked. No-op when the
 * user has access. Intended for the AI/credit chokepoint (runAiFeature).
 */
export async function assertAccess(userId: string): Promise<void> {
  const decision = await getAccessForUser(userId)
  if (!decision.access) {
    throw new AccessLockedError(decision.reason)
  }
}

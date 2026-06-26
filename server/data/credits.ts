import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * creditsRepo — typed data-access seam for the AI credit system.
 *
 * This is the live data layer consumed by `server/ai/creditGuard.ts` and
 * `server/services/credits.ts`. It wraps the SECURITY DEFINER RPCs created in
 * `20260704000000_consolidation_credit_system.sql` (and the trial/subscription
 * RPCs in `20260704000400_consolidation_trial_subscription.sql`), which perform
 * the atomic ledger operations that previously lived inside Prisma
 * `$transaction` blocks.
 *
 * All writes go through the service-role client (RLS-bypassing); callers MUST
 * pass an already-authenticated owner id.
 */

export type AiCreditAccount = Database['public']['Tables']['ai_credit_accounts']['Row']
export type AiCreditLedgerEntry = Database['public']['Tables']['ai_credit_ledger']['Row']

export interface CreditMovementOptions {
  /** Links the ledger row to an `ai_usage_logs` row (id is text/uuid string). */
  usageLogId?: string
  /** Free-form note stored on the ledger row. */
  note?: string
}

/**
 * Idempotently ensure the user's credit account exists and apply the monthly
 * grant if the reset boundary has elapsed. Returns the current account row.
 *
 * @param nextResetAt ISO timestamp of the next monthly reset boundary.
 */
export async function ensureAccount(
  userId: string,
  monthlyGrant: number,
  nextResetAt: string,
): Promise<AiCreditAccount> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_ensure_account', {
    p_user_id: userId,
    p_monthly_grant: monthlyGrant,
    p_next_reset: nextResetAt,
  })
  if (error) throw new Error(`ai_credit_ensure_account failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_ensure_account returned no account')
  return data as AiCreditAccount
}

/**
 * Atomically spend `credits` (purchased bucket first, then monthly) and append a
 * debit ledger row. Returns `false` (and writes no ledger row) if the account
 * has insufficient credits or lost a concurrency race — never drives a bucket
 * negative.
 */
export async function debit(
  accountId: string,
  credits: number,
  featureKey: string,
  opts: CreditMovementOptions = {},
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_debit', {
    p_account_id: accountId,
    p_credits: credits,
    p_feature_key: featureKey,
    p_usage_log_id: opts.usageLogId,
    p_note: opts.note,
  })
  if (error) throw new Error(`ai_credit_debit failed: ${error.message}`)
  return data === true
}

/** Refund `credits` back to the monthly bucket and append a refund ledger row. */
export async function refund(
  accountId: string,
  credits: number,
  featureKey: string,
  opts: CreditMovementOptions = {},
): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('ai_credit_refund', {
    p_account_id: accountId,
    p_credits: credits,
    p_feature_key: featureKey,
    p_usage_log_id: opts.usageLogId,
    p_note: opts.note,
  })
  if (error) throw new Error(`ai_credit_refund failed: ${error.message}`)
}

/**
 * Grant purchased (non-expiring) credits — used by the Stripe webhook and admin
 * adjustments. Idempotency is the caller's responsibility (the `app_settings`
 * marker), per the Stripe-credits flow.
 */
export async function grantPurchased(
  accountId: string,
  credits: number,
  opts: { note?: string; featureKey?: string } = {},
): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('ai_credit_grant_purchased', {
    p_account_id: accountId,
    p_credits: credits,
    p_note: opts.note,
    p_feature_key: opts.featureKey,
  })
  if (error) throw new Error(`ai_credit_grant_purchased failed: ${error.message}`)
}

/** Read the credit account for a user (owner-scoped), or null if none exists. */
export async function getAccountByUserId(userId: string): Promise<AiCreditAccount | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_credit_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`ai_credit_accounts read failed: ${error.message}`)
  return data
}

/**
 * Start (or back-fill) the app-managed free trial for a user. Idempotent: on a
 * brand-new account this creates it with `trialCredits` monthly credits and a
 * `trialDays`-long trial window; for a pre-existing account that never had a
 * trial it back-fills the trial exactly once; an account that already has a
 * trial is left untouched. Wraps `ai_credit_start_trial` (service-role only).
 */
export async function startTrial(
  userId: string,
  trialCredits: number,
  trialDays: number,
): Promise<AiCreditAccount> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_start_trial', {
    p_user_id: userId,
    p_trial_credits: trialCredits,
    p_trial_days: trialDays,
  })
  if (error) throw new Error(`ai_credit_start_trial failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_start_trial returned no account')
  return data as AiCreditAccount
}

export interface SubscriptionState {
  /** Mirror of the Stripe `subscription.status`. */
  status: string
  /** Product plan tag (e.g. `single_user`); null leaves the stored value. */
  plan?: string | null
  /** Billing interval (`month` | `year`); null leaves the stored value. */
  interval?: string | null
  /** Stripe customer id; null leaves the stored value. */
  customerId?: string | null
  /** Stripe subscription id; null leaves the stored value. */
  subscriptionId?: string | null
  /** Stripe price id; null leaves the stored value. */
  priceId?: string | null
  /** ISO timestamp of the current period end; null leaves the stored value. */
  currentPeriodEnd?: string | null
  /** Whether the subscription is set to cancel at period end. */
  cancelAtPeriodEnd?: boolean | null
}

/**
 * Upsert the Stripe subscription state onto a user's credit account (creating a
 * minimal account if the event somehow arrives first). Clears the soft-lock when
 * the status is `active`/`trialing`. Wraps `ai_credit_apply_subscription`.
 */
export async function applySubscription(
  userId: string,
  state: SubscriptionState,
): Promise<AiCreditAccount> {
  // The generated RPC arg types are non-nullable, but every nullable parameter
  // is `coalesce(p_x, existing)` in SQL — passing JSON null (→ SQL NULL) keeps
  // the stored value. Cast to satisfy the codegen's stricter param types.
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_apply_subscription', {
    p_user_id: userId,
    p_status: state.status,
    p_plan: state.plan ?? null,
    p_interval: state.interval ?? null,
    p_customer_id: state.customerId ?? null,
    p_subscription_id: state.subscriptionId ?? null,
    p_price_id: state.priceId ?? null,
    p_current_period_end: state.currentPeriodEnd ?? null,
    p_cancel_at_period_end: state.cancelAtPeriodEnd ?? null,
  } as Database['public']['Functions']['ai_credit_apply_subscription']['Args'])
  if (error) throw new Error(`ai_credit_apply_subscription failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_apply_subscription returned no account')
  return data as AiCreditAccount
}

/**
 * Grant a paid subscription period's monthly credit allotment (resets
 * `monthly_credits` to `credits`), advance the period end and clear any
 * soft-lock. Idempotency is the caller's responsibility (the `app_settings`
 * per-event marker), per the Stripe-credits flow. Wraps
 * `ai_credit_grant_subscription_period`.
 */
export async function grantSubscriptionPeriod(
  userId: string,
  credits: number,
  currentPeriodEnd: string | null,
  note?: string,
): Promise<AiCreditAccount> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_grant_subscription_period', {
    p_user_id: userId,
    p_credits: credits,
    p_current_period_end: currentPeriodEnd,
    p_note: note ?? 'subscription_renewal',
  } as Database['public']['Functions']['ai_credit_grant_subscription_period']['Args'])
  if (error) throw new Error(`ai_credit_grant_subscription_period failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_grant_subscription_period returned no account')
  return data as AiCreditAccount
}

/**
 * Set or clear the soft-lock audit timestamp for a user. Setting is idempotent
 * (only stamps when not already locked); clearing always nulls it. Returns null
 * when the account does not exist. Wraps `ai_credit_set_lock`.
 */
export async function setLock(userId: string, locked: boolean): Promise<AiCreditAccount | null> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_set_lock', {
    p_user_id: userId,
    p_locked: locked,
  })
  if (error) throw new Error(`ai_credit_set_lock failed: ${error.message}`)
  return (data as AiCreditAccount) ?? null
}

/**
 * Persist the opt-in auto-recharge settings for a user (UI-driven). Wraps
 * `ai_credit_set_auto_recharge` (service-role only). Enabling clears any prior
 * needs-attention failure state.
 */
export async function setAutoRecharge(
  userId: string,
  settings: { enabled?: boolean; threshold?: number; packId?: string | null; amount?: number | null },
): Promise<AiCreditAccount> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_set_auto_recharge', {
    p_user_id: userId,
    p_enabled: settings.enabled ?? null,
    p_threshold: settings.threshold ?? null,
    p_pack_id: settings.packId ?? null,
    p_amount: settings.amount ?? null,
  } as Database['public']['Functions']['ai_credit_set_auto_recharge']['Args'])
  if (error) throw new Error(`ai_credit_set_auto_recharge failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_set_auto_recharge returned no account')
  return data as AiCreditAccount
}

/**
 * Persist the Stripe customer + saved off-session payment method captured by
 * checkout / SetupIntent. Pass `paymentMethodId = null` for a customer-only
 * write (during customer creation). A saved payment method clears any prior
 * needs-attention failure state. Wraps `ai_credit_set_payment_method`.
 */
export async function setPaymentMethod(
  userId: string,
  customerId: string | null,
  paymentMethodId: string | null,
): Promise<AiCreditAccount> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_set_payment_method', {
    p_user_id: userId,
    p_customer_id: customerId ?? null,
    p_payment_method_id: paymentMethodId ?? null,
  } as Database['public']['Functions']['ai_credit_set_payment_method']['Args'])
  if (error) throw new Error(`ai_credit_set_payment_method failed: ${error.message}`)
  if (!data) throw new Error('ai_credit_set_payment_method returned no account')
  return data as AiCreditAccount
}

/**
 * Atomically decide + claim an auto-recharge attempt. Returns the account row
 * when THIS caller won the right to charge (eligible, under threshold, not
 * in-flight, cooldown elapsed, under the per-period cap), or `null` when not
 * eligible. The decision and the single-winner in-flight lock are one
 * conditional UPDATE inside `ai_credit_auto_recharge_begin`. Intervals are
 * Postgres interval literals (e.g. '1 day', '00:05:00').
 */
export async function beginAutoRecharge(
  userId: string,
  opts: { maxPerPeriod: number; period: string; cooldown: string; stale: string },
): Promise<AiCreditAccount | null> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_auto_recharge_begin', {
    p_user_id: userId,
    p_max_per_period: opts.maxPerPeriod,
    p_period: opts.period,
    p_cooldown: opts.cooldown,
    p_stale: opts.stale,
  } as Database['public']['Functions']['ai_credit_auto_recharge_begin']['Args'])
  if (error) throw new Error(`ai_credit_auto_recharge_begin failed: ${error.message}`)
  return (data as AiCreditAccount) ?? null
}

/**
 * Release the auto-recharge in-flight lock and record the outcome. On success
 * stamps the cooldown; on a hard failure (`disable = true`) flips the opt-in off
 * and marks `needs_attention`. The credit grant itself is performed by the
 * Stripe webhook. Wraps `ai_credit_auto_recharge_finish`.
 */
export async function finishAutoRecharge(
  userId: string,
  outcome: { success: boolean; disable?: boolean; failureReason?: string | null },
): Promise<AiCreditAccount | null> {
  const { data, error } = await getSupabaseAdmin().rpc('ai_credit_auto_recharge_finish', {
    p_user_id: userId,
    p_success: outcome.success,
    p_disable: outcome.disable ?? false,
    p_failure_reason: outcome.failureReason ?? null,
  } as Database['public']['Functions']['ai_credit_auto_recharge_finish']['Args'])
  if (error) throw new Error(`ai_credit_auto_recharge_finish failed: ${error.message}`)
  return (data as AiCreditAccount) ?? null
}

/**
 * Resolve the app user id for a Stripe customer id (webhook → app user). Uses
 * the partial `ai_credit_accounts_stripe_customer_idx`. Returns null when no
 * account is mapped to the customer.
 */
export async function getUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_credit_accounts')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw new Error(`ai_credit_accounts customer lookup failed: ${error.message}`)
  return data?.user_id ?? null
}

/**
 * Whether a ledger entry of the given type + exact note already exists for an
 * account. Used to make one-off ledger writes (e.g. the legacy-balance
 * migration) idempotent without a transaction.
 */
export async function hasLedgerEntryWithNote(
  accountId: string,
  type: string,
  note: string,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_credit_ledger')
    .select('id')
    .eq('account_id', accountId)
    .eq('type', type)
    .eq('note', note)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`ai_credit_ledger lookup failed: ${error.message}`)
  return data !== null
}

/** Read the most recent ledger entries for an account (newest first). */
export async function listLedger(
  accountId: string,
  limit = 50,
): Promise<AiCreditLedgerEntry[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_credit_ledger')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`ai_credit_ledger read failed: ${error.message}`)
  return data ?? []
}

export const creditsRepo = {
  ensureAccount,
  debit,
  refund,
  grantPurchased,
  getAccountByUserId,
  hasLedgerEntryWithNote,
  listLedger,
  startTrial,
  applySubscription,
  grantSubscriptionPeriod,
  setLock,
  setAutoRecharge,
  setPaymentMethod,
  beginAutoRecharge,
  finishAutoRecharge,
  getUserIdByStripeCustomerId,
}

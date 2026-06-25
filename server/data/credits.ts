import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * creditsRepo — typed data-access seam for the AI credit system.
 *
 * This is the foundation (Prerequisite P) that the credits/billing workstream
 * (Stream D) will consume when it swaps `server/ai/creditGuard.ts` and
 * `server/services/credits.ts` off Prisma. It wraps the SECURITY DEFINER RPCs
 * created in `20260704000000_consolidation_credit_system.sql`, which perform the
 * atomic ledger operations that previously lived inside Prisma `$transaction`
 * blocks.
 *
 * IMPORTANT: nothing here is wired into the existing Prisma-backed routes yet —
 * Prisma remains the live data layer until Stream D rewrites those call sites.
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
  listLedger,
}

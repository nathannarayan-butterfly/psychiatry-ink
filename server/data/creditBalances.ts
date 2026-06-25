import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * creditBalancesRepo — typed data-access seam for the legacy `credit_balances`
 * table (Prisma model `CreditBalance` → `credit_balances`).
 *
 * This table is retained only for (a) per-user plan metadata (`free`/`pro`) and
 * (b) the local-dev `'default'` singleton balance + the one-time migration of
 * any remaining balance into `ai_credit_accounts`. The authoritative AI credit
 * balance lives in `ai_credit_accounts` and is mutated exclusively through the
 * atomic SECURITY DEFINER RPCs (see `server/data/credits.ts`).
 *
 * The balance mutations here use a read-then-write against the service-role
 * client. That is acceptable because the only balance that is ever decremented
 * through this path is the `'default'` local-dev singleton (authenticated users
 * always resolve to the RPC-backed `ai_credit_accounts` path); production never
 * mutates a real user's `credit_balances.balance` here.
 */

export type CreditBalanceRow = Database['public']['Tables']['credit_balances']['Row']

/**
 * Ensure a `credit_balances` row exists for `id`, creating it with the given
 * default balance + `free` plan when missing. Mirrors the Prisma
 * `creditBalance.upsert({ update: {}, create: {...} })` (create-or-no-op).
 */
export async function ensureCreditBalance(
  id: string,
  createBalance: number,
): Promise<CreditBalanceRow> {
  const admin = getSupabaseAdmin()

  const existing = await getCreditBalance(id)
  if (existing) return existing

  const { data, error } = await admin
    .from('credit_balances')
    .upsert({ id, balance: createBalance, plan: 'free' }, { onConflict: 'id', ignoreDuplicates: true })
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`credit_balances upsert failed: ${error.message}`)
  if (data) return data

  // Lost the insert race (ignoreDuplicates → no row returned): re-read.
  const row = await getCreditBalance(id)
  if (!row) throw new Error('credit_balances upsert returned no row')
  return row
}

/** Read a `credit_balances` row, or null when none exists. */
export async function getCreditBalance(id: string): Promise<CreditBalanceRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`credit_balances read failed: ${error.message}`)
  return data
}

/** Set the absolute balance for a `credit_balances` row and return the new row. */
export async function setCreditBalance(id: string, balance: number): Promise<CreditBalanceRow> {
  const { data, error } = await getSupabaseAdmin()
    .from('credit_balances')
    .update({ balance })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`credit_balances update failed: ${error.message}`)
  return data
}

/** Set the plan for a `credit_balances` row and return the new row. */
export async function setCreditBalancePlan(id: string, plan: string): Promise<CreditBalanceRow> {
  const { data, error } = await getSupabaseAdmin()
    .from('credit_balances')
    .update({ plan })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`credit_balances plan update failed: ${error.message}`)
  return data
}

export const creditBalancesRepo = {
  ensureCreditBalance,
  getCreditBalance,
  setCreditBalance,
  setCreditBalancePlan,
}

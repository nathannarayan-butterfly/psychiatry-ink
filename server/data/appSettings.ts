import { getSupabaseAdmin } from '../services/supabaseAdmin'

/**
 * appSettingsRepo — typed data-access seam for the `app_settings` key/value
 * table (Prisma model `AppSetting` → `app_settings`). Server (service-role)
 * only; used as the Stripe webhook idempotency marker store.
 *
 * `claimEventMarker` is the idempotency gate: it INSERTs a unique key and reports
 * whether this caller won the insert. A unique-violation (Postgres `23505`) means
 * the event was already claimed → the caller no-ops. If the subsequent work
 * fails, the caller releases the marker so Stripe's retry can reprocess. This is
 * the supabase-js equivalent of the previous Prisma `appSetting.create` + P2002
 * idempotency pattern.
 */

const UNIQUE_VIOLATION = '23505'

/**
 * Atomically claim an idempotency marker. Returns true when this caller inserted
 * the key (first delivery), false when it already existed (duplicate delivery).
 */
export async function claimEventMarker(key: string): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from('app_settings')
    .insert({ key, value: new Date().toISOString() })
  if (!error) return true
  if ((error as { code?: string }).code === UNIQUE_VIOLATION) return false
  throw new Error(`app_settings marker claim failed: ${error.message}`)
}

/** Release a previously claimed marker (best-effort; swallows not-found). */
export async function releaseEventMarker(key: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('app_settings').delete().eq('key', key)
  if (error) throw new Error(`app_settings marker release failed: ${error.message}`)
}

export const appSettingsRepo = {
  claimEventMarker,
  releaseEventMarker,
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'
import { fetchWithTimeout } from '../utils/httpTimeout'
import type { Database } from '../types/database'

/**
 * Generalised server-side Supabase **service-role** client for the consolidation
 * data layer (Prisma → Supabase). Mirrors the existing `kbSupabaseAdmin.ts`
 * pattern (memoised client + bounded fetch), but is typed against the generated
 * `Database` schema so the per-feature repository modules in `server/data/*`
 * get compile-time checking of tables, columns and RPC signatures.
 *
 * Service-role bypasses RLS — the Express API already binds `userId`/`accountId`
 * from verified auth (`requireRouteAuth`) before any read/write, so callers MUST
 * continue to scope every query by the authenticated owner.
 *
 * NOTE: this is foundation scaffolding for Prerequisite P. No existing
 * Prisma-backed call site imports it yet; the parallel workstreams wire it in.
 */
export type AppSupabaseClient = SupabaseClient<Database>

let adminClient: AppSupabaseClient | null = null

const SUPABASE_ADMIN_TIMEOUT_MS = Number(process.env.SUPABASE_ADMIN_TIMEOUT_MS ?? 30_000)

/** Bounded fetch so a hung Supabase REST/Storage call cannot pin a handler. */
function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  return fetchWithTimeout(url, {
    ...(init ?? {}),
    timeoutMs: SUPABASE_ADMIN_TIMEOUT_MS,
    label: 'Supabase admin',
  })
}

function readEnv(): { url: string; serviceKey: string } {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  return { url, serviceKey }
}

export function isSupabaseAdminConfigured(): boolean {
  const { url, serviceKey } = readEnv()
  return Boolean(url && serviceKey)
}

/**
 * Returns the memoised, typed service-role client. Throws if env is missing so
 * misconfiguration fails loud at first use rather than silently mis-reading.
 */
export function getSupabaseAdmin(): AppSupabaseClient {
  if (adminClient) return adminClient

  const { url, serviceKey } = readEnv()
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
        'Use the secret key (sb_secret_…) or legacy service_role JWT — server-side only, never VITE_*.',
    )
  }

  // @supabase/supabase-js v2's conditional schema generics make the
  // `createClient<Database>()` return type fail to structurally unify with the
  // explicit `SupabaseClient<Database>` alias; cast once here (the runtime object
  // is a valid typed client) so repos still get full Database typing.
  adminClient = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: boundedFetch },
    realtime: {
      // The `ws` package's WebSocket constructor is the documented Node transport for
      // supabase-js realtime and is structurally compatible at runtime; the mismatch is a
      // known @supabase/supabase-js + @types/ws typing gap.
      // @ts-expect-error third-party type gap (ws WebSocket vs WebSocketLikeConstructor)
      transport: ws,
    },
  }) as unknown as AppSupabaseClient
  return adminClient
}

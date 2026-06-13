import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'

let adminClient: SupabaseClient | null = null

export function getKbSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient

  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  if (!url || !serviceKey) {
    throw new Error(
      'KB admin requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
        'Use the secret key (sb_secret_…) or legacy service_role JWT — server-side only, never VITE_*.',
    )
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  })
  return adminClient
}

export function isKbAdminConfigured(): boolean {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  return Boolean(url && serviceKey)
}

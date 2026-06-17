import type { MedicationMarketAvailability } from '../types/knowledgeBase'
import { getSupabase } from '../lib/supabase'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

/**
 * Supabase data-access for the shared country-specific medication preparations
 * (market availability).
 *
 * Like the KB drugs, preparations are GLOBAL clinical reference content (not
 * patient data, not encrypted) shared across all users/devices. The whole
 * `MedicationMarketAvailability` object is stored in a single JSONB `data`
 * column; `substance_id`, `country_code`, `verification_status`,
 * `generic_name`, and `trade_name` are denormalized for cheap
 * filtering/sorting; everything else lives inside `data`.
 *
 * READ is public and served directly by the browser anon client. WRITE is gated
 * by RLS (`is_kb_editor()` / `app_metadata.kb_admin`), so direct browser writes
 * silently fail for non-editor clinicians. All writes are therefore routed
 * through the service-role server endpoint (`/api/kb-admin/preparations`), which
 * authenticates the caller and authorizes KB-editor permission before writing.
 *
 * Table + RLS: see `supabase/knowledge_base_preparations.sql`.
 */

export const KNOWLEDGE_BASE_PREPARATIONS_TABLE = 'knowledge_base_preparations'

/** True when a usable Supabase client exists (env configured). */
export function isPreparationsSupabaseReady(): boolean {
  return getSupabase() != null
}

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen).')
  }
  return supabase
}

/** Fetch every preparation. Returns the canonical JSONB payload of each row. */
export async function fetchAllPreparations(): Promise<MedicationMarketAvailability[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(KNOWLEDGE_BASE_PREPARATIONS_TABLE)
    .select('data')
    .order('generic_name', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as { data: MedicationMarketAvailability }[]
  return rows
    .map((row) => row.data)
    .filter((preparation): preparation is MedicationMarketAvailability => preparation != null)
}

async function kbWriteFetch(path: string, init: RequestInit): Promise<void> {
  const auth = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/kb-admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...auth,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `KB preparation write failed (${res.status})`)
  }
}

/**
 * Insert-or-update one or more preparations (write-through) via the service-role
 * server endpoint. No-op for empty input. Throws for non-editor callers
 * (handled by the caller, which keeps the optimistic local cache).
 */
export async function upsertPreparations(preparations: MedicationMarketAvailability[]): Promise<void> {
  if (preparations.length === 0) return
  await kbWriteFetch('/preparations', {
    method: 'POST',
    body: JSON.stringify({ preparations }),
  })
}

/** Delete a preparation by id via the service-role server endpoint. */
export async function deletePreparation(id: string): Promise<void> {
  await kbWriteFetch(`/preparations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

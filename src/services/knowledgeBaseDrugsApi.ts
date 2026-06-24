import type { KnowledgeBaseDrug } from '../types/knowledgeBase'
import { getSupabase } from '../lib/supabase'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

/**
 * Supabase data-access for the shared Wissensdatenbank (KB) medication entries.
 *
 * The KB is GLOBAL clinical reference content (not patient data, not encrypted)
 * shared across all users/devices. Because `KnowledgeBaseDrug` is deeply nested
 * and forward-evolving, the whole object is stored in a single JSONB `data`
 * column. `collection_id` and `generic_name` are denormalized for cheap
 * filtering/sorting; everything else lives inside `data`.
 *
 * READ is public and served directly by the browser anon client. WRITE is gated
 * by RLS (`is_kb_editor()` / `app_metadata.kb_admin`), so direct browser writes
 * silently fail for non-editor clinicians. All writes are therefore routed
 * through the service-role server endpoint (`/api/kb-admin/drugs`), which
 * authenticates the caller and authorizes KB-editor permission before writing.
 *
 * Table + RLS: see `supabase/knowledge_base_drugs.sql`.
 */

export const KNOWLEDGE_BASE_DRUGS_TABLE = 'knowledge_base_drugs'

/** True when a usable Supabase client exists (env configured). */
export function isKnowledgeBaseSupabaseReady(): boolean {
  return getSupabase() != null
}

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen).')
  }
  return supabase
}

/**
 * Page size for the paginated KB drug fetch. Deliberately well below
 * PostgREST's configurable `db-max-rows` default so we never hit the cap on a
 * single request; the loop below keeps requesting until the full catalog has
 * been retrieved.
 */
const KB_DRUGS_FETCH_PAGE_SIZE = 1000

/**
 * Fetch EVERY KB drug. Returns the canonical JSONB payload of each row.
 *
 * The Wissensdatenbank must always render the COMPLETE catalog, so we page
 * through the table with explicit `.range()` windows instead of issuing a
 * single unbounded `select`. A bare `select` is silently truncated to
 * PostgREST's `db-max-rows` limit (1000 by default), which would hide drugs
 * once the catalog grows past that point — exactly the "incomplete list" class
 * of bug. Paginating guarantees nothing is permanently hidden.
 */
export async function fetchAllKnowledgeBaseDrugs(): Promise<KnowledgeBaseDrug[]> {
  const supabase = requireSupabase()
  const drugs: KnowledgeBaseDrug[] = []

  for (let from = 0; ; from += KB_DRUGS_FETCH_PAGE_SIZE) {
    const to = from + KB_DRUGS_FETCH_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from(KNOWLEDGE_BASE_DRUGS_TABLE)
      .select('data')
      .order('generic_name', { ascending: true })
      .range(from, to)

    if (error) throw error
    const rows = (data ?? []) as { data: KnowledgeBaseDrug }[]
    for (const row of rows) {
      if (row.data != null) drugs.push(row.data)
    }

    // A short (or empty) page means we've reached the end of the table.
    if (rows.length < KB_DRUGS_FETCH_PAGE_SIZE) break
  }

  return drugs
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
    throw new Error(body.error ?? `KB drug write failed (${res.status})`)
  }
}

/**
 * Insert-or-update one or more KB drugs (write-through) via the service-role
 * server endpoint. No-op for empty input. Throws for non-editor callers
 * (handled by the caller, which keeps the optimistic local cache).
 */
export async function upsertKnowledgeBaseDrugs(drugs: KnowledgeBaseDrug[]): Promise<void> {
  if (drugs.length === 0) return
  await kbWriteFetch('/drugs', {
    method: 'POST',
    body: JSON.stringify({ drugs }),
  })
}

/** Delete a KB drug by id via the service-role server endpoint. */
export async function deleteKnowledgeBaseDrug(id: string): Promise<void> {
  await kbWriteFetch(`/drugs/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

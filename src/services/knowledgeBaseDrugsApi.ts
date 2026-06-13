import type { KnowledgeBaseDrug } from '../types/knowledgeBase'
import { getSupabase } from '../lib/supabase'

/**
 * Supabase data-access for the shared Wissensdatenbank (KB) medication entries.
 *
 * The KB is GLOBAL clinical reference content (not patient data, not encrypted)
 * shared across all users/devices. Because `KnowledgeBaseDrug` is deeply nested
 * and forward-evolving, the whole object is stored in a single JSONB `data`
 * column. `collection_id` and `generic_name` are denormalized for cheap
 * filtering/sorting; everything else lives inside `data`.
 *
 * Table + RLS: see `supabase/knowledge_base_drugs.sql`.
 */

export const KNOWLEDGE_BASE_DRUGS_TABLE = 'knowledge_base_drugs'

interface KnowledgeBaseDrugRow {
  id: string
  data: KnowledgeBaseDrug
  collection_id: string | null
  generic_name: string | null
  created_at?: string
  updated_at?: string
}

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

/** Map a domain object to a persisted row. `created_at` is left to the DB default. */
function toRow(drug: KnowledgeBaseDrug): KnowledgeBaseDrugRow {
  return {
    id: drug.id,
    data: drug,
    collection_id: drug.collectionId ?? null,
    generic_name: drug.genericName ?? null,
    updated_at: new Date().toISOString(),
  }
}

/** Fetch every KB drug. Returns the canonical JSONB payload of each row. */
export async function fetchAllKnowledgeBaseDrugs(): Promise<KnowledgeBaseDrug[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from(KNOWLEDGE_BASE_DRUGS_TABLE)
    .select('data')
    .order('generic_name', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as { data: KnowledgeBaseDrug }[]
  return rows.map((row) => row.data).filter((drug): drug is KnowledgeBaseDrug => drug != null)
}

/** Insert-or-update one or more KB drugs (write-through). No-op for empty input. */
export async function upsertKnowledgeBaseDrugs(drugs: KnowledgeBaseDrug[]): Promise<void> {
  if (drugs.length === 0) return
  const supabase = requireSupabase()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_DRUGS_TABLE)
    .upsert(drugs.map(toRow), { onConflict: 'id' })
  if (error) throw error
}

/** Delete a KB drug by id. */
export async function deleteKnowledgeBaseDrug(id: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_DRUGS_TABLE)
    .delete()
    .eq('id', id)
  if (error) throw error
}

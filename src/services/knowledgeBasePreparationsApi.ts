import type { MedicationMarketAvailability } from '../types/knowledgeBase'
import { getSupabase } from '../lib/supabase'

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
 * Table + RLS: see `supabase/knowledge_base_preparations.sql`.
 */

export const KNOWLEDGE_BASE_PREPARATIONS_TABLE = 'knowledge_base_preparations'

interface KnowledgeBasePreparationRow {
  id: string
  data: MedicationMarketAvailability
  substance_id: string | null
  country_code: string | null
  verification_status: string | null
  generic_name: string | null
  trade_name: string | null
  created_at?: string
  updated_at?: string
}

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

/** Map a domain object to a persisted row. `created_at` is left to the DB default. */
function toRow(preparation: MedicationMarketAvailability): KnowledgeBasePreparationRow {
  return {
    id: preparation.id,
    data: preparation,
    substance_id: preparation.substanceId ?? null,
    country_code: preparation.countryCode ?? null,
    verification_status: preparation.verificationStatus ?? null,
    generic_name: preparation.genericName ?? null,
    trade_name: preparation.tradeName ?? null,
    updated_at: new Date().toISOString(),
  }
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

/** Insert-or-update one or more preparations (write-through). No-op for empty input. */
export async function upsertPreparations(preparations: MedicationMarketAvailability[]): Promise<void> {
  if (preparations.length === 0) return
  const supabase = requireSupabase()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_PREPARATIONS_TABLE)
    .upsert(preparations.map(toRow), { onConflict: 'id' })
  if (error) throw error
}

/** Delete a preparation by id. */
export async function deletePreparation(id: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_PREPARATIONS_TABLE)
    .delete()
    .eq('id', id)
  if (error) throw error
}

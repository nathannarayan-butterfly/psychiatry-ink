import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
} from '../../src/types/knowledgeBase'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

/**
 * Service-role writer for the legacy JSONB KB tables (`knowledge_base_drugs`,
 * `knowledge_base_preparations`).
 *
 * Public READ on these tables stays open and is served directly by the browser
 * anon client. WRITES are gated by RLS (`is_kb_editor()` / `app_metadata.kb_admin`)
 * so direct browser writes silently fail for non-admin clinicians. Legitimate
 * KB-editor writes are routed here and performed with the service-role client,
 * which bypasses RLS. Authorization is enforced UPSTREAM in the route layer
 * (`requireKbEditor`) — this module performs no auth and must only ever be
 * reached after gating.
 *
 * Row shape mirrors the client mappers in
 * `src/services/knowledgeBaseDrugsApi.ts` and
 * `src/services/knowledgeBasePreparationsApi.ts`.
 */

export const KNOWLEDGE_BASE_DRUGS_TABLE = 'knowledge_base_drugs'
export const KNOWLEDGE_BASE_PREPARATIONS_TABLE = 'knowledge_base_preparations'

interface KnowledgeBaseDrugRow {
  id: string
  data: KnowledgeBaseDrug
  collection_id: string | null
  generic_name: string | null
  updated_at: string
}

interface KnowledgeBasePreparationRow {
  id: string
  data: MedicationMarketAvailability
  substance_id: string | null
  country_code: string | null
  verification_status: string | null
  generic_name: string | null
  trade_name: string | null
  updated_at: string
}

function drugToRow(drug: KnowledgeBaseDrug): KnowledgeBaseDrugRow {
  return {
    id: drug.id,
    data: drug,
    collection_id: drug.collectionId ?? null,
    generic_name: drug.genericName ?? null,
    updated_at: new Date().toISOString(),
  }
}

function preparationToRow(preparation: MedicationMarketAvailability): KnowledgeBasePreparationRow {
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

/** Insert-or-update one or more KB drugs via the service-role client. */
export async function adminUpsertKnowledgeBaseDrugs(drugs: KnowledgeBaseDrug[]): Promise<void> {
  if (drugs.length === 0) return
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_DRUGS_TABLE)
    .upsert(drugs.map(drugToRow), { onConflict: 'id' })
  if (error) throw error
}

/** Delete a KB drug by id via the service-role client. */
export async function adminDeleteKnowledgeBaseDrug(id: string): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from(KNOWLEDGE_BASE_DRUGS_TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Insert-or-update one or more preparations via the service-role client. */
export async function adminUpsertPreparations(
  preparations: MedicationMarketAvailability[],
): Promise<void> {
  if (preparations.length === 0) return
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase
    .from(KNOWLEDGE_BASE_PREPARATIONS_TABLE)
    .upsert(preparations.map(preparationToRow), { onConflict: 'id' })
  if (error) throw error
}

/** Delete a preparation by id via the service-role client. */
export async function adminDeletePreparation(id: string): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from(KNOWLEDGE_BASE_PREPARATIONS_TABLE).delete().eq('id', id)
  if (error) throw error
}

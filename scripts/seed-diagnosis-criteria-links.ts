/**
 * Populates diagnosis_criteria_links from authored Butterfly criterion trees.
 * Links are optional — catalogue search/selection does not depend on them.
 *
 * Run after: npm run db:seed-catalogue
 *   npm run db:seed-criteria-links
 */
import dotenv from 'dotenv'
import { getSupabaseAdmin } from '../server/services/supabaseAdmin.ts'
import type { Database } from '../server/types/database.ts'
import { DISORDER_CRITERIA } from '../src/data/diagnosisCriteria/index.ts'
import { matchDisorderToCodes } from '../src/data/diagnosisCriteria/match.ts'
import type { Disorder } from '../src/data/diagnosisCriteria/schema.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

type CriteriaLinkInsert = Database['public']['Tables']['diagnosis_criteria_links']['Insert']
type CriteriaSystem = Database['public']['Enums']['diagnosis_criteria_system']
type SupportStatus = Database['public']['Enums']['diagnosis_criteria_support_status']

function normCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

function anchorsFor(disorder: Disorder): { icd10: string[]; icd11: string[] } {
  const icd10 = [
    disorder.code,
    disorder.crosswalkKey,
    disorder.codingSystems.icd10?.code,
  ]
    .map(normCode)
    .filter((c) => /^F\d/.test(c))

  const icd11 = [disorder.codingSystems.icd11?.code]
    .map(normCode)
    .filter((c) => /^6[A-E]/.test(c))

  return {
    icd10: [...new Set(icd10)],
    icd11: [...new Set(icd11)],
  }
}

interface EntryRow {
  id: string
  codeNormalized: string
  system: string
}

async function loadEntries(admin: ReturnType<typeof getSupabaseAdmin>): Promise<EntryRow[]> {
  const out: EntryRow[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('diagnosis_entries')
      .select('id, code_normalized, catalogue:diagnosis_catalogues(system)')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`diagnosis_entries read failed: ${error.message}`)
    for (const row of data ?? []) {
      // The embedded catalogue is a single related row (FK), typed by codegen as
      // an object; guard defensively in case PostgREST returns an array shape.
      const cat = row.catalogue as { system: string } | { system: string }[] | null
      const system = Array.isArray(cat) ? cat[0]?.system : cat?.system
      if (system) out.push({ id: row.id, codeNormalized: row.code_normalized, system })
    }
    if (!data || data.length < pageSize) break
  }
  return out
}

async function main() {
  const admin = getSupabaseAdmin()
  const entries = await loadEntries(admin)

  const bySystemCode = new Map<string, string>()
  for (const entry of entries) {
    bySystemCode.set(`${entry.system}:${entry.codeNormalized}`, entry.id)
  }

  const links: CriteriaLinkInsert[] = []

  for (const disorder of DISORDER_CRITERIA) {
    const { icd10, icd11 } = anchorsFor(disorder)
    const hasNativeIcd11 = Boolean(disorder.icd11?.groups?.length)
    const supportStatus: SupportStatus = hasNativeIcd11 ? 'native' : 'fallback'

    for (const code of icd10) {
      const entryId = bySystemCode.get(`ICD10GM:${code}`)
      if (entryId) {
        links.push({
          diagnosis_entry_id: entryId,
          criteria_tree_id: disorder.id,
          criteria_system: 'ICD10' as CriteriaSystem,
          support_status: supportStatus,
        })
      }
    }

    for (const code of icd11) {
      const entryId = bySystemCode.get(`ICD11MMS:${normCode(code)}`)
      if (entryId) {
        links.push({
          diagnosis_entry_id: entryId,
          criteria_tree_id: disorder.id,
          criteria_system: 'ICD11' as CriteriaSystem,
          support_status: supportStatus,
        })
      }
    }

    // Stem / prefix matching for catalogue entries
    for (const entry of entries) {
      if (entry.system === 'ICD10GM') {
        const matched = matchDisorderToCodes(entry.codeNormalized, undefined)
        if (matched?.id === disorder.id) {
          links.push({
            diagnosis_entry_id: entry.id,
            criteria_tree_id: disorder.id,
            criteria_system: 'ICD10' as CriteriaSystem,
            support_status: supportStatus,
          })
        }
      }
      if (entry.system === 'ICD11MMS') {
        const matched11 = matchDisorderToCodes(undefined, entry.codeNormalized)
        if (matched11?.id === disorder.id) {
          links.push({
            diagnosis_entry_id: entry.id,
            criteria_tree_id: disorder.id,
            criteria_system: 'ICD11' as CriteriaSystem,
            support_status: supportStatus,
          })
        }
      }
    }
  }

  const deduped = new Map<string, CriteriaLinkInsert>()
  for (const link of links) {
    deduped.set(`${link.diagnosis_entry_id}:${link.criteria_tree_id}:${link.criteria_system}`, link)
  }
  const unique = [...deduped.values()]

  const { error: delError } = await admin
    .from('diagnosis_criteria_links')
    .delete()
    .not('id', 'is', null)
  if (delError) throw new Error(`diagnosis_criteria_links clear failed: ${delError.message}`)

  const batchSize = 500
  for (let i = 0; i < unique.length; i += batchSize) {
    const { error } = await admin
      .from('diagnosis_criteria_links')
      .insert(unique.slice(i, i + batchSize))
    if (error) throw new Error(`diagnosis_criteria_links insert failed: ${error.message}`)
  }

  console.log(`[seed-criteria-links] created ${unique.length} criteria links`)
}

main().catch((error) => {
  console.error('[seed-criteria-links] failed', error)
  process.exit(1)
})

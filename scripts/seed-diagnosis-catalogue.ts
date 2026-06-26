/**
 * Seeds diagnosis catalogues into Supabase (`public.diagnosis_catalogues`,
 * `_entries`, `_synonyms`) via the service-role client.
 * Run: npm run db:seed-catalogue
 *
 * Build catalogue JSON first:
 *   npm run db:build-catalogue
 * Or both: npm run db:import-catalogue
 */
import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSupabaseAdmin } from '../server/services/supabaseAdmin.ts'
import type { Database } from '../server/types/database.ts'
import type { CatalogueBundle } from './lib/diagnosisImportSources.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

type CatalogueSystem = Database['public']['Enums']['diagnosis_catalogue_system']
type DiagnosisEntryInsert = Database['public']['Tables']['diagnosis_entries']['Insert']
type DiagnosisSynonymInsert = Database['public']['Tables']['diagnosis_synonyms']['Insert']

const BATCH_SIZE = 500

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const jsonPath = join(here, '../data/diagnosis-catalogue.json')
  const raw = readFileSync(jsonPath, 'utf8')
  const bundle = JSON.parse(raw) as CatalogueBundle

  console.log(`[seed-catalogue] importing ${bundle.catalogues.length} catalogues`)

  const admin = getSupabaseAdmin()

  // Clear in FK order (links → synonyms → entries → catalogues). PostgREST
  // requires a filter on delete; `id is not null` matches every row.
  for (const table of [
    'diagnosis_criteria_links',
    'diagnosis_synonyms',
    'diagnosis_entries',
    'diagnosis_catalogues',
  ] as const) {
    const { error } = await admin.from(table).delete().not('id', 'is', null)
    if (error) throw new Error(`${table} clear failed: ${error.message}`)
  }

  for (const catalogue of bundle.catalogues) {
    const { data: created, error: catError } = await admin
      .from('diagnosis_catalogues')
      .insert({
        system: catalogue.system as CatalogueSystem,
        version: catalogue.version,
        language: catalogue.language,
        source: catalogue.source,
        active: true,
        metadata_json: (catalogue.metadata ?? {}) as Database['public']['Tables']['diagnosis_catalogues']['Insert']['metadata_json'],
      })
      .select('id')
      .single()
    if (catError) throw new Error(`diagnosis_catalogues insert failed: ${catError.message}`)
    const catalogueId = created.id

    const entryRows: DiagnosisEntryInsert[] = catalogue.entries.map((entry) => ({
      catalogue_id: catalogueId,
      code: entry.code,
      code_normalized: entry.codeNormalized,
      title: entry.title,
      short_title: entry.shortTitle ?? null,
      description: entry.description ?? null,
      chapter_code: entry.chapterCode ?? null,
      chapter_title: entry.chapterTitle ?? null,
      block_code: entry.blockCode ?? null,
      block_title: entry.blockTitle ?? null,
      parent_code: entry.parentCode ?? null,
      hierarchy_level: entry.hierarchyLevel,
      is_category: entry.isCategory,
      is_selectable: entry.isSelectable,
      is_residual_category: entry.isResidualCategory,
      is_psychiatric: entry.isPsychiatric,
      is_somatic: entry.isSomatic,
      search_text: entry.searchText,
      source_uri: entry.sourceUri ?? null,
      source_version: catalogue.version,
    }))

    for (let i = 0; i < entryRows.length; i += BATCH_SIZE) {
      const { error } = await admin
        .from('diagnosis_entries')
        .insert(entryRows.slice(i, i + BATCH_SIZE))
      if (error) throw new Error(`diagnosis_entries insert failed: ${error.message}`)
    }

    // Resolve the generated entry ids by normalized code so synonyms can link.
    const idByCode = new Map<string, string>()
    {
      const pageSize = 1000
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await admin
          .from('diagnosis_entries')
          .select('id, code_normalized')
          .eq('catalogue_id', catalogueId)
          .range(from, from + pageSize - 1)
        if (error) throw new Error(`diagnosis_entries read failed: ${error.message}`)
        for (const e of data ?? []) idByCode.set(e.code_normalized, e.id)
        if (!data || data.length < pageSize) break
      }
    }

    const synonymRows: DiagnosisSynonymInsert[] = catalogue.entries
      .flatMap((entry) =>
        (entry.synonyms ?? []).map((term) => ({
          diagnosis_entry_id: idByCode.get(entry.codeNormalized) ?? '',
          term,
          normalized_term: term.toLowerCase().trim(),
          language: catalogue.language,
          source: 'import',
        })),
      )
      .filter((s) => s.diagnosis_entry_id)

    for (let i = 0; i < synonymRows.length; i += BATCH_SIZE) {
      const { error } = await admin
        .from('diagnosis_synonyms')
        .insert(synonymRows.slice(i, i + BATCH_SIZE))
      if (error) throw new Error(`diagnosis_synonyms insert failed: ${error.message}`)
    }

    console.log(
      `[seed-catalogue] ${catalogue.system} v${catalogue.version}: ${entryRows.length} entries, ${synonymRows.length} synonyms`,
    )
  }
}

main().catch((error) => {
  console.error('[seed-catalogue] failed', error)
  process.exit(1)
})

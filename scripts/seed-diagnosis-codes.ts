/**
 * Seeds ICD-10 / ICD-11 / DSM-5-TR reference codes into Supabase
 * (`public.diagnosis_codes`) via the service-role client.
 * Run: npm run db:seed-diagnoses
 *
 * Build the crosswalk first from official WHO + optional BfArM sources:
 *   npm run db:build-diagnoses
 * Or both: npm run db:import-diagnoses
 */
import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSupabaseAdmin } from '../server/services/supabaseAdmin.ts'
import type { Database } from '../server/types/database.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

type DiagnosisCodeInsert = Database['public']['Tables']['diagnosis_codes']['Insert']

type CrosswalkSeed = {
  icd10: { code: string; label: string }
  icd11: { code: string; label: string }
  dsm5tr: { code: string; label: string }
}

function buildSearchText(parts: string[]): string {
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim()
}

function crosswalkRows(entry: CrosswalkSeed): DiagnosisCodeInsert[] {
  const base = {
    icd10_code: entry.icd10.code,
    icd10_label: entry.icd10.label,
    icd11_code: entry.icd11.code,
    icd11_label: entry.icd11.label,
    dsm_code: entry.dsm5tr.code,
    dsm_label: entry.dsm5tr.label,
  }

  return [
    {
      system: 'icd10',
      code: entry.icd10.code,
      label_de: entry.icd10.label,
      ...base,
      search_text: buildSearchText([
        entry.icd10.code,
        entry.icd10.label,
        entry.icd11.code,
        entry.icd11.label,
        entry.dsm5tr.code,
        entry.dsm5tr.label,
      ]),
    },
    ...(entry.icd11.code.trim()
      ? [
          {
            system: 'icd11',
            code: entry.icd11.code,
            label_de: entry.icd11.label,
            ...base,
            search_text: buildSearchText([
              entry.icd11.code,
              entry.icd11.label,
              entry.icd10.code,
              entry.icd10.label,
            ]),
          },
        ]
      : []),
    ...(entry.dsm5tr.code.trim()
      ? [
          {
            system: 'dsm5tr',
            code: entry.dsm5tr.code,
            label_de: entry.dsm5tr.label,
            ...base,
            search_text: buildSearchText([
              entry.dsm5tr.code,
              entry.dsm5tr.label,
              entry.icd10.code,
              entry.icd10.label,
            ]),
          },
        ]
      : []),
  ]
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const jsonPath = join(here, '../data/diagnosis-crosswalk.json')
  const raw = readFileSync(jsonPath, 'utf8')
  const entries = JSON.parse(raw) as CrosswalkSeed[]

  const rows = entries.flatMap(crosswalkRows)
  const deduped = new Map<string, DiagnosisCodeInsert>()
  for (const row of rows) {
    deduped.set(`${row.system}:${row.code}`, row)
  }
  const uniqueRows = [...deduped.values()]
  console.log(
    `[seed-diagnoses] importing ${entries.length} crosswalks -> ${uniqueRows.length} searchable codes`,
  )

  const admin = getSupabaseAdmin()

  // Replace the whole natural-key table: clear, then bulk insert in batches.
  const { error: delError } = await admin.from('diagnosis_codes').delete().not('code', 'is', null)
  if (delError) throw new Error(`diagnosis_codes clear failed: ${delError.message}`)

  const batchSize = 500
  for (let i = 0; i < uniqueRows.length; i += batchSize) {
    const { error } = await admin.from('diagnosis_codes').insert(uniqueRows.slice(i, i + batchSize))
    if (error) throw new Error(`diagnosis_codes insert failed: ${error.message}`)
  }

  const counts = new Map<string, number>()
  for (const row of uniqueRows) counts.set(row.system, (counts.get(row.system) ?? 0) + 1)
  console.log('[seed-diagnoses] counts by system:', [...counts.entries()])
}

main().catch((error) => {
  console.error('[seed-diagnoses] failed', error)
  process.exit(1)
})

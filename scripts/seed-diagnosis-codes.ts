/**
 * Seeds ICD-10 / ICD-11 / DSM-5-TR reference codes into SQLite.
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
import { PrismaClient } from '@prisma/client'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const prisma = new PrismaClient()

type CrosswalkSeed = {
  icd10: { code: string; label: string }
  icd11: { code: string; label: string }
  dsm5tr: { code: string; label: string }
}

function buildSearchText(parts: string[]): string {
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim()
}

function crosswalkRows(entry: CrosswalkSeed) {
  const base = {
    icd10Code: entry.icd10.code,
    icd10Label: entry.icd10.label,
    icd11Code: entry.icd11.code,
    icd11Label: entry.icd11.label,
    dsmCode: entry.dsm5tr.code,
    dsmLabel: entry.dsm5tr.label,
  }

  return [
    {
      system: 'icd10',
      code: entry.icd10.code,
      labelDe: entry.icd10.label,
      ...base,
      searchText: buildSearchText([
        entry.icd10.code,
        entry.icd10.label,
        entry.icd11.code,
        entry.icd11.label,
        entry.dsm5tr.code,
        entry.dsm5tr.label,
      ]),
    },
    {
      system: 'icd11',
      code: entry.icd11.code,
      labelDe: entry.icd11.label,
      ...base,
      searchText: buildSearchText([
        entry.icd11.code,
        entry.icd11.label,
        entry.icd10.code,
        entry.icd10.label,
      ]),
    },
    {
      system: 'dsm5tr',
      code: entry.dsm5tr.code,
      labelDe: entry.dsm5tr.label,
      ...base,
      searchText: buildSearchText([
        entry.dsm5tr.code,
        entry.dsm5tr.label,
        entry.icd10.code,
        entry.icd10.label,
      ]),
    },
  ]
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const jsonPath = join(here, '../prisma/data/diagnosis-crosswalk.json')
  const raw = readFileSync(jsonPath, 'utf8')
  const entries = JSON.parse(raw) as CrosswalkSeed[]

  const rows = entries.flatMap(crosswalkRows)
  const deduped = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    deduped.set(`${row.system}:${row.code}`, row)
  }
  const uniqueRows = [...deduped.values()]
  console.log(
    `[seed-diagnoses] importing ${entries.length} crosswalks → ${uniqueRows.length} searchable codes`,
  )

  await prisma.diagnosisCode.deleteMany()
  await prisma.diagnosisCode.createMany({ data: uniqueRows })

  const counts = await prisma.diagnosisCode.groupBy({
    by: ['system'],
    _count: { code: true },
  })
  console.log('[seed-diagnoses] counts by system:', counts)
}

main()
  .catch((error) => {
    console.error('[seed-diagnoses] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

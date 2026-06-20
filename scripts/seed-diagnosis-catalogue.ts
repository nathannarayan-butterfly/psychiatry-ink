/**
 * Seeds diagnosis catalogues into SQLite (Prisma).
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
import { PrismaClient } from '@prisma/client'
import type { CatalogueBundle } from './lib/diagnosisImportSources.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const prisma = new PrismaClient()

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const jsonPath = join(here, '../prisma/data/diagnosis-catalogue.json')
  const raw = readFileSync(jsonPath, 'utf8')
  const bundle = JSON.parse(raw) as CatalogueBundle

  console.log(`[seed-catalogue] importing ${bundle.catalogues.length} catalogues`)

  await prisma.diagnosisCriteriaLink.deleteMany()
  await prisma.diagnosisSynonym.deleteMany()
  await prisma.diagnosisEntry.deleteMany()
  await prisma.diagnosisCatalogue.deleteMany()

  for (const catalogue of bundle.catalogues) {
    const row = await prisma.diagnosisCatalogue.create({
      data: {
        system: catalogue.system,
        version: catalogue.version,
        language: catalogue.language,
        source: catalogue.source,
        active: true,
        metadataJson: JSON.stringify(catalogue.metadata ?? {}),
      },
    })

    const entryRows = catalogue.entries.map((entry) => ({
      catalogueId: row.id,
      code: entry.code,
      codeNormalized: entry.codeNormalized,
      title: entry.title,
      shortTitle: entry.shortTitle ?? null,
      description: entry.description ?? null,
      chapterCode: entry.chapterCode ?? null,
      chapterTitle: entry.chapterTitle ?? null,
      blockCode: entry.blockCode ?? null,
      blockTitle: entry.blockTitle ?? null,
      parentCode: entry.parentCode ?? null,
      hierarchyLevel: entry.hierarchyLevel,
      isCategory: entry.isCategory,
      isSelectable: entry.isSelectable,
      isResidualCategory: entry.isResidualCategory,
      isPsychiatric: entry.isPsychiatric,
      isSomatic: entry.isSomatic,
      searchText: entry.searchText,
      sourceUri: entry.sourceUri ?? null,
      sourceVersion: catalogue.version,
      metadataJson: '{}',
    }))

    const batchSize = 500
    for (let i = 0; i < entryRows.length; i += batchSize) {
      await prisma.diagnosisEntry.createMany({ data: entryRows.slice(i, i + batchSize) })
    }

    const createdEntries = await prisma.diagnosisEntry.findMany({
      where: { catalogueId: row.id },
      select: { id: true, codeNormalized: true },
    })
    const idByCode = new Map(createdEntries.map((e) => [e.codeNormalized, e.id]))

    const synonymRows = catalogue.entries.flatMap((entry) =>
      (entry.synonyms ?? []).map((term) => ({
        diagnosisEntryId: idByCode.get(entry.codeNormalized)!,
        term,
        normalizedTerm: term.toLowerCase().trim(),
        language: catalogue.language,
        source: 'import',
      })),
    ).filter((s) => s.diagnosisEntryId)

    if (synonymRows.length > 0) {
      for (let i = 0; i < synonymRows.length; i += batchSize) {
        await prisma.diagnosisSynonym.createMany({ data: synonymRows.slice(i, i + batchSize) })
      }
    }

    console.log(
      `[seed-catalogue] ${catalogue.system} v${catalogue.version}: ${entryRows.length} entries, ${synonymRows.length} synonyms`,
    )
  }
}

main()
  .catch((error) => {
    console.error('[seed-catalogue] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

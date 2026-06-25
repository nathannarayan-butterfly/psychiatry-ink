#!/usr/bin/env tsx
/**
 * Translate Klinisches Wissen (KnowledgeEntry) seed data to English using DeepSeek.
 * Covers title, category, tags, section labels, and section body text.
 *
 * Usage:
 *   npm run kb:translate-clinical-en
 *   npm run kb:translate-clinical-en -- --dry-run
 *   npm run kb:translate-clinical-en -- --force
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { KNOWLEDGE_BASE_SEED, type KnowledgeEntry } from '../src/data/knowledgeBaseSeedData'
import {
  countMissingEnglish,
  translateKbItem,
} from './lib/kbEnglishTranslation'
import {
  assertDeepSeekConfigured,
  createDeepSeekTranslateBatch,
  createUsageTally,
  DEEPSEEK_MODEL_ID,
} from './lib/kbDeepSeekBackend'
import { ensureKnowledgeEntrySections, flattenEntrySections } from '../src/utils/kb/knowledgeEntrySections'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
const SEED_PATH = path.resolve('src/data/knowledgeBaseSeedData.ts')

async function main(): Promise<void> {
  const prepared = KNOWLEDGE_BASE_SEED.map((entry) => ensureKnowledgeEntrySections(entry))
  const missingBefore = prepared.reduce(
    (acc, entry) => acc + countMissingEnglish(entry as unknown as Record<string, unknown>),
    0,
  )

  console.log(
    `[kb:translate-clinical-en] ${prepared.length} entries, ${missingBefore} missing EN field(s) before run (force=${FORCE})`,
  )

  if (DRY_RUN) {
    for (const entry of prepared) {
      const missing = countMissingEnglish(entry as unknown as Record<string, unknown>)
      if (missing > 0) console.log(`  pending: ${entry.title} (${missing} fields)`)
    }
    return
  }

  if (missingBefore === 0 && !FORCE) {
    console.log('[kb:translate-clinical-en] All English fields populated — nothing to do.')
    writeSeedFile(prepared, { translated: 0, skipped: prepared.length, failed: 0 })
    return
  }

  assertDeepSeekConfigured()
  const tally = createUsageTally()
  const translateBatch = createDeepSeekTranslateBatch({ tally })
  const timestamp = new Date().toISOString()

  let translated = 0
  let skipped = 0
  let failed = 0

  for (const entry of prepared) {
    try {
      const res = await translateKbItem(entry as unknown as Record<string, unknown>, translateBatch, {
        force: FORCE,
        timestamp,
      })
      if (res.skipped) {
        skipped += 1
      } else {
        translated += 1
        entry.enContentSource = 'machine'
        entry.enTranslatedAt = timestamp
      }
      const flat = flattenEntrySections(entry)
      entry.content = flat.content
      entry.contentEn = flat.contentEn
      console.log(
        `[kb:translate-clinical-en] ${entry.title}: ${res.skipped ? 'skipped' : 'translated'} (${res.applied}/${res.requested}) model=${DEEPSEEK_MODEL_ID}`,
      )
    } catch (error) {
      failed += 1
      console.error(`[kb:translate-clinical-en] FAILED ${entry.title}:`, error)
    }
  }

  writeSeedFile(prepared, { translated, skipped, failed })
  console.log(`[kb:translate-clinical-en] DONE translated=${translated} skipped=${skipped} failed=${failed}`)
  console.log(`[kb:translate-clinical-en] provider counts: ${JSON.stringify(tally.providerCounts)}`)

  if (failed > 0) process.exitCode = 1
}

function writeSeedFile(
  entries: KnowledgeEntry[],
  summary: { translated: number; skipped: number; failed: number },
): void {
  const serialized = JSON.stringify(entries, null, 2)
    .split('\n')
    .map((line) => (line === '  {' || line.startsWith('  ') ? `  ${line.trimStart()}` : line))
    .join('\n')

  const source = readFileSync(SEED_PATH, 'utf8')
  const marker = 'export const KNOWLEDGE_BASE_SEED: KnowledgeEntry[] = ['
  const start = source.indexOf(marker)
  const end = source.lastIndexOf(']\n')
  if (start < 0 || end < 0) throw new Error('Could not locate KNOWLEDGE_BASE_SEED array in seed file.')

  const header = source.slice(0, start + marker.length)
  const footer = source.slice(end)
  const next = `${header}\n${serialized.slice(2, -1)}\n${footer}`

  writeFileSync(SEED_PATH, next)

  const reportDir = path.resolve('scripts/reports')
  mkdirSync(reportDir, { recursive: true })
  const reportFile = path.join(reportDir, `kb-clinical-en-translation-report-${Date.now()}.json`)
  writeFileSync(
    reportFile,
    JSON.stringify({ entries: entries.length, ...summary, seedPath: SEED_PATH, provider: 'deepseek' }, null, 2),
  )
  console.log(`[kb:translate-clinical-en] seed updated: ${SEED_PATH}`)
  console.log(`[kb:translate-clinical-en] report: ${reportFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env tsx
/**
 * Translate the German Knowledge-Base content into English so EN-locale
 * clinicians see English drug content. Covers BOTH layers:
 *   (a) the LIVE Supabase JSONB tables `knowledge_base_drugs` (157) and
 *       `knowledge_base_preparations` (27), and
 *   (b) the bundled TypeScript/JSON seed (verified — already EN on master).
 *
 * Guarantees:
 *  - DeepSeek is the ONLY translation provider (asserted per call; see
 *    `kbDeepSeekBackend.ts`). No Gemini/OpenAI fallback — ever.
 *  - Auto-publish: English fills the `*En` fields and is visible immediately.
 *    Every translated row is stamped `enContentSource:'machine'` and the source
 *    `verificationStatus` is PRESERVED (never upgraded).
 *  - MANDATORY snapshot BEFORE any write: every touched row is exported to
 *    `/tmp/kb-en-backup-<ISO>.json`; counts are verified before writing.
 *  - Idempotent / resumable: rows that already have English are skipped (unless
 *    `--force`); progress is appended to `/tmp/kb-en-translation-progress.log`.
 *
 * Usage:
 *   npm run kb:translate-en                 # snapshot + translate live + verify seed
 *   npm run kb:translate-en -- --dry-run    # no API calls, no writes (report only)
 *   npm run kb:translate-en -- --seed-only  # only verify the bundled seed
 *   npm run kb:translate-en -- --limit=5    # first 5 drugs (smoke)
 *   npm run kb:translate-en -- --only=Sertralin
 *   npm run kb:translate-en -- --force      # retranslate even populated *En
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import {
  adminUpsertKnowledgeBaseDrugs,
  adminUpsertPreparations,
  KNOWLEDGE_BASE_DRUGS_TABLE,
  KNOWLEDGE_BASE_PREPARATIONS_TABLE,
} from '../server/services/kbLegacyJsonbStore'
import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
} from '../src/types/knowledgeBase'
import {
  countMissingEnglish,
  translateKbItem,
  type TranslateBatchFn,
} from './lib/kbEnglishTranslation'
import {
  assertDeepSeekConfigured,
  createDeepSeekTranslateBatch,
  createUsageTally,
  DEEPSEEK_MODEL_ID,
} from './lib/kbDeepSeekBackend'
import {
  assertSnapshotComplete,
  buildSnapshot,
  type DrugSnapshotRow,
  type KbSnapshot,
  type PreparationSnapshotRow,
} from './lib/kbSnapshot'
import { KB_DRUG_SEED_DATA } from '../src/data/knowledgeBaseDrugSeedData'
import { KNOWLEDGE_BASE_SEED } from '../src/data/knowledgeBaseSeedData'
import { KB_PREPARATION_SEED_DATA } from '../src/data/knowledgeBasePreparationSeedData'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

// ── CLI args ────────────────────────────────────────────────────────────────
function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.split('=').slice(1).join('=') : undefined
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`)

const DRY_RUN = hasFlag('dry-run')
const FORCE = hasFlag('force')
const SEED_ONLY = hasFlag('seed-only')
const SKIP_LIVE = hasFlag('skip-live')
const LIMIT = parseArg('limit') ? Number(parseArg('limit')) : undefined
const ONLY = parseArg('only')
const CONCURRENCY = parseArg('concurrency') ? Math.max(1, Number(parseArg('concurrency'))) : 4
const DELAY_MS = parseArg('delay') ? Number(parseArg('delay')) : 200

const PROGRESS_LOG = '/tmp/kb-en-translation-progress.log'
const RUN_STARTED = new Date().toISOString()
const TIMESTAMP = RUN_STARTED

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function logProgress(line: string): void {
  const entry = `[${new Date().toISOString()}] ${line}`
  console.log(entry)
  try {
    appendFileSync(PROGRESS_LOG, `${entry}\n`)
  } catch {
    /* progress log is best-effort */
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
async function fetchDrugRows(supabase: SupabaseClient): Promise<DrugSnapshotRow[]> {
  const { data, error } = await supabase
    .from(KNOWLEDGE_BASE_DRUGS_TABLE)
    .select('id, data, collection_id, generic_name')
    .order('generic_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as DrugSnapshotRow[]
}

async function fetchPreparationRows(supabase: SupabaseClient): Promise<PreparationSnapshotRow[]> {
  const { data, error } = await supabase
    .from(KNOWLEDGE_BASE_PREPARATIONS_TABLE)
    .select('id, data, substance_id, country_code, verification_status, generic_name, trade_name')
    .order('generic_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as PreparationSnapshotRow[]
}

function writeSnapshot(snapshot: KbSnapshot): string {
  const file = `/tmp/kb-en-backup-${RUN_STARTED.replace(/[:.]/g, '-')}.json`
  writeFileSync(file, JSON.stringify(snapshot, null, 2))
  // Verify the file is non-empty and parses back to matching row counts.
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as KbSnapshot
  if (parsed.drugs.length !== snapshot.drugs.length || parsed.preparations.length !== snapshot.preparations.length) {
    throw new Error(`Snapshot file ${file} failed read-back verification.`)
  }
  return file
}

// ── Per-item processing ───────────────────────────────────────────────────────
interface ItemResult {
  id: string
  name: string
  status: 'translated' | 'skipped' | 'failed'
  requested: number
  applied: number
  error?: string
}

async function processCollection<T extends Record<string, unknown>>(params: {
  label: string
  items: T[]
  nameOf: (item: T) => string
  persist: (item: T) => Promise<void>
  translateBatch: TranslateBatchFn
}): Promise<ItemResult[]> {
  const { label, items, nameOf, persist, translateBatch } = params
  const results: ItemResult[] = []
  let cursor = 0
  let processed = 0

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const item = items[cursor++]
      const name = nameOf(item)
      const id = String(item.id ?? name)
      try {
        const res = await translateKbItem(item, translateBatch, { force: FORCE, timestamp: TIMESTAMP })
        if (res.skipped) {
          results.push({ id, name, status: 'skipped', requested: 0, applied: 0 })
        } else {
          if (res.applied > 0) await persist(item)
          results.push({
            id,
            name,
            status: 'translated',
            requested: res.requested,
            applied: res.applied,
          })
        }
        processed += 1
        logProgress(
          `${label} [${processed}/${items.length}] ${name}: ${res.skipped ? 'skipped' : 'translated'} ` +
            `(${res.applied}/${res.requested} fields) provider=deepseek model=${DEEPSEEK_MODEL_ID}`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        results.push({ id, name, status: 'failed', requested: 0, applied: 0, error: message })
        processed += 1
        logProgress(`${label} [${processed}/${items.length}] ${name}: FAILED — ${message}`)
      }
      await sleep(DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, () => worker()))
  return results
}

// ── Seed verification (covers the bundled layer) ──────────────────────────────
function verifyBundledSeed(): {
  drugs: { total: number; missing: number }
  knowledge: { total: number; missing: number }
  preparations: { total: number; missing: number }
} {
  const drugMissing = KB_DRUG_SEED_DATA.reduce(
    (acc, d) => acc + countMissingEnglish(d as unknown as Record<string, unknown>),
    0,
  )
  const knowledgeMissing = KNOWLEDGE_BASE_SEED.reduce(
    (acc, e) => acc + countMissingEnglish(e as unknown as Record<string, unknown>),
    0,
  )
  const prepMissing = KB_PREPARATION_SEED_DATA.reduce(
    (acc, p) => acc + countMissingEnglish(p as unknown as Record<string, unknown>),
    0,
  )
  return {
    drugs: { total: KB_DRUG_SEED_DATA.length, missing: drugMissing },
    knowledge: { total: KNOWLEDGE_BASE_SEED.length, missing: knowledgeMissing },
    preparations: { total: KB_PREPARATION_SEED_DATA.length, missing: prepMissing },
  }
}

// ── Structured psychDrugReference JSON parity (separate *De/*En convention) ────
function verifyPsychDrugReferenceJson(): { files: number; drugs: number; gaps: string[] } {
  const dir = path.resolve('src/data/psychDrugReference/drugs')
  const files = ['adhdOther.json', 'antidepressants.json', 'antipsychotics.json', 'anxiolytics.json', 'moodStabilizers.json']
  const gaps: string[] = []
  let drugCount = 0

  const checkParity = (node: unknown, drugId: string): void => {
    if (Array.isArray(node)) {
      node.forEach((n) => checkParity(n, drugId))
      return
    }
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('De')) {
        const base = key.slice(0, -2)
        const enKey = `${base}En`
        const deFilled = Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0
        const enVal = obj[enKey]
        const enFilled = Array.isArray(enVal) ? enVal.length > 0 : typeof enVal === 'string' && enVal.trim().length > 0
        if (deFilled && !enFilled) gaps.push(`${drugId}: ${key} has no ${enKey}`)
      }
      if (value && typeof value === 'object') checkParity(value, drugId)
    }
  }

  for (const file of files) {
    const full = path.join(dir, file)
    const parsed = JSON.parse(readFileSync(full, 'utf8')) as Array<Record<string, unknown>>
    for (const drug of parsed) {
      drugCount += 1
      checkParity(drug, `${file}:${String(drug.id ?? '?')}`)
    }
  }
  return { files: files.length, drugs: drugCount, gaps }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  logProgress(`=== KB EN translation run ${RUN_STARTED} (dryRun=${DRY_RUN} force=${FORCE} only=${ONLY ?? '-'} limit=${LIMIT ?? '-'}) ===`)

  // 1) Seed layer verification (always cheap, no network).
  const seed = verifyBundledSeed()
  const jsonRef = verifyPsychDrugReferenceJson()
  logProgress(
    `seed verify: drugs ${seed.drugs.total} (missing EN slots ${seed.drugs.missing}), ` +
      `knowledge ${seed.knowledge.total} (missing ${seed.knowledge.missing}), ` +
      `preparations ${seed.preparations.total} (missing ${seed.preparations.missing}); ` +
      `psychDrugReference ${jsonRef.drugs} drugs across ${jsonRef.files} files, De/En gaps ${jsonRef.gaps.length}`,
  )
  for (const gap of jsonRef.gaps.slice(0, 50)) logProgress(`  seed gap: ${gap}`)

  const report: Record<string, unknown> = {
    startedAt: RUN_STARTED,
    dryRun: DRY_RUN,
    force: FORCE,
    provider: 'deepseek',
    model: DEEPSEEK_MODEL_ID,
    seed,
    psychDrugReference: { drugs: jsonRef.drugs, gaps: jsonRef.gaps },
  }

  if (SEED_ONLY) {
    writeReport(report)
    logProgress('seed-only mode complete.')
    return
  }

  if (!isKbAdminConfigured()) {
    throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in .env.local for the live pass.')
  }

  const supabase = getKbSupabaseAdmin()

  // 2) Read live rows.
  let drugRows = await fetchDrugRows(supabase)
  let prepRows = await fetchPreparationRows(supabase)
  logProgress(`live read: ${drugRows.length} drugs, ${prepRows.length} preparations`)

  // 3) MANDATORY snapshot BEFORE any write.
  const snapshot = buildSnapshot({ drugs: drugRows, preparations: prepRows, createdAt: RUN_STARTED })
  assertSnapshotComplete(snapshot, { drugs: drugRows.length, preparations: prepRows.length })
  const snapshotFile = writeSnapshot(snapshot)
  report.snapshotFile = snapshotFile
  report.snapshotCounts = { drugs: drugRows.length, preparations: prepRows.length }
  logProgress(`snapshot written + verified: ${snapshotFile} (${drugRows.length} drugs, ${prepRows.length} preps)`)

  // Optional scoping for smoke runs.
  if (ONLY) {
    const needle = ONLY.toLowerCase()
    drugRows = drugRows.filter((r) => (r.generic_name ?? '').toLowerCase().includes(needle))
    prepRows = prepRows.filter((r) => (r.generic_name ?? '').toLowerCase().includes(needle))
  }
  if (LIMIT != null) {
    drugRows = drugRows.slice(0, LIMIT)
    prepRows = prepRows.slice(0, LIMIT)
  }

  if (DRY_RUN) {
    const drugPending = drugRows.reduce((acc, r) => acc + countMissingEnglish(r.data as unknown as Record<string, unknown>), 0)
    const prepPending = prepRows.reduce((acc, r) => acc + countMissingEnglish(r.data as unknown as Record<string, unknown>), 0)
    report.dryRunPending = { drugFields: drugPending, prepFields: prepPending, drugs: drugRows.length, preparations: prepRows.length }
    writeReport(report)
    logProgress(`dry-run: ${drugPending} drug fields + ${prepPending} prep fields pending across ${drugRows.length} drugs / ${prepRows.length} preps. No writes.`)
    return
  }

  // 4) DeepSeek backend (asserts provider on every call).
  assertDeepSeekConfigured()
  const tally = createUsageTally()
  const translateBatch = createDeepSeekTranslateBatch({ tally })

  // 5) Translate live drugs.
  const drugItems = drugRows.map((r) => r.data as unknown as Record<string, unknown>)
  const drugResults = SKIP_LIVE
    ? []
    : await processCollection({
        label: 'drug',
        items: drugItems,
        nameOf: (d) => String(d.genericName ?? d.id),
        persist: async (d) => {
          await adminUpsertKnowledgeBaseDrugs([d as unknown as KnowledgeBaseDrug])
        },
        translateBatch,
      })

  // 6) Translate live preparations.
  const prepItems = prepRows.map((r) => r.data as unknown as Record<string, unknown>)
  const prepResults = SKIP_LIVE
    ? []
    : await processCollection({
        label: 'prep',
        items: prepItems,
        nameOf: (p) => `${String(p.genericName ?? p.id)} ${String(p.strengthValue ?? '')}${String(p.strengthUnit ?? '')}`,
        persist: async (p) => {
          await adminUpsertPreparations([p as unknown as MedicationMarketAvailability])
        },
        translateBatch,
      })

  // 7) Summaries + provider assertion.
  const summarize = (rows: ItemResult[]) => ({
    total: rows.length,
    translated: rows.filter((r) => r.status === 'translated').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    fieldsApplied: rows.reduce((acc, r) => acc + r.applied, 0),
    failures: rows.filter((r) => r.status === 'failed').map((r) => ({ id: r.id, name: r.name, error: r.error })),
  })

  report.drugs = summarize(drugResults)
  report.preparations = summarize(prepResults)
  report.usage = tally
  report.providerAssertion = {
    onlyDeepSeek: Object.keys(tally.providerCounts).every((p) => p === 'deepseek'),
    providerCounts: tally.providerCounts,
  }
  report.finishedAt = new Date().toISOString()

  writeReport(report)

  logProgress(
    `DONE. drugs: ${JSON.stringify(summarize(drugResults))} | preps: ${JSON.stringify(summarize(prepResults))} | ` +
      `providers=${JSON.stringify(tally.providerCounts)}`,
  )

  const anyOtherProvider = Object.keys(tally.providerCounts).some((p) => p !== 'deepseek')
  if (anyOtherProvider) throw new Error(`Non-DeepSeek provider detected: ${JSON.stringify(tally.providerCounts)}`)

  const failed = summarize(drugResults).failed + summarize(prepResults).failed
  if (failed > 0) process.exitCode = 1
}

function writeReport(report: Record<string, unknown>): void {
  const dir = path.resolve('scripts/reports')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `kb-en-translation-report-${Date.now()}.json`)
  writeFileSync(file, JSON.stringify(report, null, 2))
  logProgress(`report: ${file}`)
}

main().catch((err) => {
  logProgress(`FATAL: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})

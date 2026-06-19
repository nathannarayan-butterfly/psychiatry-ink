#!/usr/bin/env tsx
/**
 * Batch-generate pharmacokinetics for normalized KB substances (DeepSeek).
 *
 * Prerequisites:
 *   - Apply migration `20260619120000_kb_pharmacokinetics.sql` to Supabase
 *   - DEEPSEEK_API_KEY + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage:
 *   npm run kb:generate-pk -- --dry-run --limit=1
 *   npm run kb:generate-pk -- --dry-run=false
 *   npm run kb:generate-pk -- --drug=Clozapine --force
 *   npm run kb:generate-pk -- --dry-run=false --reproject
 *   npm run kb:generate-pk -- --dry-run=false --reproject --publish-all
 */
import dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listKbSubstances } from '../server/services/kbNormalizedStore'
import { recordAiGeneration } from '../server/services/kbNormalizedStore'
import {
  generatePharmacokineticsDraft,
  getKbPharmacokineticsBySubstanceId,
  pharmacokineticsHasContent,
  upsertKbPharmacokinetics,
} from '../server/services/kbPharmacokinetics'
import { isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import { projectAndUpsertKnowledgeBaseDrug, syncLegacyCuratedPharmacokinetics } from '../server/services/kbProjection'
import { publishAllKbSubstances } from '../server/services/kbPublish'
import { normalizeGenericName } from '../src/utils/kb/normalizeGenericName'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

interface CliOptions {
  dryRun: boolean
  limit: number
  offset: number
  drug: string | null
  force: boolean
  provider: 'deepseek' | 'openai'
  delayMs: number
  maxRetries: number
  reproject: boolean
  publishAll: boolean
}

function parseArg(name: string, fallback?: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const idx = process.argv.indexOf(`--${name}`)
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1]
  }
  return fallback
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue
  return !['false', '0', 'no', 'off'].includes(value.toLowerCase())
}

function parseCli(): CliOptions {
  return {
    dryRun: parseBool(parseArg('dry-run'), true),
    limit: Number(parseArg('limit', '0')) || 0,
    offset: Number(parseArg('offset', '0')) || 0,
    drug: parseArg('drug') ?? null,
    force: process.argv.includes('--force'),
    provider: (parseArg('provider', 'deepseek') as 'deepseek' | 'openai') ?? 'deepseek',
    delayMs: Number(parseArg('delay-ms', '2500')) || 2500,
    maxRetries: Number(parseArg('max-retries', '2')) || 2,
    reproject: process.argv.includes('--reproject'),
    publishAll: process.argv.includes('--publish-all'),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface PkFailure {
  genericName: string
  substanceId: string
  error: string
}

async function main(): Promise<void> {
  const opts = parseCli()
  console.log('[kb-pk] options:', opts)

  if (!opts.dryRun && !isKbAdminConfigured()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY required. Add to .env.local.')
    process.exit(1)
  }

  if (!opts.dryRun && !process.env.DEEPSEEK_API_KEY?.trim() && opts.provider === 'deepseek') {
    console.error('DEEPSEEK_API_KEY required for PK generation.')
    process.exit(1)
  }

  let queue = await listKbSubstances()
  if (opts.drug) {
    const needle = opts.drug.toLowerCase()
    queue = queue.filter(
      (s) =>
        s.genericName.toLowerCase() === needle ||
        normalizeGenericName(s.genericName) === needle,
    )
    if (queue.length === 0) {
      console.error(`Substance not found: ${opts.drug}`)
      process.exit(1)
    }
  }

  if (opts.offset > 0) queue = queue.slice(opts.offset)
  if (opts.limit > 0) queue = queue.slice(0, opts.limit)

  console.log(`[kb-pk] processing ${queue.length} substances`)

  const failures: PkFailure[] = []
  let success = 0
  let skipped = 0
  let dryRun = 0

  for (let i = 0; i < queue.length; i += 1) {
    const substance = queue[i]
    const existing = opts.dryRun ? null : await getKbPharmacokineticsBySubstanceId(substance.id)

    if (!opts.force && pharmacokineticsHasContent(existing)) {
      console.log(`[skip] ${substance.genericName} — PK already present`)
      skipped += 1
      continue
    }

    if (opts.dryRun) {
      console.log(`[dry-run] would generate PK for ${substance.genericName}`)
      dryRun += 1
      continue
    }

    let lastError: Error | null = null
    let done = false
    for (let attempt = 0; attempt <= opts.maxRetries && !done; attempt += 1) {
      try {
        const { draft, durationMs, model, provider } = await generatePharmacokineticsDraft({
          genericName: substance.genericName,
          substanceClass: substance.substanceClassDe ?? substance.substanceClass,
          category: substance.category,
          mechanismSummary: substance.mechanismSummaryDe ?? substance.mechanismSummary,
          provider: opts.provider,
        })

        await upsertKbPharmacokinetics(substance.id, draft)
        await recordAiGeneration({
          substanceId: substance.id,
          genericName: substance.genericName,
          provider,
          model,
          status: 'success',
          rawResponse: draft,
          validatedPayload: draft,
          durationMs,
        })

        if (opts.reproject && substance.status === 'published' && substance.reviewStatus === 'approved') {
          await projectAndUpsertKnowledgeBaseDrug(substance.id)
          console.log(`[ok] ${substance.genericName} — PK saved + reprojected`)
        } else {
          console.log(`[ok] ${substance.genericName} — PK saved`)
        }

        success += 1
        done = true
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < opts.maxRetries) {
          const backoff = opts.delayMs * (attempt + 2)
          console.warn(
            `[retry] ${substance.genericName} attempt ${attempt + 1}: ${lastError.message} (wait ${backoff}ms)`,
          )
          await sleep(backoff)
        }
      }
    }

    if (!done) {
      failures.push({
        genericName: substance.genericName,
        substanceId: substance.id,
        error: lastError?.message ?? 'unknown',
      })
      try {
        await recordAiGeneration({
          substanceId: substance.id,
          genericName: substance.genericName,
          provider: opts.provider,
          model: opts.provider,
          status: 'failed_api',
          validationErrors: { message: lastError?.message },
        })
      } catch {
        // continue
      }
    }

    if (i < queue.length - 1 && !opts.dryRun) await sleep(opts.delayMs)
  }

  if (opts.publishAll && !opts.dryRun) {
    console.log('[kb-pk] publishing all unpublished substances…')
    const publishSummary = await publishAllKbSubstances()
    console.log('[kb-pk] publish-all:', {
      published: publishSummary.succeeded.length,
      skipped: publishSummary.skipped.length,
      failed: publishSummary.failed.length,
    })
  }

  const report = {
    runAt: new Date().toISOString(),
    options: opts,
    total: queue.length,
    success,
    skipped,
    dryRun,
    failed: failures.length,
    failures,
  }

  const reportDir = join(process.cwd(), 'scripts', 'reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `kb-pk-report-${Date.now()}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log('[kb-pk] done:', { success, skipped, dryRun, failed: failures.length })
  console.log('[kb-pk] report:', reportPath)

  if (!opts.dryRun) {
    const legacyPatched = await syncLegacyCuratedPharmacokinetics()
    if (legacyPatched.length) {
      console.log('[kb-pk] legacy curated PK patched:', legacyPatched)
    }
  }

  if (failures.length > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[kb-pk] fatal:', err)
  process.exit(1)
})

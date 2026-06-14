#!/usr/bin/env tsx
/**
 * Batch-seed normalized psychiatric drug KB via DeepSeek.
 *
 * Seed sources (default: core only — backward compatible):
 *   --source=core       Core ~150 list only (default)
 *   --source=extended   Extended list only (entries 151–195)
 *   --source=all        Core + extended, deduped by normalized generic name
 *   --extended          Shorthand for --source=all
 *
 * Usage:
 *   npm run kb:seed:psychiatric-drugs -- --dry-run --limit=1
 *   npm run kb:seed:psychiatric-drugs -- --provider=deepseek --drug=Haloperidol
 *   npm run kb:seed:psychiatric-drugs -- --limit=150 --dry-run=false
 *   npm run kb:seed:psychiatric-drugs -- --source=all --dry-run=false
 *   npm run kb:seed:psychiatric-drugs -- --extended --limit=10
 *   npm run kb:seed:psychiatric-drugs -- --dry-run=false --publish-all
 */
import dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PSYCHIATRIC_DRUG_SEED_LIST,
  type PsychiatricDrugSeedEntry,
} from '../src/data/kb/psychiatric-drug-seed-list'
import {
  getCombinedSeedList,
  PSYCHIATRIC_DRUG_SEED_LIST_EXTENDED,
} from '../src/data/kb/psychiatric-drug-seed-list-extended'
import { SubstanceProfileDraftSchema } from '../src/schemas/kb/substanceProfile'
import { normalizeGenericName } from '../src/utils/kb/normalizeGenericName'
import {
  buildKbSeedSystemPrompt,
  buildKbSeedUserPrompt,
  callKbSeedLlm,
  parseSeedJson,
} from '../server/services/kbSeedLlm'
import {
  insertNormalizedProfile,
  recordAiGeneration,
  substanceExists,
} from '../server/services/kbNormalizedStore'
import { isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import { publishAllKbSubstances } from '../server/services/kbPublish'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

type SeedSource = 'core' | 'extended' | 'all'

interface CliOptions {
  dryRun: boolean
  limit: number
  offset: number
  drug: string | null
  force: boolean
  rerun: boolean
  provider: 'deepseek' | 'openai'
  country: string
  includeReceptorAffinity: boolean
  includeMarketAvailability: boolean
  delayMs: number
  maxRetries: number
  source: SeedSource
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

function parseSeedSource(): SeedSource {
  if (process.argv.includes('--extended')) return 'all'
  const raw = parseArg('source', 'core')?.toLowerCase()
  if (raw === 'extended' || raw === 'all') return raw
  return 'core'
}

function resolveSeedList(source: SeedSource): PsychiatricDrugSeedEntry[] {
  switch (source) {
    case 'extended':
      return [...PSYCHIATRIC_DRUG_SEED_LIST_EXTENDED]
    case 'all':
      return getCombinedSeedList()
    default:
      return [...PSYCHIATRIC_DRUG_SEED_LIST]
  }
}

function parseCli(): CliOptions {
  return {
    dryRun: parseBool(parseArg('dry-run'), true),
    limit: Number(parseArg('limit', '0')) || 0,
    offset: Number(parseArg('offset', '0')) || 0,
    drug: parseArg('drug') ?? null,
    force: process.argv.includes('--force'),
    rerun: process.argv.includes('--rerun'),
    provider: (parseArg('provider', 'deepseek') as 'deepseek' | 'openai') ?? 'deepseek',
    country: parseArg('country', 'DE') ?? 'DE',
    includeReceptorAffinity: parseBool(parseArg('include-receptor-affinity'), true),
    includeMarketAvailability: parseBool(parseArg('include-market-availability'), false),
    delayMs: Number(parseArg('delay-ms', '2500')) || 2500,
    maxRetries: Number(parseArg('max-retries', '2')) || 2,
    source: parseSeedSource(),
    publishAll: process.argv.includes('--publish-all'),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface SeedFailure {
  genericName: string
  normalizedName: string
  error: string
  stage: 'api' | 'validation' | 'db'
}

async function seedOneDrug(
  entry: PsychiatricDrugSeedEntry,
  opts: CliOptions,
): Promise<{ status: 'skipped' | 'dry_run' | 'success' | 'failed'; failure?: SeedFailure }> {
  const normalized =
    entry.normalizedName ?? normalizeGenericName(entry.genericName)

  const existingId = isKbAdminConfigured() ? await substanceExists(normalized) : null
  if (existingId && !opts.force && !opts.rerun) {
    console.log(`[skip] ${entry.genericName} (${normalized}) already exists`)
    return { status: 'skipped' }
  }

  if (opts.dryRun) {
    console.log(`[dry-run] would seed ${entry.genericName} (${normalized})`)
    if (isKbAdminConfigured()) {
      try {
        await recordAiGeneration({
          substanceId: existingId,
          genericName: entry.genericName,
          provider: opts.provider,
          model: 'dry-run',
          status: 'dry_run',
          rawResponse: { note: 'dry-run — no LLM call' },
        })
      } catch (err) {
        console.warn(`[dry-run] could not record ai_generation: ${err}`)
      }
    }
    return { status: 'dry_run' }
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= opts.maxRetries; attempt += 1) {
    try {
      const llm = await callKbSeedLlm({
        systemPrompt: buildKbSeedSystemPrompt(),
        userPrompt: buildKbSeedUserPrompt({
          genericName: entry.genericName,
          category: entry.category,
          country: opts.country,
          includeReceptorAffinity: opts.includeReceptorAffinity,
          includeMarketAvailability: opts.includeMarketAvailability,
        }),
        provider: opts.provider,
        temperature: 0.15,
        usageContext: {
          featureKey: 'kb_seed',
          requestKind: 'batch',
          metadata: { script: 'seed-psychiatric-drug-kb', genericName: entry.genericName },
        },
      })

      let parsed: unknown
      try {
        parsed = parseSeedJson(llm.text)
      } catch (parseErr) {
        await recordAiGeneration({
          substanceId: existingId,
          genericName: entry.genericName,
          provider: llm.modelSpec.provider,
          model: llm.modelSpec.modelId,
          status: 'failed_validation',
          rawResponse: llm.text,
          validationErrors: { parse: String(parseErr) },
          durationMs: llm.durationMs,
        })
        return {
          status: 'failed',
          failure: {
            genericName: entry.genericName,
            normalizedName: normalized,
            error: `JSON parse: ${parseErr}`,
            stage: 'validation',
          },
        }
      }

      const validated = SubstanceProfileDraftSchema.safeParse(parsed)
      if (!validated.success) {
        await recordAiGeneration({
          substanceId: existingId,
          genericName: entry.genericName,
          provider: llm.modelSpec.provider,
          model: llm.modelSpec.modelId,
          status: 'failed_validation',
          rawResponse: parsed,
          validationErrors: validated.error.flatten(),
          durationMs: llm.durationMs,
        })
        return {
          status: 'failed',
          failure: {
            genericName: entry.genericName,
            normalizedName: normalized,
            error: validated.error.message,
            stage: 'validation',
          },
        }
      }

      const draft = validated.data
      if (!draft.normalizedGenericName) {
        draft.normalizedGenericName = normalized
      }

      const substanceId = await insertNormalizedProfile({
        draft,
        category: entry.category,
        countryDefault: opts.country,
        substanceId: opts.rerun && existingId ? existingId : undefined,
      })

      await recordAiGeneration({
        substanceId,
        genericName: entry.genericName,
        provider: llm.modelSpec.provider,
        model: llm.modelSpec.modelId,
        status: 'success',
        rawResponse: parsed,
        validatedPayload: draft,
        durationMs: llm.durationMs,
      })

      console.log(`[ok] ${entry.genericName} → ${substanceId}`)
      return { status: 'success' }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < opts.maxRetries) {
        const backoff = opts.delayMs * (attempt + 2)
        console.warn(`[retry] ${entry.genericName} attempt ${attempt + 1}: ${lastError.message} (wait ${backoff}ms)`)
        await sleep(backoff)
      }
    }
  }

  try {
    await recordAiGeneration({
      substanceId: existingId,
      genericName: entry.genericName,
      provider: opts.provider,
      model: opts.provider,
      status: 'failed_api',
      validationErrors: { message: lastError?.message },
    })
  } catch {
    // continue
  }

  return {
    status: 'failed',
    failure: {
      genericName: entry.genericName,
      normalizedName: normalized,
      error: lastError?.message ?? 'unknown',
      stage: 'api',
    },
  }
}

async function main(): Promise<void> {
  const opts = parseCli()
  console.log('[kb-seed] options:', opts)

  if (!opts.dryRun && !isKbAdminConfigured()) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY required for non-dry-run seeding. Add to .env.local.',
    )
    process.exit(1)
  }

  let queue = resolveSeedList(opts.source)
  const sourceList = resolveSeedList(opts.source)
  if (opts.drug) {
    const needle = opts.drug.toLowerCase()
    queue = queue.filter(
      (e) =>
        e.genericName.toLowerCase() === needle ||
        normalizeGenericName(e.genericName) === needle,
    )
    if (queue.length === 0) {
      console.error(`Drug not found in seed list (${opts.source}): ${opts.drug}`)
      process.exit(1)
    }
  }

  if (opts.offset > 0) queue = queue.slice(opts.offset)
  if (opts.limit > 0) queue = queue.slice(0, opts.limit)

  console.log(
    `[kb-seed] source=${opts.source} processing ${queue.length} drugs (list total: ${sourceList.length})`,
  )

  const failures: SeedFailure[] = []
  let success = 0
  let skipped = 0
  let dryRun = 0

  for (let i = 0; i < queue.length; i += 1) {
    const entry = queue[i]
    const result = await seedOneDrug(entry, opts)
    if (result.status === 'success') success += 1
    else if (result.status === 'skipped') skipped += 1
    else if (result.status === 'dry_run') dryRun += 1
    else if (result.failure) failures.push(result.failure)

    if (i < queue.length - 1 && !opts.dryRun) await sleep(opts.delayMs)
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
    usageSummary: {
      note: 'Token/cost totals are persisted to ai_usage_logs when Supabase is configured',
      featureKey: 'kb_seed',
    },
  }

  const reportDir = join(process.cwd(), 'scripts', 'reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `kb-seed-report-${Date.now()}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log('[kb-seed] done:', { success, skipped, dryRun, failed: failures.length })
  console.log('[kb-seed] report:', reportPath)

  if (opts.publishAll) {
    if (opts.dryRun) {
      console.log('[kb-seed] --publish-all skipped (dry-run)')
    } else {
      console.log('[kb-seed] publishing all unpublished substances…')
      const publishSummary = await publishAllKbSubstances()
      console.log('[kb-seed] publish-all:', {
        total: publishSummary.total,
        published: publishSummary.succeeded.length,
        skipped: publishSummary.skipped.length,
        failed: publishSummary.failed.length,
      })
      if (publishSummary.failed.length > 0) {
        for (const item of publishSummary.failed) {
          console.warn(`[kb-seed] publish failed ${item.genericName}: ${item.error}`)
        }
        process.exitCode = 1
      }
    }
  }

  if (failures.length > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[kb-seed] fatal:', err)
  process.exit(1)
})

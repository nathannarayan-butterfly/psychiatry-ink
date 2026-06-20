#!/usr/bin/env tsx
/**
 * Phase C — LLM-assisted draft criteria generation for disorders lacking native ICD-11 trees.
 *
 * Outputs JSON drafts to scripts/output/criteria-drafts/ for clinician review.
 * Does NOT merge into src/data/diagnosisCriteria/ unless --merge is explicitly passed
 * (merge is a stub — manual review expected).
 *
 * Usage:
 *   npm run criteria:generate-drafts -- --dry-run --limit=5 --priority=gap
 *   npm run criteria:generate-drafts -- --disorder-id=alcohol_acute_intoxication --limit=1
 *   npm run criteria:generate-drafts -- --priority=substance --limit=10
 *   npm run criteria:generate-drafts -- --priority=unlinked --limit=5
 *   npm run criteria:generate-drafts -- --report-gaps
 */
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import {
  findTargetByCode,
  findTargetByDisorderId,
  listCriteriaDraftTargets,
  summarizeCriteriaGaps,
  type CriteriaDraftPriority,
} from './lib/criteriaDraftGaps.ts'
import {
  generateCriteriaDraftForTarget,
  writeDraftManifest,
} from '../server/services/criteriaDraftGenerate.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const prisma = new PrismaClient()

interface CliOptions {
  dryRun: boolean
  limit: number
  priority: CriteriaDraftPriority
  disorderId: string | null
  code: string | null
  system: 'ICD10GM' | 'ICD11MMS'
  delayMs: number
  reportGaps: boolean
  merge: boolean
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
  const priorityRaw = (parseArg('priority', 'gap') ?? 'gap').toLowerCase()
  const priority = (
    ['all', 'gap', 'substance', 'unlinked', 'icd11_tree'].includes(priorityRaw)
      ? priorityRaw
      : 'gap'
  ) as CriteriaDraftPriority

  const systemRaw = (parseArg('system', 'ICD11MMS') ?? 'ICD11MMS').toUpperCase()
  const system = systemRaw === 'ICD10GM' ? 'ICD10GM' : 'ICD11MMS'

  return {
    dryRun: parseBool(parseArg('dry-run'), true),
    limit: Number(parseArg('limit', '15')) || 15,
    priority,
    disorderId: parseArg('disorder-id') ?? null,
    code: parseArg('code') ?? null,
    system,
    delayMs: Number(parseArg('delay-ms', '1200')) || 1200,
    reportGaps: process.argv.includes('--report-gaps'),
    merge: process.argv.includes('--merge'),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const opts = parseCli()

  if (opts.reportGaps) {
    const gaps = await summarizeCriteriaGaps(prisma)
    console.log('[criteria-drafts] gap summary:', JSON.stringify(gaps, null, 2))
    return
  }

  let targets = await listCriteriaDraftTargets(prisma, opts.priority, opts.limit)

  if (opts.disorderId) {
    const single = findTargetByDisorderId(opts.disorderId)
    targets = single ? [single] : []
    if (targets.length === 0) {
      console.error(`[criteria-drafts] no target found for disorder-id=${opts.disorderId}`)
      process.exit(1)
    }
  } else if (opts.code) {
    const single = findTargetByCode(opts.code, opts.system)
    targets = single ? [single] : []
    if (targets.length === 0) {
      console.error(`[criteria-drafts] no target found for code=${opts.code} system=${opts.system}`)
      process.exit(1)
    }
  }

  if (targets.length === 0) {
    console.log('[criteria-drafts] no targets matched filters')
    return
  }

  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())
  if (!opts.dryRun && !hasKey) {
    console.error('[criteria-drafts] DEEPSEEK_API_KEY or OPENAI_API_KEY required (or use --dry-run)')
    process.exit(1)
  }

  if (opts.merge) {
    console.warn(
      '[criteria-drafts] --merge requested but auto-merge is disabled. Drafts are written to scripts/output/criteria-drafts/ for manual review.',
    )
  }

  console.log(
    `[criteria-drafts] ${opts.dryRun ? 'DRY RUN — ' : ''}generating ${targets.length} draft(s) priority=${opts.priority}`,
  )

  const results = []
  for (const [index, target] of targets.entries()) {
    console.log(
      `[criteria-drafts] [${index + 1}/${targets.length}] ${target.key} — ${target.title} (${target.mode})`,
    )
    const result = await generateCriteriaDraftForTarget(target, {
      dryRun: opts.dryRun,
      writeOutput: !opts.dryRun,
    })
    results.push(result)
    if (result.ok) {
      console.log(`  ✓ ok${result.outputPath ? ` → ${result.outputPath}` : ''}`)
    } else {
      console.log(`  ✗ failed (${result.issues.length} issues)`)
      for (const issue of result.issues.slice(0, 5)) {
        console.log(`    - ${issue.path}: ${issue.message}`)
      }
    }
    if (!opts.dryRun && index < targets.length - 1) await sleep(opts.delayMs)
  }

  const okCount = results.filter((r) => r.ok).length
  const manifestPath = writeDraftManifest(results, {
    dryRun: opts.dryRun,
    priority: opts.priority,
    limit: opts.limit,
    okCount,
    failCount: results.length - okCount,
  })
  console.log(`[criteria-drafts] done: ${okCount}/${results.length} ok — manifest ${manifestPath}`)
}

main()
  .catch((error) => {
    console.error('[criteria-drafts] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

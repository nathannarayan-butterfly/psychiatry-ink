#!/usr/bin/env tsx
/**
 * Publish all unpublished kb_substances and project to knowledge_base_drugs.
 *
 * Usage:
 *   npm run kb:publish-all
 *   npm run kb:publish-all -- --status=ai_draft
 */
import dotenv from 'dotenv'
import { publishAllKbSubstances, syncPublishedKbProjections } from '../server/services/kbPublish'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  return undefined
}

async function countKbRows(): Promise<{ substances: Record<string, number>; drugs: number }> {
  const supabase = getKbSupabaseAdmin()
  const { data: substances, error: sErr } = await supabase.from('kb_substances').select('status')
  if (sErr) throw sErr

  const byStatus: Record<string, number> = {}
  for (const row of substances ?? []) {
    const status = String(row.status ?? 'unknown')
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }

  const { count, error: dErr } = await supabase
    .from('knowledge_base_drugs')
    .select('id', { count: 'exact', head: true })
  if (dErr) throw dErr

  return { substances: byStatus, drugs: count ?? 0 }
}

async function main(): Promise<void> {
  if (!isKbAdminConfigured()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY required. Add to .env.local.')
    process.exit(1)
  }

  const before = await countKbRows()
  console.log('[kb:publish-all] kb_substances before:', before.substances)
  console.log('[kb:publish-all] knowledge_base_drugs before:', before.drugs)

  const filters = {
    status: parseArg('status'),
    category: parseArg('category'),
    reviewStatus: parseArg('reviewStatus'),
  }

  const summary = await publishAllKbSubstances(filters)

  console.log('[kb:publish-all] results:', {
    total: summary.total,
    published: summary.succeeded.length,
    skipped: summary.skipped.length,
    failed: summary.failed.length,
  })

  if (summary.failed.length > 0) {
    console.log('[kb:publish-all] failures:')
    for (const item of summary.failed) {
      console.log(`  - ${item.genericName}: ${item.error}`)
    }
  }

  console.log('[kb:publish-all] syncing published projections…')
  const syncSummary = await syncPublishedKbProjections()
  console.log('[kb:publish-all] sync results:', {
    total: syncSummary.total,
    reprojected: syncSummary.succeeded.length,
    failed: syncSummary.failed.length,
  })
  if (syncSummary.failed.length > 0) {
    for (const item of syncSummary.failed) {
      console.log(`  - ${item.genericName}: ${item.error}`)
    }
  }

  const after = await countKbRows()
  console.log('[kb:publish-all] kb_substances after:', after.substances)
  console.log('[kb:publish-all] knowledge_base_drugs after:', after.drugs)

  if (summary.failed.length > 0 || syncSummary.failed.length > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[kb:publish-all] fatal:', err)
  process.exit(1)
})

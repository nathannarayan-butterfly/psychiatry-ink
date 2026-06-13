#!/usr/bin/env tsx
/**
 * Verify a normalized KB substance after seeding.
 *
 * Usage:
 *   npm run kb:verify -- --drug=Haloperidol
 */
import dotenv from 'dotenv'
import { normalizeGenericName } from '../src/utils/kb/normalizeGenericName'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const idx = process.argv.indexOf(`--${name}`)
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1]
  }
  return undefined
}

const PATIENT_FIELD_PATTERNS = [
  /case_?id/i,
  /patient_?id/i,
  /encounter_?id/i,
  /user_?id/i,
]

interface ValidationWarning {
  code: string
  message: string
}

function collectWarnings(substance: Record<string, unknown>, counts: Record<string, number>): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  if (substance.status !== 'ai_draft' && substance.status !== 'published' && substance.status !== 'reviewed' && substance.status !== 'archived') {
    warnings.push({ code: 'invalid_status', message: `Unexpected status: ${substance.status}` })
  }
  if (substance.status === 'ai_draft' && substance.review_status !== 'unreviewed') {
    warnings.push({ code: 'draft_not_unreviewed', message: `ai_draft should have review_status=unreviewed (got ${substance.review_status})` })
  }
  if (substance.status === 'ai_draft' && substance.source_quality !== 'ai_generated_unverified') {
    warnings.push({ code: 'draft_source_quality', message: `ai_draft expected source_quality=ai_generated_unverified (got ${substance.source_quality})` })
  }
  if (substance.status === 'ai_draft' && substance.needs_clinical_review !== true) {
    warnings.push({ code: 'needs_review', message: 'ai_draft should have needs_clinical_review=true' })
  }
  if (counts.receptorAffinities === 0) {
    warnings.push({ code: 'missing_receptor', message: 'No receptor affinities' })
  }
  if (counts.monitoring === 0) {
    warnings.push({ code: 'missing_monitoring', message: 'No monitoring recommendations' })
  }
  if (counts.dosage === 0) {
    warnings.push({ code: 'missing_dosage', message: 'No dosage guidance' })
  }
  if (counts.sideEffects === 0) {
    warnings.push({ code: 'missing_side_effects', message: 'No side effects' })
  }
  if (counts.sources === 0) {
    warnings.push({ code: 'missing_source', message: 'No official/reference sources' })
  }

  return warnings
}

async function main(): Promise<void> {
  const drugArg = parseArg('drug')
  if (!drugArg) {
    console.error('Usage: npm run kb:verify -- --drug=Haloperidol')
    process.exit(1)
  }

  if (!isKbAdminConfigured()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY required. Add to .env.local.')
    process.exit(1)
  }

  const normalized = normalizeGenericName(drugArg)
  const supabase = getKbSupabaseAdmin()

  const { data: substance, error: subErr } = await supabase
    .from('kb_substances')
    .select('*')
    .eq('normalized_generic_name', normalized)
    .maybeSingle()

  if (subErr) throw subErr

  console.log('=== KB Substance Verification ===')
  console.log(`Drug: ${drugArg} (normalized: ${normalized})`)
  console.log(`Exists: ${substance ? 'yes' : 'no'}`)

  if (!substance) {
    process.exit(1)
  }

  const sid = String(substance.id)

  const [
    tradeNames,
    affinities,
    sideEffects,
    monitoring,
    dosage,
    interactions,
    sources,
    generations,
    revisions,
  ] = await Promise.all([
    supabase.from('kb_substance_trade_names').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_receptor_affinities').select('receptor, affinity_percent', { count: 'exact' }).eq('substance_id', sid),
    supabase.from('kb_side_effects').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_monitoring_recommendations').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_dosage_guidance').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_interaction_notes').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_sources').select('id', { count: 'exact', head: true }).eq('substance_id', sid),
    supabase.from('kb_ai_generations').select('*').eq('substance_id', sid).order('created_at', { ascending: false }).limit(1),
    supabase.from('kb_revision_history').select('*').eq('substance_id', sid).order('created_at', { ascending: false }).limit(1),
  ])

  const counts = {
    tradeNames: tradeNames.count ?? 0,
    receptorAffinities: affinities.count ?? 0,
    sideEffects: sideEffects.count ?? 0,
    monitoring: monitoring.count ?? 0,
    dosage: dosage.count ?? 0,
    interactions: interactions.count ?? 0,
    sources: sources.count ?? 0,
  }

  console.log('\n--- Substance row ---')
  console.log(`  id: ${sid}`)
  console.log(`  generic_name: ${substance.generic_name}`)
  console.log(`  status: ${substance.status}`)
  console.log(`  review_status: ${substance.review_status}`)
  console.log(`  source_quality: ${substance.source_quality}`)
  console.log(`  needs_clinical_review: ${substance.needs_clinical_review}`)
  console.log(`  category: ${substance.category ?? '—'}`)

  console.log('\n--- Child table counts ---')
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`)
  }

  const latestGen = generations.data?.[0] as Record<string, unknown> | undefined
  console.log('\n--- Latest kb_ai_generations ---')
  if (latestGen) {
    console.log(`  status: ${latestGen.status}`)
    console.log(`  provider: ${latestGen.provider} / ${latestGen.model}`)
    console.log(`  created_at: ${latestGen.created_at}`)
    const raw = latestGen.raw_response
    const preview = raw != null ? JSON.stringify(raw).slice(0, 200) : 'null'
    console.log(`  raw_response preview: ${preview}${preview.length >= 200 ? '…' : ''}`)
    if (latestGen.validation_errors) {
      console.log(`  validation_errors: ${JSON.stringify(latestGen.validation_errors)}`)
    }
  } else {
    console.log('  (none)')
  }

  const latestRev = revisions.data?.[0] as Record<string, unknown> | undefined
  console.log('\n--- Latest kb_revision_history ---')
  if (latestRev) {
    console.log(`  revision_type: ${latestRev.revision_type}`)
    console.log(`  changes_summary: ${latestRev.changes_summary}`)
    console.log(`  created_by: ${latestRev.created_by}`)
    console.log(`  created_at: ${latestRev.created_at}`)
  } else {
    console.log('  (none)')
  }

  console.log('\n--- Receptor affinity check (0–100, not 1–5) ---')
  const affinityRows = (affinities.data ?? []) as Array<{ receptor: string; affinity_percent: number | null }>
  const numericAffinities = affinityRows
    .map((row) => row.affinity_percent)
    .filter((pct): pct is number => pct != null)
  const maxAffinity = numericAffinities.length > 0 ? Math.max(...numericAffinities) : 0
  // Legacy 1–5 scale: all values are small integers ≤5. Mixed with 98/30/etc. → 5 means 5%.
  const suspectLegacyScale = maxAffinity <= 5
  let affinityOk = true
  for (const row of affinityRows) {
    const pct = row.affinity_percent
    if (pct == null) {
      console.log(`  ${row.receptor}: null (ok)`)
      continue
    }
    if (suspectLegacyScale && pct >= 1 && pct <= 5 && Number.isInteger(pct)) {
      console.log(`  ⚠ ${row.receptor}: ${pct} — looks like 1–5 scale, not percent`)
      affinityOk = false
    } else if (pct < 0 || pct > 100) {
      console.log(`  ⚠ ${row.receptor}: ${pct} — out of 0–100 range`)
      affinityOk = false
    } else {
      console.log(`  ✓ ${row.receptor}: ${pct}%`)
    }
  }
  if (affinityRows.length === 0) {
    console.log('  (no rows)')
  }
  console.log(`  affinity_scale_ok: ${affinityOk}`)

  console.log('\n--- Patient data spot-check ---')
  const substanceKeys = Object.keys(substance)
  const suspicious = substanceKeys.filter((k) => PATIENT_FIELD_PATTERNS.some((p) => p.test(k)))
  console.log(`  kb_substances suspicious columns: ${suspicious.length ? suspicious.join(', ') : 'none'}`)
  console.log('  kb_* schema has no patient/case columns by design')

  const warnings = collectWarnings(substance as Record<string, unknown>, counts)
  console.log('\n--- Validation warnings ---')
  if (warnings.length === 0) {
    console.log('  none')
  } else {
    for (const w of warnings) {
      console.log(`  [${w.code}] ${w.message}`)
    }
  }

  const statusOk =
    substance.status === 'ai_draft' &&
    substance.review_status === 'unreviewed' &&
    substance.source_quality === 'ai_generated_unverified' &&
    substance.needs_clinical_review === true

  console.log('\n--- Gate summary ---')
  console.log(`  expected_status_fields: ${statusOk ? 'PASS' : 'FAIL'}`)
  console.log(`  affinity_percent_scale: ${affinityOk ? 'PASS' : 'FAIL'}`)
  console.log(`  validation_warnings: ${warnings.length === 0 ? 'PASS' : `FAIL (${warnings.length})`}`)

  if (!statusOk || !affinityOk || warnings.length > 0) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('[kb:verify] fatal:', err)
  process.exit(1)
})

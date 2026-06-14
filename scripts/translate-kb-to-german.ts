#!/usr/bin/env tsx
/**
 * Translate the English knowledge base content to German (audit v2 L-001 /
 * L-002 / V2-C1). The product is German-first but the normalized KB
 * (`kb_substances` + child tables) was AI-seeded in English.
 *
 * This script reads the English source columns, calls DeepSeek with a clinical
 * German translation prompt, and writes the German rendering into the parallel
 * `*_de` columns added by `20260630000000_kb_german_localization.sql`. The
 * English columns are never modified, so the original content stays fully
 * recoverable.
 *
 * Properties:
 *  - Idempotent: only fills `*_de` columns that are still empty (use --force to
 *    retranslate, --only / --limit to scope).
 *  - Batched: one DeepSeek JSON call per substance covering the substance row
 *    plus all of its child rows (~25–40 strings), minimizing API round-trips.
 *  - Rate-limit aware: small inter-call delay + bounded retry with backoff.
 *  - Logged: progress to stdout, machine-readable report to scripts/reports/.
 *
 * Translation rules (encoded in the prompt): drug / substance / brand names,
 * receptor & enzyme symbols (D2, 5-HT2A, CYP3A4), standardized lab abbreviations
 * (HbA1c, QTc, eGFR, ALT, AST, TSH, CK …), ICD-10 codes, units (mg, mg/day,
 * ng/mL) and numeric doses are kept UNCHANGED; prose and population descriptors
 * are translated to clinical German.
 *
 * Usage:
 *   npm run kb:translate-de                       # all pending substances
 *   npm run kb:translate-de -- --limit=10         # first 10 pending
 *   npm run kb:translate-de -- --only=Clozapine   # single substance (by name)
 *   npm run kb:translate-de -- --force            # retranslate everything
 *   npm run kb:translate-de -- --dry-run          # no DB writes, no API calls
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import { callLlm } from '../server/services/llmProvider'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

// ── CLI args ──────────────────────────────────────────────────────────────────
function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  return undefined
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

const LIMIT = parseArg('limit') ? Number(parseArg('limit')) : undefined
const ONLY = parseArg('only')
const FORCE = hasFlag('force')
// Process every substance (ignore translation_status) but still only fill empty
// *_de fields — used to pick up newly-added columns without re-translating.
const ALL = hasFlag('all')
const DRY_RUN = hasFlag('dry-run')
const DELAY_MS = parseArg('delay') ? Number(parseArg('delay')) : 250
const CONCURRENCY = parseArg('concurrency') ? Math.max(1, Number(parseArg('concurrency'))) : 5

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Translation request unit ────────────────────────────────────────────────
type StringField = { key: string; text: string }

/** Collect translatable strings for a substance + children whose _de is empty. */
function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

const SUBSTANCE_TEXT_FIELDS: Array<[en: string, de: string]> = [
  ['substance_class', 'substance_class_de'],
  ['mechanism_summary', 'mechanism_summary_de'],
  ['pharmacodynamic_profile', 'pharmacodynamic_profile_de'],
  ['clinical_pearls', 'clinical_pearls_de'],
  ['uncertainty_notes', 'uncertainty_notes_de'],
  ['pregnancy_lactation_caution', 'pregnancy_lactation_caution_de'],
  ['geriatric_caution', 'geriatric_caution_de'],
  ['hepatic_renal_caution', 'hepatic_renal_caution_de'],
]
const SUBSTANCE_ARRAY_FIELDS: Array<[en: string, de: string]> = [
  ['primary_psychiatric_uses', 'primary_psychiatric_uses_de'],
  ['contraindications', 'contraindications_de'],
  ['severe_risks', 'severe_risks_de'],
]

const CHILD_SPECS: Array<{
  table: string
  fields: Array<[en: string, de: string]>
}> = [
  { table: 'kb_side_effects', fields: [['effect', 'effect_de'], ['system', 'system_de'], ['note', 'note_de']] },
  { table: 'kb_receptor_affinities', fields: [['explanation', 'explanation_de']] },
  {
    table: 'kb_monitoring_recommendations',
    fields: [['parameter', 'parameter_de'], ['interval_text', 'interval_text_de'], ['rationale', 'rationale_de']],
  },
  {
    table: 'kb_interaction_notes',
    fields: [
      ['interacts_with', 'interacts_with_de'],
      ['mechanism', 'mechanism_de'],
      ['clinical_management', 'clinical_management_de'],
    ],
  },
  {
    table: 'kb_dosage_guidance',
    fields: [
      ['population', 'population_de'],
      ['start_dose', 'start_dose_de'],
      ['target_dose', 'target_dose_de'],
      ['max_dose', 'max_dose_de'],
      ['titration_notes', 'titration_notes_de'],
      ['administration_notes', 'administration_notes_de'],
    ],
  },
]

const SYSTEM_PROMPT = [
  'You are a professional medical translator localizing a German-first psychiatry clinical knowledge base for psychiatrists.',
  'Translate each English clinical text value into precise, natural clinical German (de-DE), using standard German psychopharmacology terminology and a professional clinical register.',
  'STRICT RULES — keep these UNCHANGED (do not translate or alter):',
  '- Drug / substance / active-ingredient / brand names (e.g. Clozapine, Sertraline, Fluvoxamine, Risperdal).',
  '- Receptor, transporter and enzyme symbols (e.g. D2, 5-HT2A, SERT, NET, CYP3A4, CYP2D6, P-gp).',
  '- Standardized lab/medical abbreviations and codes (e.g. HbA1c, QTc, eGFR, ALT, AST, GGT, TSH, CK, BMI, ICD-10 codes).',
  '- Units and numeric values (e.g. 25 mg, 200 mg/day, 5-20 mg, ng/mL, mmol/L, %, hours).',
  'DO translate: prose, mechanisms, clinical advice, population descriptors (e.g. "elderly" -> "ältere Patienten", "adult (schizophrenia)" -> "Erwachsene (Schizophrenie)"), monitoring rationales, interaction management, and descriptive interaction targets/classes (e.g. "CNS depressants" -> "ZNS-dämpfende Substanzen", "MAOIs" stays "MAOI").',
  'For descriptive lab parameter names, use the standard German clinical term (e.g. "White blood cell count" -> "Leukozytenzahl", "Liver function tests" -> "Leberwerte") but keep standardized abbreviations as-is.',
  'Preserve any leading/trailing markdown or bullet characters and overall structure.',
  'You will receive a JSON object mapping opaque keys to English strings. Respond with ONLY a JSON object using the EXACT SAME keys, mapping each key to its German translation. Do not add, drop, or rename keys. Do not include commentary.',
  'Example input: {"a":"Dry mouth","b":"Monitor renal function"} -> Example output: {"a":"Mundtrockenheit","b":"Nierenfunktion überwachen"}',
].join('\n')

interface SubstanceRow {
  id: string
  generic_name: string
  translation_status: string
  [key: string]: unknown
}

async function fetchSubstances(supabase: SupabaseClient): Promise<SubstanceRow[]> {
  let query = supabase.from('kb_substances').select('*').order('generic_name')
  if (ONLY) query = query.ilike('generic_name', ONLY)
  const { data, error } = await query
  if (error) throw error
  let rows = (data ?? []) as SubstanceRow[]
  if (!FORCE && !ALL) rows = rows.filter((r) => r.translation_status !== 'translated')
  if (LIMIT != null) rows = rows.slice(0, LIMIT)
  return rows
}

/** Build the field map of strings still needing translation for one substance. */
async function collectFields(
  supabase: SupabaseClient,
  substance: SubstanceRow,
): Promise<{
  fields: StringField[]
  substancePatch: Record<string, string>
  arrayPlans: Array<{ deCol: string; key: string; items: string[] }>
  childPlans: Array<{ table: string; id: string; patchKeys: Record<string, string> }>
}> {
  const fields: StringField[] = []
  const substancePatch: Record<string, string> = {}
  const arrayPlans: Array<{ deCol: string; key: string; items: string[] }> = []
  const childPlans: Array<{ table: string; id: string; patchKeys: Record<string, string> }> = []

  for (const [enCol, deCol] of SUBSTANCE_TEXT_FIELDS) {
    const enVal = substance[enCol]
    if (typeof enVal === 'string' && !isEmpty(enVal) && (FORCE || isEmpty(substance[deCol]))) {
      const key = `s__${deCol}`
      fields.push({ key, text: enVal })
      substancePatch[key] = deCol
    }
  }

  for (const [enCol, deCol] of SUBSTANCE_ARRAY_FIELDS) {
    const enVal = substance[enCol]
    if (Array.isArray(enVal) && enVal.length && (FORCE || isEmpty(substance[deCol]))) {
      const items = enVal.map((x) => String(x))
      items.forEach((text, i) => {
        const key = `sa__${deCol}__${i}`
        if (!isEmpty(text)) fields.push({ key, text })
      })
      arrayPlans.push({ deCol, key: deCol, items })
    }
  }

  for (const spec of CHILD_SPECS) {
    const { data, error } = await supabase
      .from(spec.table)
      .select('*')
      .eq('substance_id', substance.id)
      .order('sort_order')
    if (error) throw error
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const patchKeys: Record<string, string> = {}
      for (const [enCol, deCol] of spec.fields) {
        const enVal = row[enCol]
        if (typeof enVal === 'string' && !isEmpty(enVal) && (FORCE || isEmpty(row[deCol]))) {
          const key = `c__${spec.table}__${String(row.id)}__${deCol}`
          fields.push({ key, text: enVal })
          patchKeys[key] = deCol
        }
      }
      if (Object.keys(patchKeys).length) {
        childPlans.push({ table: spec.table, id: String(row.id), patchKeys })
      }
    }
  }

  return { fields, substancePatch, arrayPlans, childPlans }
}

async function translateBatch(fields: StringField[]): Promise<Record<string, string>> {
  const input: Record<string, string> = {}
  for (const f of fields) input[f.key] = f.text
  const userPrompt = `Translate the values of this JSON object to clinical German:\n${JSON.stringify(input)}`

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text } = await callLlm({
        tier: 'fast',
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        jsonResponse: true,
        maxTokens: 16_000,
      })
      const parsed = JSON.parse(text) as Record<string, unknown>
      const out: Record<string, string> = {}
      for (const f of fields) {
        const v = parsed[f.key]
        if (typeof v === 'string' && v.trim()) out[f.key] = v.trim()
      }
      return out
    } catch (err) {
      lastErr = err
      await sleep(800 * (attempt + 1))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

interface SubstanceResult {
  id: string
  genericName: string
  fieldsRequested: number
  fieldsTranslated: number
  status: 'translated' | 'partial' | 'skipped' | 'failed'
  error?: string
}

async function processSubstance(
  supabase: SupabaseClient,
  substance: SubstanceRow,
): Promise<SubstanceResult> {
  const { fields, substancePatch, arrayPlans, childPlans } = await collectFields(supabase, substance)

  if (fields.length === 0) {
    if (!DRY_RUN && substance.translation_status !== 'translated') {
      await supabase
        .from('kb_substances')
        .update({ translation_status: 'translated', translated_at: new Date().toISOString() })
        .eq('id', substance.id)
    }
    return {
      id: substance.id,
      genericName: substance.generic_name,
      fieldsRequested: 0,
      fieldsTranslated: 0,
      status: 'skipped',
    }
  }

  if (DRY_RUN) {
    return {
      id: substance.id,
      genericName: substance.generic_name,
      fieldsRequested: fields.length,
      fieldsTranslated: 0,
      status: 'skipped',
    }
  }

  let translated: Record<string, string>
  try {
    translated = await translateBatch(fields)
  } catch (err) {
    return {
      id: substance.id,
      genericName: substance.generic_name,
      fieldsRequested: fields.length,
      fieldsTranslated: 0,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // ── Write substance-level scalar fields ──
  const substanceUpdate: Record<string, unknown> = {}
  for (const [key, deCol] of Object.entries(substancePatch)) {
    if (translated[key]) substanceUpdate[deCol] = translated[key]
  }
  // ── Write substance-level arrays ──
  for (const plan of arrayPlans) {
    const out = plan.items.map((_, i) => translated[`sa__${plan.deCol}__${i}`] ?? plan.items[i])
    substanceUpdate[plan.deCol] = out
  }

  const translatedCount = Object.values(translated).filter(Boolean).length
  const allDone = translatedCount >= fields.length
  substanceUpdate.translation_status = allDone ? 'translated' : 'partial'
  substanceUpdate.translated_at = new Date().toISOString()

  const { error: subErr } = await supabase
    .from('kb_substances')
    .update(substanceUpdate)
    .eq('id', substance.id)
  if (subErr) {
    return {
      id: substance.id,
      genericName: substance.generic_name,
      fieldsRequested: fields.length,
      fieldsTranslated: translatedCount,
      status: 'failed',
      error: subErr.message,
    }
  }

  // ── Write child rows (grouped by table+id) ──
  for (const plan of childPlans) {
    const update: Record<string, unknown> = {}
    for (const [key, deCol] of Object.entries(plan.patchKeys)) {
      if (translated[key]) update[deCol] = translated[key]
    }
    if (Object.keys(update).length) {
      const { error } = await supabase.from(plan.table).update(update).eq('id', plan.id)
      if (error) {
        return {
          id: substance.id,
          genericName: substance.generic_name,
          fieldsRequested: fields.length,
          fieldsTranslated: translatedCount,
          status: 'failed',
          error: `${plan.table}: ${error.message}`,
        }
      }
    }
  }

  return {
    id: substance.id,
    genericName: substance.generic_name,
    fieldsRequested: fields.length,
    fieldsTranslated: translatedCount,
    status: allDone ? 'translated' : 'partial',
  }
}

async function main(): Promise<void> {
  if (!isKbAdminConfigured()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) required in .env.local.')
    process.exit(1)
  }
  if (!process.env.DEEPSEEK_API_KEY?.trim() && !process.env.OPENAI_API_KEY?.trim()) {
    console.error('DEEPSEEK_API_KEY (or OPENAI_API_KEY) required for translation.')
    process.exit(1)
  }

  const supabase = getKbSupabaseAdmin()
  const substances = await fetchSubstances(supabase)
  console.log(
    `[kb:translate-de] ${substances.length} substance(s) to process` +
      `${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''}${ONLY ? ` (only=${ONLY})` : ''}`,
  )

  const results: SubstanceResult[] = []
  let processed = 0
  let cursor = 0
  console.log(`[kb:translate-de] concurrency=${CONCURRENCY}`)

  async function worker(): Promise<void> {
    while (cursor < substances.length) {
      const substance = substances[cursor++]
      try {
        const result = await processSubstance(supabase, substance)
        results.push(result)
        processed++
        console.log(
          `[${processed}/${substances.length}] ${result.genericName}: ${result.status} ` +
            `(${result.fieldsTranslated}/${result.fieldsRequested} fields)` +
            (result.error ? ` — ${result.error}` : ''),
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          id: substance.id,
          genericName: substance.generic_name,
          fieldsRequested: 0,
          fieldsTranslated: 0,
          status: 'failed',
          error: message,
        })
        processed++
        console.error(`[${processed}/${substances.length}] ${substance.generic_name}: failed — ${message}`)
      }
      if (!DRY_RUN) await sleep(DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, substances.length) }, () => worker()))

  const summary = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    force: FORCE,
    only: ONLY ?? null,
    limit: LIMIT ?? null,
    totals: {
      substances: results.length,
      translated: results.filter((r) => r.status === 'translated').length,
      partial: results.filter((r) => r.status === 'partial').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
      fieldsTranslated: results.reduce((acc, r) => acc + r.fieldsTranslated, 0),
    },
    results,
  }

  const reportsDir = path.resolve('scripts/reports')
  mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `kb-translation-report-${Date.now()}.json`)
  writeFileSync(reportPath, JSON.stringify(summary, null, 2))

  console.log('[kb:translate-de] done:', summary.totals)
  console.log('[kb:translate-de] report:', reportPath)

  if (summary.totals.failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[kb:translate-de] fatal:', err)
  process.exit(1)
})

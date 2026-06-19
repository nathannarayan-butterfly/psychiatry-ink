/**
 * Pharmacokinetics generation + persistence for the normalized KB.
 */
import { z } from 'zod'
import type { PharmacokineticDraft } from '../../src/schemas/kb/substanceProfile'
import { PharmacokineticDraftSchema } from '../../src/schemas/kb/substanceProfile'
import type { KbPharmacokinetics } from '../../src/types/kbNormalized'
import type { PharmacokineticData } from '../../src/types/knowledgeBase'
import { callKbSeedLlm, parseSeedJson } from './kbSeedLlm'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

export const PharmacokineticLlmResponseSchema = z.object({
  pharmacokinetics: PharmacokineticDraftSchema,
})

function mapPharmacokineticsRow(row: Record<string, unknown>): KbPharmacokinetics {
  return {
    id: String(row.id),
    substanceId: String(row.substance_id),
    summary: row.summary ? String(row.summary) : null,
    summaryDe: row.summary_de ? String(row.summary_de) : null,
    halfLifeHours: row.half_life_hours != null ? Number(row.half_life_hours) : null,
    halfLifeNote: row.half_life_note ? String(row.half_life_note) : null,
    halfLifeNoteDe: row.half_life_note_de ? String(row.half_life_note_de) : null,
    tmaxHours: row.tmax_hours != null ? Number(row.tmax_hours) : null,
    timeToSteadyStateDays:
      row.time_to_steady_state_days != null ? Number(row.time_to_steady_state_days) : null,
    bioavailabilityPercent:
      row.bioavailability_percent != null ? Number(row.bioavailability_percent) : null,
    proteinBindingPercent:
      row.protein_binding_percent != null ? Number(row.protein_binding_percent) : null,
    tdmLow: row.tdm_low != null ? Number(row.tdm_low) : null,
    tdmHigh: row.tdm_high != null ? Number(row.tdm_high) : null,
    tdmUnit: row.tdm_unit ? String(row.tdm_unit) : null,
    tdmNote: row.tdm_note ? String(row.tdm_note) : null,
    tdmNoteDe: row.tdm_note_de ? String(row.tdm_note_de) : null,
    isEstimated: Boolean(row.is_estimated ?? true),
    sourceNote: row.source_note ? String(row.source_note) : null,
  }
}

export function pharmacokineticsRowFromDraft(
  substanceId: string,
  draft: PharmacokineticDraft,
): Record<string, unknown> {
  return {
    substance_id: substanceId,
    summary: draft.summary ?? null,
    summary_de: draft.summaryDe,
    half_life_hours: draft.halfLifeHours ?? null,
    half_life_note: draft.halfLifeNote ?? null,
    half_life_note_de: draft.halfLifeNoteDe ?? null,
    tmax_hours: draft.tmaxHours ?? null,
    time_to_steady_state_days: draft.timeToSteadyStateDays ?? null,
    bioavailability_percent: draft.bioavailabilityPercent ?? null,
    protein_binding_percent: draft.proteinBindingPercent ?? null,
    tdm_low: draft.tdm?.lowNgMl ?? null,
    tdm_high: draft.tdm?.highNgMl ?? null,
    tdm_unit: draft.tdm?.unit ?? null,
    tdm_note: draft.tdm?.note ?? null,
    tdm_note_de: draft.tdm?.note ?? null,
    is_estimated: draft.isEstimated ?? true,
    source_note: draft.sourceNote ?? null,
  }
}

export function kbPharmacokineticsToStructuredData(pk: KbPharmacokinetics): PharmacokineticData {
  const tdm =
    pk.tdmLow != null || pk.tdmHigh != null || pk.tdmNoteDe || pk.tdmNote
      ? {
          lowNgMl: pk.tdmLow,
          highNgMl: pk.tdmHigh,
          unit: pk.tdmUnit ?? undefined,
          note: pk.tdmNoteDe ?? pk.tdmNote ?? undefined,
        }
      : undefined

  return {
    halfLifeHours: pk.halfLifeHours,
    halfLifeNote: pk.halfLifeNoteDe ?? pk.halfLifeNote ?? undefined,
    tmaxHours: pk.tmaxHours,
    timeToSteadyStateDays: pk.timeToSteadyStateDays,
    bioavailabilityPercent: pk.bioavailabilityPercent,
    proteinBindingPercent: pk.proteinBindingPercent,
    tdm,
    isEstimated: pk.isEstimated,
    sourceNote: pk.sourceNote ?? undefined,
  }
}

export function pharmacokineticsHasContent(pk: KbPharmacokinetics | null): boolean {
  if (!pk) return false
  const summary = (pk.summaryDe ?? pk.summary ?? '').trim()
  return (
    summary.length > 0 ||
    pk.halfLifeHours != null ||
    pk.tmaxHours != null ||
    pk.timeToSteadyStateDays != null ||
    pk.bioavailabilityPercent != null ||
    pk.proteinBindingPercent != null
  )
}

export async function getKbPharmacokineticsBySubstanceId(
  substanceId: string,
): Promise<KbPharmacokinetics | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('kb_pharmacokinetics')
    .select('*')
    .eq('substance_id', substanceId)
    .maybeSingle()
  if (error) throw error
  return data ? mapPharmacokineticsRow(data as Record<string, unknown>) : null
}

export async function upsertKbPharmacokinetics(
  substanceId: string,
  draft: PharmacokineticDraft,
): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const row = pharmacokineticsRowFromDraft(substanceId, draft)
  const { error } = await supabase
    .from('kb_pharmacokinetics')
    .upsert(row, { onConflict: 'substance_id' })
  if (error) throw error
}

export function buildPharmacokineticsSystemPrompt(): string {
  return [
    'You are a clinical pharmacology expert generating psychiatric drug pharmacokinetic reference content.',
    'Output STRICT JSON only — no markdown, no code fences, no commentary.',
    'Write clinically dense German prose in summaryDe (primary). Optional English mirror in summary.',
    'Be accurate and conservative. Mark uncertainty explicitly. Do NOT invent precise numbers without confidence — set numeric fields to null and isEstimated:true instead.',
    'Audience: psychiatrists. Cover absorption/resorption, Tmax, half-life (incl. active metabolites), steady state, protein binding, major CYP/transporter involvement, TDM where relevant, and renal/hepatic elimination with clinical consequences.',
  ].join(' ')
}

export function buildPharmacokineticsUserPrompt(params: {
  genericName: string
  substanceClass?: string | null
  category?: string | null
  mechanismSummary?: string | null
}): string {
  const context = [
    params.substanceClass ? `Substance class: ${params.substanceClass}` : null,
    params.category ? `Category: ${params.category}` : null,
    params.mechanismSummary ? `Mechanism (context): ${params.mechanismSummary.slice(0, 400)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    `Generate pharmacokinetics for the psychiatric drug: ${params.genericName}`,
    context,
    '',
    'Return STRICT JSON:',
    '{',
    '  "pharmacokinetics": {',
    '    "summaryDe": "<2–5 Absätze/Bullet-Cluster auf Deutsch: Resorption, Tmax, HWZ, Steady State, Metaboliten, Proteinbindung, CYP/Transporter, TDM, klinische Konsequenzen>",',
    '    "summary": "<optional English mirror>",',
    '    "halfLifeHours": <number|null>,',
    '    "halfLifeNoteDe": "<z.B. aktiver Metabolit …>",',
    '    "tmaxHours": <number|null>,',
    '    "timeToSteadyStateDays": <number|null>,',
    '    "bioavailabilityPercent": <0–100|null>,',
    '    "proteinBindingPercent": <0–100|null>,',
    '    "tdm": { "lowNgMl": <number|null>, "highNgMl": <number|null>, "unit": "ng/ml", "note": "…" },',
    '    "isEstimated": <boolean>,',
    '    "sourceNote": "Fachinformation / Leitlinie — verify"',
    '  }',
    '}',
    'halfLifeHours and tmaxHours are in hours; timeToSteadyStateDays in days. Omit tdm when not established for this drug.',
  ].join('\n')
}

export async function generatePharmacokineticsDraft(params: {
  genericName: string
  substanceClass?: string | null
  category?: string | null
  mechanismSummary?: string | null
  provider?: 'deepseek' | 'openai'
}): Promise<{ draft: PharmacokineticDraft; durationMs: number; model: string; provider: string }> {
  const provider = params.provider ?? 'deepseek'
  const llm = await callKbSeedLlm({
    systemPrompt: buildPharmacokineticsSystemPrompt(),
    userPrompt: buildPharmacokineticsUserPrompt(params),
    provider,
    maxTokens: 4_000,
    temperature: 0.12,
    usageContext: {
      featureKey: 'kb_pharmacokinetics',
      requestKind: 'batch',
      metadata: { genericName: params.genericName },
    },
  })

  const parsed = parseSeedJson(llm.text)
  const validated = PharmacokineticLlmResponseSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`PK validation failed: ${validated.error.message}`)
  }

  return {
    draft: validated.data.pharmacokinetics,
    durationMs: llm.durationMs,
    model: llm.modelSpec.modelId,
    provider: llm.modelSpec.provider,
  }
}

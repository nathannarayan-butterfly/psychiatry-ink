import type { AiModelSpec, AiModelTier } from '../modelTierMapping'
import type { AiUsageContext } from '../ai/types'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { llmResultModel } from './safeLlmEgress'
import { runAiFeature } from '../ai/runAiFeature'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import { heuristicExtractPriorTherapies } from '../../src/utils/medication/priorTherapyHeuristic'
import type {
  PriorTherapyEvent,
  PriorTherapyExtractionItem,
  PriorTherapyTimeframe,
} from '../../src/types/priorTherapies'

// The deterministic heuristic now lives in a shared, client-usable util so the
// hook (free, on-mount default layer) and this server mock fallback run the SAME
// implementation. Re-exported here to preserve the existing import path/tests.
export { heuristicExtractPriorTherapies }

const VALID_EVENTS: PriorTherapyEvent[] = [
  'discontinued',
  'no_response',
  'partial_response',
  'switched',
  'side_effect',
  'mentioned',
]

const VALID_TIMEFRAMES: Exclude<PriorTherapyTimeframe, null>[] = ['current_admission', 'history']
const VALID_SOURCES = ['aufnahme', 'verlauf'] as const

/** True when no provider key is configured → {@link callLlm} returns mock text. */
export function isLlmMockMode(): boolean {
  return !process.env.OPENAI_API_KEY?.trim() && !process.env.DEEPSEEK_API_KEY?.trim()
}

function coerceEvent(value: unknown): PriorTherapyEvent {
  const s = String(value ?? '').trim() as PriorTherapyEvent
  return VALID_EVENTS.includes(s) ? s : 'mentioned'
}

function coerceTimeframe(value: unknown): PriorTherapyTimeframe {
  const s = String(value ?? '').trim() as Exclude<PriorTherapyTimeframe, null>
  return VALID_TIMEFRAMES.includes(s) ? s : null
}

function coerceSource(value: unknown): (typeof VALID_SOURCES)[number] {
  const s = String(value ?? '').trim().toLowerCase()
  return (VALID_SOURCES as readonly string[]).includes(s)
    ? (s as (typeof VALID_SOURCES)[number])
    : 'aufnahme'
}

function coerceString(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Validate + clamp one raw LLM item; drops anything without a substance. */
function sanitizeItem(raw: unknown): PriorTherapyExtractionItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const substance = coerceString(r.substance, 120)
  if (!substance) return null
  const reason = coerceString(r.reason, 300)
  return {
    substance,
    event: coerceEvent(r.event),
    reason: reason || null,
    timeframe: coerceTimeframe(r.timeframe),
    source: coerceSource(r.source),
    evidenceQuote: coerceString(r.evidenceQuote ?? r.evidence ?? r.quote, 400),
  }
}

function sanitizeItems(parsed: unknown): PriorTherapyExtractionItem[] {
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).items)
      ? ((parsed as Record<string, unknown>).items as unknown[])
      : []
  const out: PriorTherapyExtractionItem[] = []
  const seen = new Set<string>()
  for (const raw of list) {
    const item = sanitizeItem(raw)
    if (!item) continue
    const key = item.substance.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.slice(0, 30)
}

function buildPrompt(params: {
  aufnahmeText: string
  verlaufText: string
  language: ClinicalLanguage
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Du bist ein klinisch-pharmakologischer Assistent für Psychiatrie.',
    'Aufgabe: Identifiziere ausschließlich Medikamente, die der Patient FRÜHER versucht hat',
    '(Vortherapien / Medikamentenanamnese) — inklusive des Grunds für das Absetzen bzw. des Ansprechens.',
    'Nutze NUR die im Text genannten Informationen. Erfinde KEINE Wirkstoffe und KEINE Gründe.',
    'Berücksichtige sowohl frühere (anamnestische) als auch im aktuellen Aufenthalt abgesetzte/umgestellte Substanzen.',
    clinicalLanguagePromptInstruction(params.language),
    'Antworte NUR als valides JSON-Objekt (json) ohne Markdown.',
    'Format: {"items":[{"substance","event","reason","timeframe","source","evidenceQuote"}]}',
    `event ∈ ${JSON.stringify(VALID_EVENTS)}`,
    'timeframe ∈ ["current_admission","history",null]',
    'source ∈ ["aufnahme","verlauf"] (woher die Information stammt).',
    'evidenceQuote: kurzes wörtliches Zitat (max. 1 Satz) aus dem Quelltext, das die Aussage belegt.',
    'Wenn keine Vortherapie erkennbar ist: {"items":[]}.',
  ].join(' ')

  const userPrompt = [
    '=== AUFNAHME ===',
    params.aufnahmeText.trim() || '(leer)',
    '',
    '=== VERLAUF ===',
    params.verlaufText.trim() || '(leer)',
    '',
    'JSON-Beispiel:',
    '{"items":[{"substance":"Olanzapin","event":"no_response","reason":"kein signifikantes Ansprechen","timeframe":"history","source":"aufnahme","evidenceQuote":"unter Olanzapin keine Besserung"}]}',
  ].join('\n')

  return { systemPrompt, userPrompt }
}

export interface PriorTherapyExtractionResult {
  items: PriorTherapyExtractionItem[]
  model: AiModelSpec
  mock: boolean
}

/**
 * Extract previously-tried medications from the (already de-identified) Aufnahme
 * + Verlauf free text. Uses the shared LLM gateway; in mock mode (no API key)
 * falls back to a deterministic heuristic so dev + tests work offline.
 */
export async function extractPriorTherapies(params: {
  aufnahmeText: string
  verlaufText: string
  language: ClinicalLanguage
  caseId?: string
  tier?: AiModelTier
  usageContext?: AiUsageContext
}): Promise<PriorTherapyExtractionResult> {
  const { systemPrompt, userPrompt } = buildPrompt({
    aufnahmeText: params.aufnahmeText,
    verlaufText: params.verlaufText,
    language: params.language,
  })

  const llm = await runAiFeature({
    featureKey: 'prior_therapies',
    tier: params.tier ?? 'standard',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 1600,
    usageContext: {
      featureKey: 'prior_therapies',
      caseId: params.caseId ?? null,
      ...params.usageContext,
      metadata: { ...params.usageContext?.metadata, route: 'medication/prior-therapies' },
    },
  })

  const mock = isLlmMockMode()
  let items = sanitizeItems(parseStructuredJson(llm.text))

  // In mock mode the gateway returns non-JSON placeholder text, so parsing is
  // empty — fall back to the deterministic heuristic over the real text.
  if (items.length === 0 && mock) {
    items = heuristicExtractPriorTherapies(params.aufnahmeText, params.verlaufText)
  }

  return { items, model: llmResultModel(llm), mock }
}

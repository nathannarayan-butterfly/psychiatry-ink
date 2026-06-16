import type { AiModelSpec, AiModelTier } from '../modelTierMapping'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'
import { callLlm, llmResultModel } from './llmProvider'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import type {
  PriorTherapyEvent,
  PriorTherapyExtractionItem,
  PriorTherapyTimeframe,
} from '../../src/types/priorTherapies'

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

// ── Deterministic mock / offline fallback ────────────────────────────────────
// Used only when no LLM key is configured (mock mode). Scans the de-identified
// text for known psychotropic substances and classifies the surrounding
// sentence. This keeps dev + tests working and degrades gracefully offline —
// strictly from the real text, never fabricated.

const KNOWN_SUBSTANCES = [
  'Risperidon', 'Olanzapin', 'Quetiapin', 'Aripiprazol', 'Amisulprid', 'Clozapin',
  'Haloperidol', 'Paliperidon', 'Ziprasidon', 'Flupentixol', 'Zuclopenthixol',
  'Sertralin', 'Citalopram', 'Escitalopram', 'Fluoxetin', 'Paroxetin', 'Venlafaxin',
  'Duloxetin', 'Mirtazapin', 'Bupropion', 'Agomelatin', 'Trazodon', 'Amitriptylin',
  'Lithium', 'Valproat', 'Valproinsäure', 'Lamotrigin', 'Carbamazepin', 'Topiramat',
  'Lorazepam', 'Diazepam', 'Oxazepam', 'Pregabalin', 'Promethazin', 'Pipamperon',
  'Melperon', 'Methylphenidat', 'Atomoxetin',
]

const SIDE_EFFECT_PATTERN =
  /nebenwirkung|unverträg|hyperprolaktin|prolaktin|gewichtszunahme|akathisie|sedier|müdigkeit|übelkeit|qtc|dyskines|tremor|extrapyramidal/i
const SWITCHED_PATTERN = /umstell|wechsel|ausgeschlich|ausschleich/i
const NO_RESPONSE_PATTERN =
  /kein.{0,20}ansprech|nicht angesprochen|wirkungslos|keine besserung|ineffektiv|unwirksam/i
const PARTIAL_PATTERN = /teilremission|teilweise|partiell|unzureichend.{0,12}wirk/i
const DISCONTINUED_PATTERN = /abgesetzt|absetz|beendet|gestoppt|ausgeschlich|pausiert/i
const HISTORY_PATTERN = /vor aufnahme|anamnese|früher|zuvor|in der vorgeschichte|bisher|vorbehandl/i

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function classify(sentence: string): PriorTherapyEvent | null {
  if (SIDE_EFFECT_PATTERN.test(sentence)) return 'side_effect'
  if (NO_RESPONSE_PATTERN.test(sentence)) return 'no_response'
  if (PARTIAL_PATTERN.test(sentence)) return 'partial_response'
  if (SWITCHED_PATTERN.test(sentence)) return 'switched'
  if (DISCONTINUED_PATTERN.test(sentence)) return 'discontinued'
  return null
}

function extractReason(sentence: string): string | null {
  const match = sentence.match(/(?:wegen|aufgrund|infolge)\s+([^.,;]+)/i)
  return match ? match[1]!.trim().slice(0, 300) : null
}

export function heuristicExtractPriorTherapies(
  aufnahmeText: string,
  verlaufText: string,
): PriorTherapyExtractionItem[] {
  const sources: { text: string; source: (typeof VALID_SOURCES)[number] }[] = [
    { text: aufnahmeText, source: 'aufnahme' },
    { text: verlaufText, source: 'verlauf' },
  ]
  const byKey = new Map<string, PriorTherapyExtractionItem>()

  for (const { text, source } of sources) {
    for (const sentence of splitSentences(text)) {
      for (const substance of KNOWN_SUBSTANCES) {
        const pattern = new RegExp(`\\b${substance}\\b`, 'i')
        if (!pattern.test(sentence)) continue

        const isHistory = HISTORY_PATTERN.test(sentence)
        const classified = classify(sentence)
        // Only surface a substance when it reads as a prior trial: either an
        // explicit stop/response signal, or an anamnestic ("prior") framing.
        if (!classified && !isHistory) continue

        const event: PriorTherapyEvent = classified ?? 'mentioned'
        const item: PriorTherapyExtractionItem = {
          substance,
          event,
          reason: extractReason(sentence),
          timeframe: isHistory ? 'history' : source === 'verlauf' ? 'current_admission' : null,
          source,
          evidenceQuote: sentence.slice(0, 400),
        }
        const key = substance.toLowerCase()
        const existing = byKey.get(key)
        if (!existing) byKey.set(key, item)
      }
    }
  }

  return [...byKey.values()]
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
}): Promise<PriorTherapyExtractionResult> {
  const { systemPrompt, userPrompt } = buildPrompt({
    aufnahmeText: params.aufnahmeText,
    verlaufText: params.verlaufText,
    language: params.language,
  })

  const llm = await callLlm({
    tier: params.tier ?? 'standard',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 1600,
    usageContext: {
      featureKey: 'prior_therapies',
      caseId: params.caseId ?? null,
      metadata: { route: 'medication/prior-therapies' },
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

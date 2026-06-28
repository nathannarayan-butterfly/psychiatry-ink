import type {
  PriorTherapyEvent,
  PriorTherapyExtractionItem,
  PriorTherapyTimeframe,
} from '../../types/priorTherapies'

/**
 * Deterministic, offline extraction of previously-tried medications from the
 * (already de-identified) Aufnahme + Verlauf free text. NO network, NO LLM, NO
 * credits — it scans the real text for known psychotropic substances and
 * classifies the surrounding sentence.
 *
 * This is the single source of truth for the heuristic prior-therapy pass and is
 * shared by:
 *  - the client hook ({@link useCasePriorTherapies}) as the default, free layer
 *    that surfaces free-text trials on mount without spending credits, and
 *  - the server route's mock fallback (no API key configured → deterministic).
 *
 * It never fabricates: a substance is only surfaced when the text reads as a
 * prior trial (an explicit stop/response signal, or an anamnestic framing), and
 * every item carries the verbatim sentence as its evidence quote.
 */

/** Free-text sources the heuristic reads (the plan layer is handled elsewhere). */
type HeuristicSource = Exclude<PriorTherapyExtractionItem['source'], never>

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
  const sources: { text: string; source: HeuristicSource }[] = [
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
        const timeframe: PriorTherapyTimeframe = isHistory
          ? 'history'
          : source === 'verlauf'
            ? 'current_admission'
            : null
        const item: PriorTherapyExtractionItem = {
          substance,
          event,
          reason: extractReason(sentence),
          timeframe,
          source,
          evidenceQuote: sentence.slice(0, 400),
        }
        const key = substance.toLowerCase()
        if (!byKey.has(key)) byKey.set(key, item)
      }
    }
  }

  return [...byKey.values()]
}

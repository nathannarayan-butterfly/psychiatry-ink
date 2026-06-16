import type { MedicationEntry } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'
import type {
  PriorTherapyEvent,
  PriorTherapyItem,
  PriorTherapySource,
} from '../../types/priorTherapies'
import { isMedicationVisible } from './planOps'

export type {
  PriorTherapyEvent,
  PriorTherapyItem,
  PriorTherapySource,
  PriorTherapyTimeframe,
} from '../../types/priorTherapies'

/**
 * "Bisher versuchte Medikamente" (Vortherapien / prior medication trials).
 *
 * This module derives the list of medications a patient has PREVIOUSLY TRIED —
 * with the clinically important context (why stopped / response) — from data the
 * app already holds. Two complementary layers feed it:
 *
 *  1. DETERMINISTIC (this file, no LLM): agents that are already structured in
 *     the medication plan — entries with a `discontinued` status carry a reason
 *     and/or side-effects that explain why they were stopped. These are surfaced
 *     immediately and never depend on the network.
 *  2. INFERRED (server LLM, merged in by the hook): agents mentioned only in the
 *     free-text Aufnahme / Verlauf documentation. Those arrive as advisory items
 *     marked `inferred`, each carrying its source + an evidence quote so the
 *     clinician can verify; they never overwrite the actual medication plan.
 *
 * Real data only — nothing here fabricates a drug or a reason.
 */

const SIDE_EFFECT_PATTERN =
  /nebenwirkung|unverträg|hyperprolaktin|prolaktin|gewichtszunahme|akathisie|sedier|müdigkeit|übelkeit|qtc|dyskines|tremor|schwindel|extrapyramidal|eps\b/i
const SWITCHED_PATTERN = /umstell|wechsel|switch|ausgeschlich|ausschleich/i
const NO_RESPONSE_PATTERN =
  /kein.{0,20}ansprech|nicht angesprochen|wirkungslos|keine besserung|non.?respon|ineffektiv|unwirksam/i
const PARTIAL_PATTERN = /teilremission|teilweise|partiell|partial|unzureichend.{0,12}wirk/i

/**
 * Classify why a prior agent was stopped from its free-text reason + recorded
 * side-effects. Side-effects win when present, because the adverse event is the
 * clinically salient "why stopped".
 */
export function classifyPriorTherapyEvent(reason: string, sideEffects: string[]): PriorTherapyEvent {
  const haystack = `${reason} ${sideEffects.join(' ')}`
  if (sideEffects.length > 0 || SIDE_EFFECT_PATTERN.test(haystack)) return 'side_effect'
  if (NO_RESPONSE_PATTERN.test(haystack)) return 'no_response'
  if (PARTIAL_PATTERN.test(haystack)) return 'partial_response'
  if (SWITCHED_PATTERN.test(haystack)) return 'switched'
  return 'discontinued'
}

/** Normalised key for de-duplicating the same substance across sources. */
export function normalizeSubstanceKey(substance: string): string {
  return substance
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '')
}

/**
 * Deterministically extract previously-tried agents already structured in the
 * plan: every visible, `discontinued` medication, with its reason / side-effects.
 */
export function extractPriorTherapiesFromPlan(medications: MedicationEntry[]): PriorTherapyItem[] {
  const items: PriorTherapyItem[] = []
  const seen = new Set<string>()

  for (const med of medications) {
    if (!isMedicationVisible(med)) continue
    if (med.status !== 'discontinued') continue

    const substance = med.substance.trim()
    if (!substance) continue
    const key = normalizeSubstanceKey(substance)
    if (seen.has(key)) continue
    seen.add(key)

    const reasonForChange = med.reasonForChange.trim()
    const sideEffects = med.sideEffects.filter(Boolean)
    const event = classifyPriorTherapyEvent(reasonForChange, sideEffects)

    // Prefer the concrete adverse effects as the human reason when that's why
    // it was stopped; otherwise fall back to the documented reason-for-change.
    const reason =
      event === 'side_effect' && sideEffects.length > 0
        ? sideEffects.join(', ')
        : reasonForChange || (sideEffects.length > 0 ? sideEffects.join(', ') : null)

    items.push({
      substance,
      event,
      reason,
      timeframe: 'current_admission',
      source: 'plan',
      evidenceQuote: reasonForChange || null,
      inferred: false,
    })
  }

  return items
}

const EVENT_RANK: Record<PriorTherapyEvent, number> = {
  side_effect: 5,
  no_response: 4,
  partial_response: 3,
  switched: 2,
  discontinued: 1,
  mentioned: 0,
}

/**
 * Merge deterministic (plan) + inferred (LLM) prior-therapy items, de-duplicated
 * by substance. Deterministic plan data is authoritative and is kept verbatim;
 * an inferred item for the same substance is dropped (the plan already knows it).
 * A substance seen only in free text is added as an advisory `inferred` item.
 * When two inferred items collide, the more specific event wins.
 */
export function mergePriorTherapies(
  deterministic: PriorTherapyItem[],
  inferred: PriorTherapyItem[],
): PriorTherapyItem[] {
  const byKey = new Map<string, PriorTherapyItem>()

  for (const item of deterministic) {
    byKey.set(normalizeSubstanceKey(item.substance), item)
  }

  for (const item of inferred) {
    const key = normalizeSubstanceKey(item.substance)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }
    // Never let an inferred item override authoritative plan data.
    if (!existing.inferred) continue
    if (EVENT_RANK[item.event] > EVENT_RANK[existing.event]) {
      byKey.set(key, item)
    }
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.inferred !== b.inferred) return a.inferred ? 1 : -1
    if (EVENT_RANK[b.event] !== EVENT_RANK[a.event]) return EVENT_RANK[b.event] - EVENT_RANK[a.event]
    return a.substance.localeCompare(b.substance)
  })
}

const EVENT_LABELS_DE: Record<PriorTherapyEvent, string> = {
  discontinued: 'abgesetzt',
  no_response: 'kein Ansprechen',
  partial_response: 'partielles Ansprechen',
  switched: 'umgestellt',
  side_effect: 'abgesetzt (Nebenwirkung)',
  mentioned: 'in Anamnese erwähnt',
}

const EVENT_LABELS_EN: Record<PriorTherapyEvent, string> = {
  discontinued: 'discontinued',
  no_response: 'no response',
  partial_response: 'partial response',
  switched: 'switched',
  side_effect: 'discontinued (adverse effect)',
  mentioned: 'mentioned in history',
}

export function priorTherapyEventLabel(event: PriorTherapyEvent, language: UiLanguage): string {
  return (language === 'de' ? EVENT_LABELS_DE : EVENT_LABELS_EN)[event]
}

const SOURCE_LABELS_DE: Record<PriorTherapySource, string> = {
  plan: 'aktueller Aufenthalt',
  aufnahme: 'laut Aufnahme',
  verlauf: 'laut Verlauf',
}

const SOURCE_LABELS_EN: Record<PriorTherapySource, string> = {
  plan: 'current admission',
  aufnahme: 'per admission note',
  verlauf: 'per progress note',
}

export function priorTherapySourceLabel(source: PriorTherapySource, language: UiLanguage): string {
  return (language === 'de' ? SOURCE_LABELS_DE : SOURCE_LABELS_EN)[source]
}

/** Semantic tone for a prior-therapy event, reused by the UI for colour. */
export function priorTherapyEventTone(event: PriorTherapyEvent): 'high' | 'moderate' | 'info' | 'neutral' {
  switch (event) {
    case 'side_effect':
      return 'high'
    case 'no_response':
      return 'moderate'
    case 'partial_response':
    case 'switched':
      return 'info'
    default:
      return 'neutral'
  }
}

/** Compact one-line summary, e.g. "Risperidon — abgesetzt wegen Prolaktin-Anstieg (aktueller Aufenthalt)". */
export function priorTherapySummaryLine(item: PriorTherapyItem, language: UiLanguage): string {
  const event = priorTherapyEventLabel(item.event, language)
  const reasonClause = item.reason
    ? language === 'de'
      ? ` wegen ${item.reason}`
      : ` due to ${item.reason}`
    : ''
  const source = priorTherapySourceLabel(item.source, language)
  return `${item.substance} — ${event}${reasonClause} (${source})`
}

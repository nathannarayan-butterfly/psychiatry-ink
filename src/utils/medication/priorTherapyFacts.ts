/**
 * Prior-therapies — read from CMEA facts (Phase 3).
 *
 * "Compute once, reuse many": instead of calling the bespoke
 * /api/medication/prior-therapies routes to re-extract trials + why-failed from
 * the Aufnahme/Verlauf, we read pre-computed {@link MedicationTrialFact}s via the
 * accessor and fold them into the deterministic medication-plan layer. The
 * why-failed analysis stays a pure function over facts + the drug reference.
 */

import type { MedicationTrialFact } from '../../types/clinicalMetadata'
import type {
  DeterministicFailureSignals,
  PriorTherapyEvent,
  PriorTherapyItem,
  PriorTherapySource,
} from '../../types/priorTherapies'
import { normalizeSubstanceKey } from './priorTherapies'

const EVENT_RANK: Record<PriorTherapyEvent, number> = {
  side_effect: 5,
  no_response: 4,
  partial_response: 3,
  switched: 2,
  discontinued: 1,
  mentioned: 0,
}

/** Map advisory medication-trial facts → inferred prior-therapy items (de-duped). */
export function medicationTrialFactsToItems(facts: MedicationTrialFact[]): PriorTherapyItem[] {
  const byKey = new Map<string, PriorTherapyItem>()
  for (const fact of facts) {
    const key = normalizeSubstanceKey(fact.substance)
    if (!key) continue
    const source: PriorTherapySource = fact.provenance.sourceType === 'verlauf' ? 'verlauf' : 'aufnahme'
    const event = fact.outcome ?? 'mentioned'
    const item: PriorTherapyItem = {
      substance: fact.substance,
      event,
      reason: fact.reasonStopped ?? null,
      timeframe: fact.timeframe,
      source,
      evidenceQuote: fact.provenance.evidenceQuote,
      inferred: true,
    }
    const existing = byKey.get(key)
    if (!existing || EVENT_RANK[event] > EVENT_RANK[existing.event]) byKey.set(key, item)
  }
  return [...byKey.values()]
}

/** Index trial facts by normalized substance for signal enrichment. */
export function indexTrialFactsBySubstance(
  facts: MedicationTrialFact[],
): Map<string, MedicationTrialFact> {
  const map = new Map<string, MedicationTrialFact>()
  for (const fact of facts) {
    const key = normalizeSubstanceKey(fact.substance)
    if (key && !map.has(key)) map.set(key, fact)
  }
  return map
}

/**
 * Enrich deterministic failure signals with whatever the (advisory) trial fact
 * adds — a documented subtherapeutic serum level, a smoking/CYP1A2 interaction,
 * a poor-adherence signal, or a subtherapeutic dose. Never overrides a stronger
 * deterministic signal; only fills gaps. Pure: no network, no fabrication.
 */
export function enrichFailureSignalsWithFact(
  signals: DeterministicFailureSignals,
  fact: MedicationTrialFact | undefined,
): DeterministicFailureSignals {
  if (!fact) return signals
  const next: DeterministicFailureSignals = { ...signals }

  if (!next.subtherapeuticLevel && fact.serumLevel?.interpretation === 'subtherapeutic') {
    next.subtherapeuticLevel = {
      parameter: fact.substance,
      value: fact.serumLevel.value,
      unit: fact.serumLevel.unit,
    }
    next.levelMeasured = true
  } else if (!next.levelMeasured && fact.serumLevel) {
    next.levelMeasured = true
  }

  if (!next.cyp1a2Smoking && fact.smokingInteractionFlag) {
    next.cyp1a2Smoking = true
  }

  if (!next.poorAdherence && fact.adherenceSignal === 'poor') {
    next.poorAdherence = { note: fact.reasonStopped?.trim() || 'Adhärenzhinweis aus Dokumentation' }
  }

  if (!next.inadequateDoseDuration && fact.doseAdequacy === 'subtherapeutic') {
    next.inadequateDoseDuration = {
      detail: fact.doseText
        ? `Dosis laut Dokumentation möglicherweise subtherapeutisch (${fact.doseText}).`
        : 'Dosis laut Dokumentation möglicherweise subtherapeutisch.',
    }
  }

  return next
}

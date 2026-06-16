/**
 * Butterfly criteria — resolve `unknown` criteria from CMEA facts (Phase 2).
 *
 * Instead of calling the bespoke /api/butterfly/extract route to re-derive
 * criteria from raw text, we read pre-computed, provenance-tagged facts via the
 * accessor and run the SAME deterministic evaluator against a phenomenology
 * built from those facts. Any criterion that is `unknown` against the real ISDM
 * context but resolves to met/not_met against the facts becomes an ADVISORY
 * suggestion (pending clinician acceptance) — never an auto-flipped verdict.
 *
 * The route remains a narrow on-demand fallback for residual unknowns the facts
 * couldn't resolve.
 */

import type { Disorder } from '../../data/diagnosisCriteria'
import { buildEvaluationContext } from '../diagnosisCriteria/context'
import { evaluateDisorder, type DisorderEvaluation } from '../diagnosisCriteria/evaluateDisorder'
import {
  ISDM_PHENOMENOLOGY_DOMAINS,
  type CoursePattern,
  type IsdmConfidence,
  type IsdmPhenomenologyDomain,
  type SymptomFinding,
} from '../../types/isdm'
import type { RiskAxis, RiskFact, SymptomFact } from '../../types/clinicalMetadata'
import type { ButterflyCriterionQuery } from '../../services/butterflyExtractApi'
import type { IncomingAiSuggestion } from './aiSuggestions'
import { symptomFacts as selectSymptomFacts, riskFacts as selectRiskFacts } from '../clinicalMetadata/accessor'

/** Facts below this confidence are too weak to seed a suggestion. */
const MIN_FACT_CONFIDENCE = 0.5

function emptyPhenomenology(): Record<IsdmPhenomenologyDomain, SymptomFinding[]> {
  const map = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) map[domain] = []
  return map
}

function confidenceToOrdinal(confidence: number): IsdmConfidence {
  const n = Math.round(Math.min(1, Math.max(0, confidence)) * 4)
  return Math.min(4, Math.max(0, n)) as IsdmConfidence
}

const RISK_AXIS_DOMAIN: Record<RiskAxis, IsdmPhenomenologyDomain> = {
  suicide: 'risk_self',
  self_harm: 'risk_self',
  harm_others: 'risk_others',
  aggression: 'risk_others',
  self_neglect: 'appearance_behavior',
}

const RISK_AXIS_KEYWORDS: Record<RiskAxis, string[]> = {
  suicide: ['suizid', 'suizidal', 'suizidgedanken', 'lebensüberdruss', 'selbstmord'],
  self_harm: ['selbstverletz', 'selbstgefährd', 'self harm'],
  harm_others: ['fremdgefährd', 'gewalt', 'homicid'],
  aggression: ['aggressiv', 'aggression', 'gereizt'],
  self_neglect: ['verwahrlos', 'selbstvernachlässig', 'hygiene'],
}

/** Convert accessor symptom + risk facts into an ISDM phenomenology substrate. */
export function buildFactPhenomenology(
  symptomFacts: SymptomFact[],
  riskFacts: RiskFact[],
): Record<IsdmPhenomenologyDomain, SymptomFinding[]> {
  const phenomenology = emptyPhenomenology()

  for (const fact of symptomFacts) {
    if (!fact.domain) continue
    if (fact.provenance.confidence < MIN_FACT_CONFIDENCE) continue
    phenomenology[fact.domain].push({
      id: `fact:${fact.id}`,
      domain: fact.domain,
      label: fact.label,
      keywords: [fact.label],
      evidenceStrength: fact.provenance.evidenceStrength,
      sourceImprintKeys: [fact.provenance.sourceId],
      confidence: confidenceToOrdinal(fact.provenance.confidence),
      polarity: fact.negated ? 'absent' : 'present',
      notes: fact.provenance.evidenceQuote ?? undefined,
    })
  }

  for (const fact of riskFacts) {
    if (fact.status === 'unclear') continue
    if (fact.provenance.confidence < MIN_FACT_CONFIDENCE) continue
    const domain = RISK_AXIS_DOMAIN[fact.axis]
    phenomenology[domain].push({
      id: `fact:${fact.id}`,
      domain,
      label: RISK_AXIS_KEYWORDS[fact.axis][0] ?? fact.axis,
      keywords: RISK_AXIS_KEYWORDS[fact.axis],
      evidenceStrength: fact.provenance.evidenceStrength,
      sourceImprintKeys: [fact.provenance.sourceId],
      confidence: confidenceToOrdinal(fact.provenance.confidence),
      polarity: fact.status === 'absent' ? 'absent' : 'present',
      notes: fact.provenance.evidenceQuote ?? undefined,
    })
  }

  return phenomenology
}

export interface FactSuggestionResult {
  /** Advisory suggestions for criteria the facts resolved (pending clinician accept). */
  suggestions: IncomingAiSuggestion[]
  /** Criteria still unknown after the facts pass — eligible for route fallback. */
  residualUnresolved: ButterflyCriterionQuery[]
}

/**
 * Pure: given the real disorder evaluation (with its `unknown` criteria) and a
 * phenomenology built from facts, return advisory suggestions for the criteria
 * the facts can resolve, plus the residual unresolved criteria. Quotes/confidence
 * come from the underlying facts, so every suggestion is evidence-backed.
 */
export function buildSuggestionsFromFacts(input: {
  disorder: Disorder
  evaluation: DisorderEvaluation
  factPhenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  coursePattern: CoursePattern
}): FactSuggestionResult {
  const { disorder, evaluation, factPhenomenology, coursePattern } = input

  // Index facts by their finding label so we can attach an evidence quote.
  const findingByLabel = new Map<string, SymptomFinding>()
  for (const findings of Object.values(factPhenomenology)) {
    for (const finding of findings) findingByLabel.set(finding.label, finding)
  }

  const factCtx = buildEvaluationContext({ phenomenology: factPhenomenology, coursePattern })
  const factEval = evaluateDisorder(disorder, factCtx)
  const factByCriterion = new Map(factEval.perCriterion.map((r) => [r.criterionId, r]))

  const suggestions: IncomingAiSuggestion[] = []
  const residualUnresolved: ButterflyCriterionQuery[] = []

  for (const result of evaluation.perCriterion) {
    if (result.status !== 'unknown') continue
    const factResult = factByCriterion.get(result.criterionId)
    if (factResult && (factResult.status === 'met' || factResult.status === 'not_met')) {
      const finding = factResult.evidence ? findingByLabel.get(factResult.evidence) : undefined
      suggestions.push({
        criterionId: result.criterionId,
        status: factResult.status,
        evidenceQuote: finding?.notes ?? factResult.evidence ?? null,
        confidence: finding ? finding.confidence / 4 : 0.5,
      })
    } else {
      residualUnresolved.push({ id: result.criterionId, text: result.text_de })
    }
  }

  return { suggestions, residualUnresolved }
}

/** Convenience: build suggestions straight from the accessor for a case. */
export function suggestionsFromCaseFacts(input: {
  caseId: string
  disorder: Disorder
  evaluation: DisorderEvaluation
  coursePattern: CoursePattern
}): FactSuggestionResult {
  const factPhenomenology = buildFactPhenomenology(
    selectSymptomFacts(input.caseId),
    selectRiskFacts(input.caseId),
  )
  return buildSuggestionsFromFacts({
    disorder: input.disorder,
    evaluation: input.evaluation,
    factPhenomenology,
    coursePattern: input.coursePattern,
  })
}

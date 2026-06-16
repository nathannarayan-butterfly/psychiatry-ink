import { describe, expect, it } from 'vitest'
import { buildFactPhenomenology, buildSuggestionsFromFacts } from '../factSuggestions'
import { buildEvaluationContext } from '../../diagnosisCriteria/context'
import { evaluateDisorder } from '../../diagnosisCriteria/evaluateDisorder'
import { depressiveEpisode } from '../../../data/diagnosisCriteria/depressiveEpisode'
import { ISDM_PHENOMENOLOGY_DOMAINS, type CoursePattern, type IsdmPhenomenologyDomain, type SymptomFinding } from '../../../types/isdm'
import {
  CMEA_EXTRACTOR_VERSION,
  type RiskFact,
  type SymptomFact,
} from '../../../types/clinicalMetadata'

function symptomFact(domain: IsdmPhenomenologyDomain, label: string, confidence = 0.8, negated = false): SymptomFact {
  return {
    id: `aufnahme:document:symptom:${label}`,
    kind: 'symptom',
    caseId: 'c',
    label,
    domain,
    severity: null,
    onset: null,
    durationDays: null,
    negated,
    provenance: {
      sourceType: 'anamnesis',
      sourceId: 'aufnahme:document',
      sourceDate: '2024-01-01T00:00:00.000Z',
      evidenceStrength: 'inferred',
      evidenceQuote: `Beleg: ${label}`,
      confidence,
      extractor: 'llm',
      extractorVersion: CMEA_EXTRACTOR_VERSION,
    },
  }
}

function riskFact(axis: RiskFact['axis'], status: RiskFact['status'], confidence = 0.9): RiskFact {
  return {
    id: `aufnahme:document:risk:${axis}`,
    kind: 'risk',
    caseId: 'c',
    axis,
    status,
    acuity: null,
    provenance: {
      sourceType: 'anamnesis',
      sourceId: 'aufnahme:document',
      sourceDate: '2024-01-01T00:00:00.000Z',
      evidenceStrength: 'inferred',
      evidenceQuote: `Beleg Risiko ${axis}`,
      confidence,
      extractor: 'llm',
      extractorVersion: CMEA_EXTRACTOR_VERSION,
    },
  }
}

function emptyPhenomenology(): Record<IsdmPhenomenologyDomain, SymptomFinding[]> {
  const map = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) map[domain] = []
  return map
}

const course: CoursePattern = {
  onset: 'unclear',
  duration: 'weeks',
  episodicity: 'unclear',
  trajectory: [],
  contextualTriggers: [],
  precipitants: [],
  summary: 'weeks',
}

describe('buildFactPhenomenology', () => {
  it('maps symptom + risk facts into phenomenology domains, skipping low-confidence', () => {
    const phen = buildFactPhenomenology(
      [symptomFact('mood_affect', 'gedrückt'), symptomFact('mood_affect', 'weak', 0.3)],
      [riskFact('suicide', 'present'), riskFact('aggression', 'unclear')],
    )
    expect(phen.mood_affect).toHaveLength(1)
    expect(phen.risk_self).toHaveLength(1)
    expect(phen.risk_others).toHaveLength(0)
    expect(phen.mood_affect[0]?.notes).toBe('Beleg: gedrückt')
  })
})

describe('buildSuggestionsFromFacts', () => {
  it('produces advisory suggestions for unknown criteria the facts resolve', () => {
    // Real evaluation: empty context → all criteria unknown.
    const realCtx = buildEvaluationContext({ phenomenology: emptyPhenomenology(), coursePattern: course })
    const realEval = evaluateDisorder(depressiveEpisode, realCtx)

    const factPhenomenology = buildFactPhenomenology(
      [symptomFact('mood_affect', 'gedrückt'), symptomFact('mood_affect', 'anhedonie')],
      [],
    )
    const { suggestions, residualUnresolved } = buildSuggestionsFromFacts({
      disorder: depressiveEpisode,
      evaluation: realEval,
      factPhenomenology,
      coursePattern: course,
    })

    const moodSuggestion = suggestions.find((s) => s.criterionId === 'f32.depressed_mood')
    expect(moodSuggestion?.status).toBe('met')
    expect(moodSuggestion?.evidenceQuote).toBe('Beleg: gedrückt')
    expect(moodSuggestion?.confidence).toBeGreaterThan(0)

    // Criteria the facts couldn't resolve remain for the route fallback.
    expect(residualUnresolved.some((c) => c.id === 'f32.reduced_energy')).toBe(true)
    // Resolved criteria are NOT in the residual list.
    expect(residualUnresolved.some((c) => c.id === 'f32.depressed_mood')).toBe(false)
  })

  it('never emits suggestions for criteria already resolved deterministically', () => {
    const realPhen = emptyPhenomenology()
    realPhen.mood_affect.push({
      id: 'real',
      domain: 'mood_affect',
      label: 'gedrückt',
      keywords: ['gedrückt'],
      evidenceStrength: 'direct_observation',
      sourceImprintKeys: ['x'],
      confidence: 3,
      polarity: 'present',
    })
    const realCtx = buildEvaluationContext({ phenomenology: realPhen, coursePattern: course })
    const realEval = evaluateDisorder(depressiveEpisode, realCtx)

    const factPhenomenology = buildFactPhenomenology([symptomFact('mood_affect', 'gedrückt')], [])
    const { suggestions } = buildSuggestionsFromFacts({
      disorder: depressiveEpisode,
      evaluation: realEval,
      factPhenomenology,
      coursePattern: course,
    })
    // f32.depressed_mood is already 'met' deterministically → no suggestion.
    expect(suggestions.some((s) => s.criterionId === 'f32.depressed_mood')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type {
  CoursePattern,
  IsdmPhenomenologyDomain,
  SymptomFinding,
} from '../../../types/isdm'
import { ISDM_PHENOMENOLOGY_DOMAINS } from '../../../types/isdm'
import { buildEvaluationContext, type AttestationMap } from '../context'
import { evaluateDisorder } from '../evaluateDisorder'
import { depressiveEpisode } from '../../../data/diagnosisCriteria/depressiveEpisode'
import { alcoholDependence } from '../../../data/diagnosisCriteria/alcoholDependence'
import { schizophrenia } from '../../../data/diagnosisCriteria/schizophrenia'

type Polarity = SymptomFinding['polarity']

function finding(
  domain: IsdmPhenomenologyDomain,
  label: string,
  polarity: Polarity = 'present',
): SymptomFinding {
  return {
    id: `${domain}:${label}`,
    domain,
    label,
    keywords: [label],
    evidenceStrength: 'direct_observation',
    sourceImprintKeys: ['test'],
    confidence: 3,
    polarity,
  }
}

function emptyPhenomenology(): Record<IsdmPhenomenologyDomain, SymptomFinding[]> {
  const record = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) record[domain] = []
  return record
}

function makeCourse(duration: CoursePattern['duration'] = 'weeks'): CoursePattern {
  return {
    onset: 'unclear',
    duration,
    episodicity: 'unclear',
    trajectory: [],
    contextualTriggers: [],
    precipitants: [],
    summary: `duration ${duration}`,
  }
}

function buildContext(
  findings: SymptomFinding[],
  course: CoursePattern = makeCourse(),
  attestations: AttestationMap = {},
) {
  const phenomenology = emptyPhenomenology()
  for (const f of findings) phenomenology[f.domain].push(f)
  return buildEvaluationContext({ phenomenology, coursePattern: course, attestations })
}

describe('evaluateDisorder — alcohol dependence (F10.2)', () => {
  it('returns not_met for documented occasional/controlled use and lists missing dependence criteria', () => {
    const ctx = buildContext([
      finding('substance_related_features', 'gelegentlicher Alkoholkonsum, kein täglicher Konsum'),
    ])

    const result = evaluateDisorder(alcoholDependence, ctx)

    expect(result.verdict).toBe('not_met')
    expect(ctx.substanceControlledUse).toBe(true)
    // All six dependence features are flagged as missing (none auto-derivable / positively present).
    expect(result.criteriaMissing.length).toBe(6)
    expect(result.criteriaMissing.some((t) => /Craving|Verlangen/i.test(t))).toBe(true)
    expect(result.hasSignal).toBe(false)
  })

  it('returns criteria_met when ≥3 dependence features are present', () => {
    const ctx = buildContext([
      finding('substance_related_features', 'starkes Verlangen nach Alkohol (Craving)'),
      finding('substance_related_features', 'morgendlicher Entzug mit Tremor'),
      finding('substance_related_features', 'deutliche Toleranzentwicklung'),
    ])

    const result = evaluateDisorder(alcoholDependence, ctx)

    expect(result.verdict).toBe('criteria_met')
    expect(result.criteriaMet.length).toBeGreaterThanOrEqual(3)
    expect(result.hasSignal).toBe(true)
  })
})

describe('evaluateDisorder — depressive episode (F32)', () => {
  it('satisfies the core symptom group from documented depressed mood + anhedonia', () => {
    const ctx = buildContext(
      [
        finding('mood_affect', 'Gedrückt'),
        finding('mood_affect', 'Anhedonie'),
        finding('sleep_appetite_vegetative', 'Schlaf reduziert'),
        finding('drive_psychomotor_activity', 'Antrieb vermindert'),
      ],
      makeCourse('weeks'),
    )

    const result = evaluateDisorder(depressiveEpisode, ctx)

    const core = result.groupResults.find((g) => g.groupId === 'f32.core')
    expect(core?.satisfaction).toBe('yes')
    expect(result.criteriaMet.some((t) => /Gedrückte/i.test(t))).toBe(true)
    expect(result.hasSignal).toBe(true)
  })

  it('downgrades the core group to unknown when course duration is unknown', () => {
    const ctx = buildContext(
      [finding('mood_affect', 'Gedrückt'), finding('mood_affect', 'Anhedonie')],
      makeCourse('unclear'),
    )

    const result = evaluateDisorder(depressiveEpisode, ctx)
    const core = result.groupResults.find((g) => g.groupId === 'f32.core')
    // Symptoms met, but the ≥2-week timeWindow can't be confirmed → not "yes".
    expect(core?.satisfaction).toBe('unknown')
  })
})

describe('evaluateDisorder — insufficient data', () => {
  it('returns insufficient_data for an empty context', () => {
    const ctx = buildContext([], makeCourse('unclear'))
    const result = evaluateDisorder(schizophrenia, ctx)
    expect(result.verdict).toBe('insufficient_data')
    expect(result.hasSignal).toBe(false)
  })
})

describe('evaluateDisorder — clinician attestation', () => {
  it('lets an attestation flip an unknown criterion to met and counts toward the verdict', () => {
    const baseFindings = [
      finding('substance_related_features', 'starkes Verlangen nach Alkohol (Craving)'),
      finding('substance_related_features', 'morgendlicher Entzug mit Tremor'),
    ]
    const withoutAttestation = evaluateDisorder(alcoholDependence, buildContext(baseFindings))
    expect(withoutAttestation.verdict).toBe('insufficient_data')

    const attested = evaluateDisorder(
      alcoholDependence,
      buildContext(baseFindings, makeCourse(), { 'f10_2.tolerance': 'met' }),
    )
    expect(attested.verdict).toBe('criteria_met')
    const tolerance = attested.perCriterion.find((c) => c.criterionId === 'f10_2.tolerance')
    expect(tolerance?.source).toBe('attested')
    expect(tolerance?.status).toBe('met')
  })
})

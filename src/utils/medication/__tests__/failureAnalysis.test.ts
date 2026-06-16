import { describe, expect, it } from 'vitest'
import type {
  DeterministicFailureSignals,
  PriorTherapyItem,
} from '../../../types/priorTherapies'
import {
  buildFailureAnalysisFromSignals,
  isCyp1a2SmokingSensitive,
  sanitizeFailureCauses,
} from '../failureAnalysisSynthesis'
import {
  type FailureAnalysisContext,
  type SpiegelSeriesLike,
  computeFailureSignals,
  detectPoorAdherence,
  detectSmoking,
  detectSubtherapeuticLevel,
  isInefficacyFailure,
} from '../priorTherapyFailureAnalysis'

function signals(overrides: Partial<DeterministicFailureSignals> = {}): DeterministicFailureSignals {
  return {
    substance: 'Olanzapin',
    subtherapeuticLevel: null,
    levelMeasured: false,
    cyp1a2Smoking: false,
    smoking: null,
    poorAdherence: null,
    inadequateDoseDuration: null,
    receptorProfileSummary: null,
    ...overrides,
  }
}

function failedItem(overrides: Partial<PriorTherapyItem> = {}): PriorTherapyItem {
  return {
    substance: 'Olanzapin',
    event: 'no_response',
    reason: null,
    timeframe: 'history',
    source: 'aufnahme',
    evidenceQuote: null,
    inferred: true,
    ...overrides,
  }
}

describe('buildFailureAnalysisFromSignals', () => {
  it('flags a documented subtherapeutic level', () => {
    const analysis = buildFailureAnalysisFromSignals(
      signals({
        substance: 'Lithium',
        subtherapeuticLevel: { parameter: 'Lithium', value: 0.3, unit: 'mmol/L', refMin: 0.6, refMax: 1.2 },
        levelMeasured: true,
      }),
    )
    const causes = analysis.likelyCauses.map((c) => c.cause)
    expect(causes).toContain('subtherapeutic_level')
    const lvl = analysis.likelyCauses.find((c) => c.cause === 'subtherapeutic_level')!
    expect(lvl.evidence).toContain('0.3')
    expect(lvl.confidence).toBeGreaterThan(0.5)
  })

  it('flags CYP1A2 induction by smoking', () => {
    const analysis = buildFailureAnalysisFromSignals(
      signals({ substance: 'Clozapin', cyp1a2Smoking: true, smoking: true }),
    )
    expect(analysis.likelyCauses.map((c) => c.cause)).toContain('cyp_induction_smoking')
  })

  it('flags poor adherence and inadequate dose/duration', () => {
    const analysis = buildFailureAnalysisFromSignals(
      signals({
        poorAdherence: { note: 'Einnahme unregelmäßig' },
        inadequateDoseDuration: { detail: 'Therapiedauer nur ca. 5 Tage (< 2 Wochen).' },
      }),
    )
    const causes = analysis.likelyCauses.map((c) => c.cause)
    expect(causes).toContain('adherence')
    expect(causes).toContain('inadequate_dose_duration')
  })

  it('returns insufficient_data when nothing is documented', () => {
    const analysis = buildFailureAnalysisFromSignals(signals())
    expect(analysis.likelyCauses).toHaveLength(1)
    expect(analysis.likelyCauses[0]!.cause).toBe('insufficient_data')
  })

  it('sorts causes by descending confidence', () => {
    const analysis = buildFailureAnalysisFromSignals(
      signals({
        subtherapeuticLevel: { parameter: 'Clozapin', value: 200, unit: 'ng/mL', refMin: 350, refMax: 600 },
        levelMeasured: true,
        cyp1a2Smoking: true,
        smoking: true,
      }),
    )
    const confidences = analysis.likelyCauses.map((c) => c.confidence)
    expect([...confidences].sort((a, b) => b - a)).toEqual(confidences)
  })
})

describe('isCyp1a2SmokingSensitive', () => {
  it('recognises clozapine and olanzapine', () => {
    expect(isCyp1a2SmokingSensitive('Clozapin')).toBe(true)
    expect(isCyp1a2SmokingSensitive('Olanzapin 10mg')).toBe(true)
  })
  it('ignores non-CYP1A2 agents', () => {
    expect(isCyp1a2SmokingSensitive('Sertralin')).toBe(false)
    expect(isCyp1a2SmokingSensitive('Risperidon')).toBe(false)
  })
})

describe('sanitizeFailureCauses', () => {
  it('keeps valid causes and drops unknown ones', () => {
    const out = sanitizeFailureCauses([
      { cause: 'adherence', explanation_de: 'Unregelmäßige Einnahme.', confidence: 0.7 },
      { cause: 'not_a_cause', explanation_de: 'x', confidence: 1 },
      { cause: 'subtherapeutic_level', explanation_de: '', confidence: 0.9 },
    ])
    expect(out.map((c) => c.cause)).toEqual(['adherence'])
    expect(out[0]!.confidence).toBe(0.7)
  })

  it('clamps confidence into [0,1]', () => {
    const out = sanitizeFailureCauses([
      { cause: 'other', explanation_de: 'Sonstiges.', confidence: 5 },
    ])
    expect(out[0]!.confidence).toBe(1)
  })
})

describe('detectSubtherapeuticLevel', () => {
  const series: SpiegelSeriesLike[] = [
    {
      name: 'Clozapin',
      unit: 'ng/mL',
      refMin: 350,
      refMax: 600,
      points: [{ value: 180, date: '2026-01-10', refMin: 350, refMax: 600 }],
    },
  ]

  it('detects a below-range level for the substance', () => {
    const result = detectSubtherapeuticLevel('Clozapin', series)
    expect(result.measured).toBe(true)
    expect(result.subtherapeutic?.value).toBe(180)
  })

  it('reports measured-but-in-range without a subtherapeutic signal', () => {
    const inRange: SpiegelSeriesLike[] = [
      { name: 'Lithium', unit: 'mmol/L', refMin: 0.6, points: [{ value: 0.8, date: '2026-01-10', refMin: 0.6 }] },
    ]
    const result = detectSubtherapeuticLevel('Lithium', inRange)
    expect(result.measured).toBe(true)
    expect(result.subtherapeutic).toBeNull()
  })

  it('returns not-measured when no series matches', () => {
    expect(detectSubtherapeuticLevel('Quetiapin', series)).toEqual({
      measured: false,
      subtherapeutic: null,
    })
  })
})

describe('detectSmoking', () => {
  it('detects a smoker', () => {
    expect(detectSmoking('Nikotinabusus seit Jahren, raucht ca. 20 Zigaretten/Tag')).toBe(true)
  })
  it('detects a non-smoker', () => {
    expect(detectSmoking('Patient ist Nichtraucher')).toBe(false)
  })
  it('returns null when undocumented', () => {
    expect(detectSmoking('Keine Angaben zur Suchtanamnese.')).toBeNull()
  })
})

describe('detectPoorAdherence', () => {
  it('flags poor adherence text', () => {
    expect(detectPoorAdherence('Einnahme unregelmäßig, Compliance unsicher')).toBe(true)
  })
  it('does not flag good adherence', () => {
    expect(detectPoorAdherence('Regelmäßige Einnahme, gute Adhärenz')).toBe(false)
  })
})

describe('isInefficacyFailure', () => {
  it('treats no_response and partial_response as failures', () => {
    expect(isInefficacyFailure(failedItem({ event: 'no_response' }))).toBe(true)
    expect(isInefficacyFailure(failedItem({ event: 'partial_response' }))).toBe(true)
  })
  it('treats a discontinuation for inefficacy as a failure', () => {
    expect(
      isInefficacyFailure(failedItem({ event: 'discontinued', reason: 'wirkungslos geblieben' })),
    ).toBe(true)
  })
  it('does not treat side-effect stops as efficacy failures', () => {
    expect(isInefficacyFailure(failedItem({ event: 'side_effect', reason: 'Hyperprolaktinämie' }))).toBe(
      false,
    )
  })
})

describe('computeFailureSignals — smoker + clozapine', () => {
  it('sets the CYP1A2/smoking signal and synthesises that cause', () => {
    const ctx: FailureAnalysisContext = {
      spiegelSeries: [],
      smoking: true,
      entriesBySubstance: new Map(),
    }
    const result = computeFailureSignals(failedItem({ substance: 'Clozapin' }), ctx)
    expect(result.cyp1a2Smoking).toBe(true)
    const analysis = buildFailureAnalysisFromSignals(result)
    expect(analysis.likelyCauses.map((c) => c.cause)).toContain('cyp_induction_smoking')
  })

  it('does not set the CYP signal for a non-smoker', () => {
    const ctx: FailureAnalysisContext = {
      spiegelSeries: [],
      smoking: false,
      entriesBySubstance: new Map(),
    }
    const result = computeFailureSignals(failedItem({ substance: 'Clozapin' }), ctx)
    expect(result.cyp1a2Smoking).toBe(false)
  })
})

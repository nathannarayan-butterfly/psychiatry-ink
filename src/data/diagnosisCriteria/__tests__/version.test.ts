import { describe, expect, it } from 'vitest'
import type {
  CoursePattern,
  IsdmPhenomenologyDomain,
  SymptomFinding,
} from '../../../types/isdm'
import { ISDM_PHENOMENOLOGY_DOMAINS } from '../../../types/isdm'
import { buildEvaluationContext } from '../../../utils/diagnosisCriteria/context'
import { evaluateDisorder } from '../../../utils/diagnosisCriteria/evaluateDisorder'
import { buildDisorderAdvice } from '../../../utils/diagnosisCriteria/advice'
import {
  hasDistinctIcd11,
  resolveDisorderForCodingSystem,
  toButterflyIcdVersion,
} from '../version'
import type { Disorder } from '../schema'
import { alcoholDependence } from '../alcoholDependence'

/** A minimal ICD-10-only disorder (no distinct ICD-11 set), for fallback checks. */
const icd10OnlyDisorder: Disorder = {
  id: 'test_icd10_only',
  classification: 'icd10',
  code: 'F99',
  name_de: 'Testdiagnose',
  crosswalkKey: 'F99',
  sourceRef: 'operationalisiert nach ICD-10 F99',
  version: 1,
  status: 'draft',
  codingSystems: { icd10: { code: 'F99', label_de: 'Test' } },
  differentials_de: [],
  groups: [
    {
      id: 'f99.core',
      label_de: 'Kern',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        { id: 'f99.a', text_de: 'A', mappingHints: [], allowClinicianAttest: true },
      ],
    },
  ],
}

function finding(domain: IsdmPhenomenologyDomain, label: string): SymptomFinding {
  return {
    id: `${domain}:${label}`,
    domain,
    label,
    keywords: [label],
    evidenceStrength: 'direct_observation',
    sourceImprintKeys: ['test'],
    confidence: 3,
    polarity: 'present',
  }
}

function makeCourse(duration: CoursePattern['duration'] = 'years'): CoursePattern {
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

function buildContext(findings: SymptomFinding[]) {
  const phenomenology = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) phenomenology[domain] = []
  for (const f of findings) phenomenology[f.domain].push(f)
  return buildEvaluationContext({ phenomenology, coursePattern: makeCourse() })
}

describe('toButterflyIcdVersion', () => {
  it('maps the Diagnosen coding system to a Butterfly criteria version', () => {
    expect(toButterflyIcdVersion('icd10')).toBe('icd10')
    expect(toButterflyIcdVersion('icd11')).toBe('icd11')
    // DSM has no encoded criterion text → deliberately reuses the ICD-10 tree.
    expect(toButterflyIcdVersion('dsm')).toBe('icd10')
  })
})

describe('resolveDisorderForCodingSystem', () => {
  it('returns the SAME object reference in ICD-10 mode (byte-identical behaviour)', () => {
    expect(resolveDisorderForCodingSystem(alcoholDependence, 'icd10')).toBe(alcoholDependence)
  })

  it('falls back to the ICD-10 tree (identity) when no ICD-11 set is authored', () => {
    expect(hasDistinctIcd11(icd10OnlyDisorder)).toBe(false)
    expect(resolveDisorderForCodingSystem(icd10OnlyDisorder, 'icd11')).toBe(icd10OnlyDisorder)
  })

  it('swaps to the distinct ICD-11 tree when authored', () => {
    expect(hasDistinctIcd11(alcoholDependence)).toBe(true)
    const v11 = resolveDisorderForCodingSystem(alcoholDependence, 'icd11')
    expect(v11).not.toBe(alcoholDependence)
    expect(v11.classification).toBe('icd11')
    expect(v11.code).toBe('6C40.2')
    expect(v11.sourceRef).toBe('operationalisiert nach ICD-11 6C40.2')
    // ICD-11 dependence is a single 2-of-3 group (vs ICD-10's 3-of-6).
    expect(v11.groups).toHaveLength(1)
    const group = v11.groups[0]
    expect(group.threshold).toBe(2)
    expect(group.criteria).toHaveLength(3)
    expect(group.criteria.map((c) => c.id)).toEqual([
      '6c40_2.impaired_control',
      '6c40_2.salience',
      '6c40_2.physiological',
    ])
    // The ICD-10 tree is untouched (6 features, threshold 3).
    expect(alcoholDependence.groups[0].threshold).toBe(3)
    expect(alcoholDependence.groups[0].criteria).toHaveLength(6)
  })
})

describe('toggling the ICD version changes the deterministic evaluation', () => {
  // Two documented dependence features: craving + tolerance. ICD-10 needs ≥ 3 of
  // 6 → insufficient; ICD-11 needs ≥ 2 of 3 (craving → impaired control,
  // tolerance → physiological) → criteria met. Same evidence, different verdict.
  const ctx = buildContext([
    finding('substance_related_features', 'starkes Verlangen nach Alkohol (Craving)'),
    finding('substance_related_features', 'deutliche Toleranzentwicklung'),
  ])

  it('ICD-10 mode: two features are insufficient (≥ 3 of 6 required)', () => {
    const v10 = resolveDisorderForCodingSystem(alcoholDependence, 'icd10')
    const result = evaluateDisorder(v10, ctx)
    expect(result.verdict).toBe('insufficient_data')
  })

  it('ICD-11 mode: the same two features meet the ≥ 2 of 3 threshold', () => {
    const v11 = resolveDisorderForCodingSystem(alcoholDependence, 'icd11')
    const result = evaluateDisorder(v11, ctx)
    expect(result.verdict).toBe('criteria_met')
    // Advice headline reflects the active classification.
    const advice = buildDisorderAdvice(result, v11)
    expect(advice.headline).toContain('ICD-11')
  })

  it('DSM mode reuses the ICD-10 tree (no DSM criteria encoded)', () => {
    const vDsm = resolveDisorderForCodingSystem(alcoholDependence, toButterflyIcdVersion('dsm'))
    expect(vDsm).toBe(alcoholDependence)
    expect(evaluateDisorder(vDsm, ctx).verdict).toBe('insufficient_data')
  })
})

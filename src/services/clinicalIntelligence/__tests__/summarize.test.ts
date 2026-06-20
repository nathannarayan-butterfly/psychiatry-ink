import { describe, expect, it } from 'vitest'
import {
  sortDimensionalFindings,
  summarizeDimensional,
} from '../dimensionalIntegration'
import {
  sortMechanismHypotheses,
  summarizeMechanisms,
} from '../mechanismInference'
import type {
  DimensionalFinding,
  DimensionalIntegrationResult,
  MechanismHypothesis,
  MechanismInferenceResult,
} from '../../../types/clinicalIntelligence'
import {
  CLINICAL_INTELLIGENCE_DIMENSIONS,
} from '../../../data/clinicalIntelligence/dimensions'
import {
  CLINICAL_INTELLIGENCE_MECHANISMS,
} from '../../../data/clinicalIntelligence/mechanisms'

function dim(
  overrides: Partial<DimensionalFinding> & Pick<DimensionalFinding, 'dimensionId'>,
): DimensionalFinding {
  return {
    dimensionId: overrides.dimensionId,
    dimensionName: overrides.dimensionName ?? overrides.dimensionId,
    severity: overrides.severity ?? 2,
    confidence: overrides.confidence ?? 'moderate',
    longitudinalPattern: overrides.longitudinalPattern ?? '',
    supportingEvidenceIds: overrides.supportingEvidenceIds ?? ['anam-1'],
    contradictingEvidenceIds: overrides.contradictingEvidenceIds ?? [],
    clinicalSummary: overrides.clinicalSummary ?? 'summary',
    uncertainty: overrides.uncertainty ?? '',
    missingData: overrides.missingData ?? '',
    reviewStatus: overrides.reviewStatus ?? 'pending',
    source: overrides.source ?? 'evidence_based',
  }
}

function mech(
  overrides: Partial<MechanismHypothesis> & Pick<MechanismHypothesis, 'mechanismId'>,
): MechanismHypothesis {
  return {
    mechanismId: overrides.mechanismId,
    label: overrides.label ?? overrides.mechanismId,
    confidence: overrides.confidence ?? 'moderate',
    linkedDimensions: overrides.linkedDimensions ?? [],
    supportingEvidenceIds: overrides.supportingEvidenceIds ?? ['anam-1'],
    contradictingEvidenceIds: overrides.contradictingEvidenceIds ?? [],
    clinicalImplication: overrides.clinicalImplication ?? 'implication',
    treatmentRelevance: overrides.treatmentRelevance ?? 'relevance',
    uncertainty: overrides.uncertainty ?? '',
    reviewStatus: overrides.reviewStatus ?? 'pending',
    source: overrides.source ?? 'evidence_based',
  }
}

describe('catalogs', () => {
  it('contains exactly 27 dimensions with unique ids', () => {
    expect(CLINICAL_INTELLIGENCE_DIMENSIONS).toHaveLength(27)
    const ids = new Set(CLINICAL_INTELLIGENCE_DIMENSIONS.map((d) => d.id))
    expect(ids.size).toBe(27)
  })

  it('contains exactly 15 mechanisms with unique ids', () => {
    expect(CLINICAL_INTELLIGENCE_MECHANISMS).toHaveLength(15)
    const ids = new Set(CLINICAL_INTELLIGENCE_MECHANISMS.map((m) => m.id))
    expect(ids.size).toBe(15)
  })
})

describe('sortDimensionalFindings', () => {
  it('orders by severity desc, confidence desc, then catalog order', () => {
    const findings = [
      dim({ dimensionId: 'depressive-inhibition', severity: 2, confidence: 'high' }),
      dim({ dimensionId: 'mania-activation', severity: 4, confidence: 'low' }),
      dim({ dimensionId: 'anxiety-threat-anticipation', severity: 4, confidence: 'moderate' }),
    ]
    const sorted = sortDimensionalFindings(findings)
    expect(sorted[0].dimensionId).toBe('anxiety-threat-anticipation')
    expect(sorted[1].dimensionId).toBe('mania-activation')
    expect(sorted[2].dimensionId).toBe('depressive-inhibition')
  })
})

describe('summarizeDimensional', () => {
  it('returns empty stats when result is null', () => {
    const stats = summarizeDimensional(null)
    expect(stats.activeCount).toBe(0)
    expect(stats.topDimensions).toHaveLength(0)
  })

  it('aggregates counts, max severity, top 3 and missing-data count', () => {
    const result: DimensionalIntegrationResult = {
      activeDimensions: [
        dim({ dimensionId: 'depressive-inhibition', severity: 3, confidence: 'high', reviewStatus: 'accepted' }),
        dim({ dimensionId: 'anxiety-threat-anticipation', severity: 4, confidence: 'moderate', reviewStatus: 'edited', missingData: 'sleep history unclear' }),
        dim({ dimensionId: 'sleep-circadian-regulation', severity: 1, confidence: 'low', reviewStatus: 'pending' }),
        dim({ dimensionId: 'reward-motivation-deficit', severity: 2, confidence: 'moderate', reviewStatus: 'pending' }),
      ],
      exploratoryInsufficientEvidence: [{ topic: 'Sleep', rationale: 'no data' }],
      quarantined: [],
    }
    const s = summarizeDimensional(result)
    expect(s.activeCount).toBe(4)
    expect(s.maxSeverity).toBe(4)
    expect(s.topDimensions).toHaveLength(3)
    expect(s.topDimensions[0].dimensionId).toBe('anxiety-threat-anticipation')
    expect(s.confidenceCounts.high).toBe(1)
    expect(s.confidenceCounts.moderate).toBe(2)
    expect(s.confidenceCounts.low).toBe(1)
    expect(s.acceptedCount).toBe(1)
    expect(s.editedCount).toBe(1)
    expect(s.pendingCount).toBe(2)
    expect(s.missingDataCount).toBe(1)
    expect(s.exploratoryCount).toBe(1)
  })
})

describe('summarizeMechanisms', () => {
  it('flags hasOnlyExploratory when active set is empty but exploratory has items', () => {
    const result: MechanismInferenceResult = {
      activeMechanisms: [],
      exploratoryInsufficientEvidence: [{ topic: 'X', rationale: 'no evidence' }],
      quarantined: [],
    }
    expect(summarizeMechanisms(result).hasOnlyExploratory).toBe(true)
  })

  it('sorts mechanisms by confidence then catalog order', () => {
    const ms = [
      mech({ mechanismId: 'habit-compulsion-loop-dysfunction', confidence: 'low' }),
      mech({ mechanismId: 'reward-processing-dysfunction', confidence: 'high' }),
      mech({ mechanismId: 'circadian-sleep-wake-dysregulation', confidence: 'high' }),
    ]
    const sorted = sortMechanismHypotheses(ms)
    expect(sorted[0].confidence).toBe('high')
    expect(sorted[1].confidence).toBe('high')
    // catalog order: reward (6) before circadian (11)
    expect(sorted[0].mechanismId).toBe('reward-processing-dysfunction')
    expect(sorted[1].mechanismId).toBe('circadian-sleep-wake-dysregulation')
    expect(sorted[2].mechanismId).toBe('habit-compulsion-loop-dysfunction')
  })
})

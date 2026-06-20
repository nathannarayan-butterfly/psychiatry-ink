import { describe, expect, it } from 'vitest'
import {
  parseAndValidateDimensional,
  parseAndValidateMechanism,
} from '../validate'
import { truncateForDiagnostics } from '../run'
import {
  ClinicalIntelligenceRunResponseSchema,
  DimensionalIntegrationResultSchema,
  MechanismInferenceResultSchema,
  type CompactEvidencePayload,
} from '../../../../src/types/clinicalIntelligence'

function evidence(): CompactEvidencePayload {
  return {
    caseId: 'c1',
    builtAt: '2026-06-20T10:00:00.000Z',
    isDeidentified: true,
    patientLabel: 'Patient',
    items: [
      { id: 'anam-1', category: 'anamnesis', label: 'Anamnese', text: 'Depressed mood and anhedonia for several weeks.' },
      { id: 'inv-1', category: 'investigations', label: 'Befunde', text: 'PHQ-9 score 19.' },
    ],
  }
}

describe('parseAndValidateDimensional', () => {
  it('returns empty active set and warning when JSON parse fails', () => {
    const { result, issues } = parseAndValidateDimensional(
      'not valid {{ json',
      evidence(),
      { rejectedIds: [] },
    )
    expect(result.activeDimensions).toHaveLength(0)
    expect(result.quarantined.length).toBeGreaterThan(0)
    expect(result.warning).toBeTruthy()
    expect(issues.join('|')).toContain('JSON parse failed')
  })

  it('salvages valid items and quarantines unknown ids / duplicates / missing fields', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          dimensionName: 'Depressive Inhibition',
          severity: 3,
          confidence: 'moderate',
          clinicalSummary: 'Marked psychomotor slowing.',
          supportingEvidenceIds: ['anam-1', 'inv-1'],
          contradictingEvidenceIds: [],
          longitudinalPattern: 'persistierend',
          uncertainty: '',
          missingData: '',
        },
        // Unknown id → quarantined
        {
          dimensionId: 'totally-made-up',
          severity: 2,
          confidence: 'high',
          clinicalSummary: 'Should not appear',
          supportingEvidenceIds: ['anam-1'],
        },
        // Duplicate → quarantined
        {
          dimensionId: 'depressive-inhibition',
          severity: 2,
          confidence: 'low',
          clinicalSummary: 'dup',
          supportingEvidenceIds: ['anam-1'],
        },
        // Missing summary → quarantined
        {
          dimensionId: 'anxiety-threat-anticipation',
          severity: 2,
          confidence: 'low',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
      exploratoryInsufficientEvidence: [],
    })

    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(1)
    expect(result.activeDimensions[0].dimensionId).toBe('depressive-inhibition')
    expect(result.quarantined.length).toBeGreaterThanOrEqual(3)
  })

  it('demotes dimensions without supporting evidence to exploratory', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'mania-activation',
          dimensionName: 'Mania',
          severity: 2,
          confidence: 'low',
          clinicalSummary: 'Possible elevated mood with no evidence',
          supportingEvidenceIds: [],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(0)
    expect(result.exploratoryInsufficientEvidence.length).toBeGreaterThan(0)
  })

  it('refuses dimensions whose id is in the rejected list', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          severity: 3,
          confidence: 'high',
          clinicalSummary: 'Strong evidence',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), {
      rejectedIds: ['depressive-inhibition'],
    })
    expect(result.activeDimensions).toHaveLength(0)
    expect(result.quarantined[0].reason).toContain('previously rejected')
  })

  it('keeps both supporting + contradicting evidence ids on weak-evidence dimensions', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'aberrant-salience-psychotic-meaning',
          severity: 2,
          confidence: 'low',
          clinicalSummary: 'Equivocal — supports and contradicts present',
          supportingEvidenceIds: ['anam-1'],
          contradictingEvidenceIds: ['inv-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(1)
    const dim = result.activeDimensions[0]
    expect(dim.supportingEvidenceIds).toContain('anam-1')
    expect(dim.contradictingEvidenceIds).toContain('inv-1')
    expect(dim.confidence).toBe('low')
  })

  it('normalizes confidence "medium" → "moderate" (common LLM slip)', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          dimensionName: 'Depressive Inhibition',
          severity: 2,
          confidence: 'medium',
          clinicalSummary: 'Marked psychomotor slowing.',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(1)
    expect(result.activeDimensions[0].confidence).toBe('moderate')
  })

  it('also normalizes other confidence variants (mid/strong/mittel)', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          severity: 3,
          confidence: 'mid',
          clinicalSummary: 'Moderate',
          supportingEvidenceIds: ['anam-1'],
        },
        {
          dimensionId: 'anxiety-threat-anticipation',
          severity: 3,
          confidence: 'STRONG',
          clinicalSummary: 'High anxiety',
          supportingEvidenceIds: ['anam-1'],
        },
        {
          dimensionId: 'reward-motivation-deficit',
          severity: 2,
          confidence: 'mittel',
          clinicalSummary: 'Anhedonia',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    const byId = Object.fromEntries(
      result.activeDimensions.map((dim) => [dim.dimensionId, dim.confidence] as const),
    )
    expect(byId['depressive-inhibition']).toBe('moderate')
    expect(byId['anxiety-threat-anticipation']).toBe('high')
    expect(byId['reward-motivation-deficit']).toBe('moderate')
  })

  it('coerces severity from numeric string and clamps out-of-range values', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          severity: '3',
          confidence: 'low',
          clinicalSummary: 'Test',
          supportingEvidenceIds: ['anam-1'],
        },
        {
          dimensionId: 'anxiety-threat-anticipation',
          severity: 9,
          confidence: 'low',
          clinicalSummary: 'Test',
          supportingEvidenceIds: ['anam-1'],
        },
        {
          dimensionId: 'reward-motivation-deficit',
          severity: -2,
          confidence: 'low',
          clinicalSummary: 'Test',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    const byId = Object.fromEntries(
      result.activeDimensions.map((dim) => [dim.dimensionId, dim.severity] as const),
    )
    expect(byId['depressive-inhibition']).toBe(3)
    expect(byId['anxiety-threat-anticipation']).toBe(4)
    expect(byId['reward-motivation-deficit']).toBe(0)
  })

  it('applies defaults when LLM omits optional fields (longitudinalPattern, uncertainty, missingData, contradicting)', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          severity: 2,
          confidence: 'moderate',
          clinicalSummary: 'Mood low',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(1)
    const dim = result.activeDimensions[0]
    expect(dim.longitudinalPattern).toBe('')
    expect(dim.uncertainty).toBe('')
    expect(dim.missingData).toBe('')
    expect(dim.contradictingEvidenceIds).toEqual([])
    expect(dim.reviewStatus).toBe('pending')
    expect(dim.source).toBe('evidence_based')
  })

  it('quarantines absurdly long unknown dimensionId without exceeding rawId/reason caps', () => {
    const longBogusId = 'x'.repeat(800)
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: longBogusId,
          severity: 2,
          confidence: 'low',
          clinicalSummary: 'bogus',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(0)
    expect(result.quarantined.length).toBeGreaterThan(0)
    const entry = result.quarantined[0]
    expect(entry.rawId.length).toBeLessThanOrEqual(120)
    expect(entry.reason.length).toBeLessThanOrEqual(400)
    // The assembled result must pass strict outer-envelope validation.
    expect(() => DimensionalIntegrationResultSchema.parse(result)).not.toThrow()
  })

  it('never throws even when every item is invalid — returns empty + quarantine', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        { dimensionId: 'fake-1', severity: 1, confidence: 'low', clinicalSummary: 'a', supportingEvidenceIds: ['anam-1'] },
        { dimensionId: 'fake-2', severity: 1, confidence: 'low', clinicalSummary: 'b', supportingEvidenceIds: ['anam-1'] },
        { dimensionId: 'fake-3', severity: 1, confidence: 'low', clinicalSummary: 'c', supportingEvidenceIds: ['anam-1'] },
        null,
        'not even an object',
      ],
    })
    let outcome: ReturnType<typeof parseAndValidateDimensional> | null = null
    expect(() => {
      outcome = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    }).not.toThrow()
    expect(outcome!.result.activeDimensions).toHaveLength(0)
    expect(outcome!.result.quarantined.length).toBeGreaterThanOrEqual(3)
    // Strict envelope validation must still succeed.
    expect(() => DimensionalIntegrationResultSchema.parse(outcome!.result)).not.toThrow()
  })

  it('falls back to dimensionId when dimensionName is whitespace-only (schema requires min 1 char)', () => {
    const raw = JSON.stringify({
      activeDimensions: [
        {
          dimensionId: 'depressive-inhibition',
          dimensionName: '   ',
          severity: 2,
          confidence: 'low',
          clinicalSummary: 'Test',
          supportingEvidenceIds: ['anam-1'],
        },
      ],
    })
    const { result } = parseAndValidateDimensional(raw, evidence(), { rejectedIds: [] })
    expect(result.activeDimensions).toHaveLength(1)
    expect(result.activeDimensions[0].dimensionName).toBe('depressive-inhibition')
  })
})

describe('parseAndValidateMechanism', () => {
  it('returns empty active set when JSON parse fails', () => {
    const { result } = parseAndValidateMechanism('???', evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: [],
    })
    expect(result.activeMechanisms).toHaveLength(0)
    expect(result.warning).toBeTruthy()
  })

  it('salvages mechanism, quarantines unknown id, demotes without evidence', () => {
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: 'reward-processing-dysfunction',
          label: 'Reward Processing Dysfunction',
          confidence: 'moderate',
          linkedDimensions: ['depressive-inhibition'],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'Anhedonia consistent with mesolimbic dysfunction.',
          treatmentRelevance: 'Consider behavioral activation; reward sensitivity.',
        },
        {
          mechanismId: 'unknown-mech',
          label: 'X',
          confidence: 'high',
          clinicalImplication: 'x',
          treatmentRelevance: 'y',
          supportingEvidenceIds: ['anam-1'],
          linkedDimensions: ['depressive-inhibition'],
        },
        {
          mechanismId: 'circadian-sleep-wake-dysregulation',
          label: 'Circadian',
          confidence: 'low',
          clinicalImplication: 'Hypothesis only',
          treatmentRelevance: 'Sleep hygiene',
          supportingEvidenceIds: [],
          linkedDimensions: [],
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: ['depressive-inhibition'],
    })
    expect(result.activeMechanisms).toHaveLength(1)
    expect(result.activeMechanisms[0].mechanismId).toBe('reward-processing-dysfunction')
    expect(result.quarantined.some((q) => q.rawId === 'unknown-mech')).toBe(true)
    expect(result.exploratoryInsufficientEvidence.length).toBeGreaterThan(0)
  })

  it('refuses mechanisms whose id is in the rejected list', () => {
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: 'trauma-limbic-hyperreactivity',
          label: 'Trauma',
          confidence: 'high',
          linkedDimensions: ['trauma-stress-response'],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'Heightened reactivity',
          treatmentRelevance: 'TF-CBT, EMDR',
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: ['trauma-limbic-hyperreactivity'],
      acceptedDimensionIds: ['trauma-stress-response'],
    })
    expect(result.activeMechanisms).toHaveLength(0)
    expect(result.quarantined[0].reason).toContain('previously rejected')
  })

  it('drops linkedDimensions that are not in the acceptedDimensionIds set', () => {
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: 'reward-processing-dysfunction',
          label: 'Reward',
          confidence: 'moderate',
          linkedDimensions: ['depressive-inhibition', 'mania-activation'],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'Test',
          treatmentRelevance: 'Test',
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: ['depressive-inhibition'],
    })
    expect(result.activeMechanisms).toHaveLength(1)
    expect(result.activeMechanisms[0].linkedDimensions).toEqual(['depressive-inhibition'])
  })

  it('normalizes confidence "medium" → "moderate" on mechanism layer', () => {
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: 'reward-processing-dysfunction',
          label: 'Reward',
          confidence: 'medium',
          linkedDimensions: ['depressive-inhibition'],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'Test',
          treatmentRelevance: 'Test',
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: ['depressive-inhibition'],
    })
    expect(result.activeMechanisms).toHaveLength(1)
    expect(result.activeMechanisms[0].confidence).toBe('moderate')
  })

  it('quarantines absurdly long unknown mechanismId without exceeding rawId/reason caps', () => {
    const longBogusId = 'q'.repeat(800)
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: longBogusId,
          label: 'x',
          confidence: 'low',
          linkedDimensions: [],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'x',
          treatmentRelevance: 'y',
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: [],
    })
    expect(result.activeMechanisms).toHaveLength(0)
    const entry = result.quarantined[0]
    expect(entry.rawId.length).toBeLessThanOrEqual(120)
    expect(entry.reason.length).toBeLessThanOrEqual(400)
    expect(() => MechanismInferenceResultSchema.parse(result)).not.toThrow()
  })

  it('falls back to mechanismId when label is whitespace-only (schema requires min 1 char)', () => {
    const raw = JSON.stringify({
      activeMechanisms: [
        {
          mechanismId: 'reward-processing-dysfunction',
          label: '   ',
          confidence: 'moderate',
          linkedDimensions: ['depressive-inhibition'],
          supportingEvidenceIds: ['anam-1'],
          clinicalImplication: 'Test',
          treatmentRelevance: 'Test',
        },
      ],
    })
    const { result } = parseAndValidateMechanism(raw, evidence(), {
      rejectedIds: [],
      acceptedDimensionIds: ['depressive-inhibition'],
    })
    expect(result.activeMechanisms).toHaveLength(1)
    expect(result.activeMechanisms[0].label).toBe('reward-processing-dysfunction')
  })
})

describe('truncateForDiagnostics (root-cause regression)', () => {
  it('never exceeds the rawResponseSnippet max(4_000) schema cap', () => {
    // Previously: slice(0, 4_000) + '…' was 4_001 chars and failed the schema.
    const huge = 'a'.repeat(20_000)
    const snippet = truncateForDiagnostics(huge)
    expect(snippet.length).toBeLessThanOrEqual(4_000)
    expect(snippet.endsWith('…')).toBe(true)
  })

  it('returns the original text when within the cap', () => {
    expect(truncateForDiagnostics('')).toBe('')
    const small = 'short body'
    expect(truncateForDiagnostics(small)).toBe(small)
    const boundary = 'b'.repeat(4_000)
    expect(truncateForDiagnostics(boundary)).toBe(boundary)
  })
})

describe('outer-envelope response validation regressions', () => {
  it('rawResponseSnippet from a long mock/LLM body fits inside max(4_000)', () => {
    // Reproduces the original demo-case bug: when the LLM returns more than
    // 4 000 chars, the diagnostics snippet must NOT exceed the schema cap.
    const longBody = 'x'.repeat(10_000)
    // The truncator lives in run.ts; re-export it would be nice, but for the
    // test we inline its observable contract by calling it via parse outcome
    // through ClinicalIntelligenceRunResponseSchema with a manually-built
    // diagnostics object that simulates `truncateForDiagnostics(longBody)`.
    const snippet = `${longBody.slice(0, 4_000 - 1)}…`
    expect(snippet.length).toBeLessThanOrEqual(4_000)

    const response = {
      builtAt: '2026-06-20T10:00:00.000Z',
      language: 'de' as const,
      dimensional: {
        activeDimensions: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [],
      },
      mechanism: {
        activeMechanisms: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [],
      },
      evidenceItemCount: 0,
      diagnostics: {
        dimensional: {
          provider: 'mock',
          modelId: 'unknown',
          tier: 'thorough',
          mock: true,
          promptCharCount: 1234,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: 0,
          truncated: false,
          validation: { salvagedCount: 0, quarantinedCount: 0, issues: [] },
          rawResponseSnippet: snippet,
          error: null,
        },
        mechanism: null,
      },
    }
    expect(() => ClinicalIntelligenceRunResponseSchema.parse(response)).not.toThrow()
  })
})

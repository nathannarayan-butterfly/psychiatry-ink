import { describe, it, expect } from 'vitest'
import {
  clampCiSeverity,
  confidenceBarFillClass,
  maxLinkedDimensionSeverity,
  severityBarFillClass,
} from '../severityGraph'
import type { MechanismHypothesis } from '../../../types/clinicalIntelligence'

describe('severityBarFillClass', () => {
  it('maps severity 0–4 to sev-N CSS classes', () => {
    expect(severityBarFillClass(0)).toBe('ci-graph-row__bar-fill--sev-0')
    expect(severityBarFillClass(1)).toBe('ci-graph-row__bar-fill--sev-1')
    expect(severityBarFillClass(2)).toBe('ci-graph-row__bar-fill--sev-2')
    expect(severityBarFillClass(3)).toBe('ci-graph-row__bar-fill--sev-3')
    expect(severityBarFillClass(4)).toBe('ci-graph-row__bar-fill--sev-4')
  })

  it('clamps out-of-range values', () => {
    expect(severityBarFillClass(-1)).toBe('ci-graph-row__bar-fill--sev-0')
    expect(severityBarFillClass(9)).toBe('ci-graph-row__bar-fill--sev-4')
  })
})

describe('confidenceBarFillClass', () => {
  it('maps confidence levels to conf-* CSS classes', () => {
    expect(confidenceBarFillClass('low')).toBe('ci-graph-row__bar-fill--conf-low')
    expect(confidenceBarFillClass('moderate')).toBe('ci-graph-row__bar-fill--conf-moderate')
    expect(confidenceBarFillClass('high')).toBe('ci-graph-row__bar-fill--conf-high')
  })
})

describe('clampCiSeverity', () => {
  it('rounds and clamps to 0–4', () => {
    expect(clampCiSeverity(2.4)).toBe(2)
    expect(clampCiSeverity(2.6)).toBe(3)
    expect(clampCiSeverity(-5)).toBe(0)
  })
})

describe('maxLinkedDimensionSeverity', () => {
  it('returns max severity among linked dimensions', () => {
    const map = new Map([
      ['depressive-inhibition', 2],
      ['anxiety-threat-anticipation', 4],
    ] as const)
    const hypothesis: Pick<MechanismHypothesis, 'linkedDimensions'> = {
      linkedDimensions: ['depressive-inhibition', 'anxiety-threat-anticipation'],
    }
    expect(maxLinkedDimensionSeverity(hypothesis, map)).toBe(4)
  })

  it('returns 0 when no linked dimensions match', () => {
    const map = new Map([['depressive-inhibition', 3]] as const)
    expect(
      maxLinkedDimensionSeverity({ linkedDimensions: ['mania-activation'] }, map),
    ).toBe(0)
  })

  it('returns 0 for empty linked dimensions', () => {
    expect(maxLinkedDimensionSeverity({ linkedDimensions: [] }, new Map())).toBe(0)
  })
})

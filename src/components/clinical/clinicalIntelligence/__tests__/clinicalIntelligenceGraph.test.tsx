/**
 * Clinical Intelligence — graph + accordion behaviour.
 *
 * Covers:
 *  - DimensionalProfileGraph severity bar math (computeDimensionalBars).
 *  - MechanismHypothesesGraph confidence bar math (computeMechanismBars).
 *  - CiAccordion default state (collapsed unless `defaultOpen`).
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TranslationProvider } from '../../../../context/TranslationContext'
import { CiAccordion } from '../CiAccordion'
import { computeDimensionalBars } from '../DimensionalProfileGraph'
import { computeMechanismBars } from '../MechanismHypothesesGraph'
import { severityBarFillClass } from '../../../../utils/clinicalIntelligence/severityGraph'
import type {
  DimensionalFinding,
  MechanismHypothesis,
} from '../../../../types/clinicalIntelligence'

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

describe('computeDimensionalBars', () => {
  it('returns severity 0..1 fractions normalised to the 0–4 scale', () => {
    const bars = computeDimensionalBars([
      dim({ dimensionId: 'anxiety-threat-anticipation', severity: 4, confidence: 'high' }),
      dim({ dimensionId: 'depressive-inhibition', severity: 2, confidence: 'moderate' }),
      dim({ dimensionId: 'sleep-circadian-regulation', severity: 0, confidence: 'low' }),
    ])
    expect(bars.map((b) => b.fraction)).toEqual([1, 0.5, 0])
    expect(bars.map((b) => b.confidence)).toEqual(['high', 'moderate', 'low'])
    expect(bars.map((b) => b.severityClass)).toEqual([
      'ci-graph-row__bar-fill--sev-4',
      'ci-graph-row__bar-fill--sev-2',
      'ci-graph-row__bar-fill--sev-0',
    ])
  })

  it('maps each severity level to the semantic bar-fill class', () => {
    for (const severity of [0, 1, 2, 3, 4] as const) {
      const bars = computeDimensionalBars([
        dim({ dimensionId: 'mania-activation', severity }),
      ])
      expect(bars[0].severityClass).toBe(severityBarFillClass(severity))
    }
  })

  it('clamps fractions to [0,1]', () => {
    const bars = computeDimensionalBars([
      dim({ dimensionId: 'mania-activation', severity: 3 }),
    ])
    expect(bars[0].fraction).toBeGreaterThanOrEqual(0)
    expect(bars[0].fraction).toBeLessThanOrEqual(1)
    expect(bars[0].fraction).toBeCloseTo(0.75, 2)
  })

  it('orders rows by severity desc, confidence desc then catalog order', () => {
    const bars = computeDimensionalBars([
      dim({ dimensionId: 'depressive-inhibition', severity: 2, confidence: 'high' }),
      dim({ dimensionId: 'mania-activation', severity: 4, confidence: 'low' }),
      dim({ dimensionId: 'anxiety-threat-anticipation', severity: 4, confidence: 'moderate' }),
    ])
    expect(bars[0].dimensionId).toBe('anxiety-threat-anticipation')
    expect(bars[1].dimensionId).toBe('mania-activation')
    expect(bars[2].dimensionId).toBe('depressive-inhibition')
  })
})

describe('computeMechanismBars', () => {
  it('maps confidence to fixed fractions (low=1/3, moderate=2/3, high=1)', () => {
    const bars = computeMechanismBars([
      mech({ mechanismId: 'reward-processing-dysfunction', confidence: 'high' }),
      mech({ mechanismId: 'circadian-sleep-wake-dysregulation', confidence: 'moderate' }),
      mech({ mechanismId: 'habit-compulsion-loop-dysfunction', confidence: 'low' }),
    ])
    expect(bars.map((b) => b.confidence)).toEqual(['high', 'moderate', 'low'])
    expect(bars[0].fraction).toBeCloseTo(1, 5)
    expect(bars[1].fraction).toBeCloseTo(2 / 3, 5)
    expect(bars[2].fraction).toBeCloseTo(1 / 3, 5)
  })

  it('colours bars by confidence (traffic-light)', () => {
    const bars = computeMechanismBars([
      mech({ mechanismId: 'reward-processing-dysfunction', confidence: 'high' }),
      mech({ mechanismId: 'circadian-sleep-wake-dysregulation', confidence: 'moderate' }),
      mech({ mechanismId: 'habit-compulsion-loop-dysfunction', confidence: 'low' }),
    ])
    expect(bars.map((b) => b.confidenceClass)).toEqual([
      'ci-graph-row__bar-fill--conf-high',
      'ci-graph-row__bar-fill--conf-moderate',
      'ci-graph-row__bar-fill--conf-low',
    ])
  })
})

async function renderAccordion(defaultOpen: boolean) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const body = createElement('p', { 'data-testid': 'body' }, 'Body')
  const accordion = createElement(CiAccordion, {
    eyebrow: 'Test section',
    defaultOpen,
    children: body,
  })
  await act(async () => {
    root.render(
      createElement(TranslationProvider, {
        language: 'de',
        englishVariant: 'uk',
        children: accordion,
      }),
    )
  })
  return { container, root }
}

describe('CiAccordion', () => {
  it('is collapsed by default — body not in DOM until opened', async () => {
    const { container, root } = await renderAccordion(false)
    expect(container.querySelector('[data-testid="body"]')).toBeNull()
    const trigger = container.querySelector<HTMLButtonElement>('.ci-accordion__toggle')
    expect(trigger).not.toBeNull()
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')

    await act(async () => {
      trigger!.click()
    })
    expect(container.querySelector('[data-testid="body"]')).not.toBeNull()
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')

    root.unmount()
    document.body.removeChild(container)
  })

  it('opens by default when defaultOpen=true', async () => {
    const { container, root } = await renderAccordion(true)
    expect(container.querySelector('[data-testid="body"]')).not.toBeNull()
    root.unmount()
    document.body.removeChild(container)
  })
})

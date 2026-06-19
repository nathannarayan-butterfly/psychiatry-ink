import { describe, expect, it } from 'vitest'
import { candidateIsAutoAcceptable, candidateNeedsReview } from '../reviewHelpers'
import { makeCandidate } from '../candidateFactory'

describe('reviewHelpers', () => {
  it('flags low-confidence and clarification candidates for review', () => {
    const flagged = makeCandidate({
      module: 'document',
      confidence: 'low',
      sourceLocation: {},
      rawText: 'x',
      clarifications: [{ field: 'module', code: 'mapping_uncertain', message: '?' }],
      data: { title: 'X', text: 'x' },
    })
    expect(candidateNeedsReview(flagged, 'pending')).toBe(true)
    expect(candidateIsAutoAcceptable(flagged)).toBe(false)
  })

  it('auto-accepts high-confidence mapped candidates without clarifications', () => {
    const ok = makeCandidate({
      module: 'anamnese',
      confidence: 'high',
      sourceLocation: {},
      rawText: 'x',
      data: { title: 'Anamnese', text: 'x' },
    })
    expect(candidateNeedsReview(ok, 'pending')).toBe(false)
    expect(candidateIsAutoAcceptable(ok)).toBe(true)
  })
})

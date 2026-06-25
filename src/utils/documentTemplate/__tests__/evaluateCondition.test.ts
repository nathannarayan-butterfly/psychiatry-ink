import { describe, expect, it } from 'vitest'
import { evaluateCondition } from '../evaluateCondition'

describe('evaluateCondition', () => {
  it('returns true when no condition', () => {
    expect(evaluateCondition(undefined, {})).toBe(true)
  })

  it('evaluates checked', () => {
    expect(
      evaluateCondition(
        { id: 'c1', fieldId: 'a', operator: 'checked' },
        { a: true },
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { id: 'c1', fieldId: 'a', operator: 'checked' },
        { a: false },
      ),
    ).toBe(false)
  })

  it('evaluates equals for yes_no values', () => {
    expect(
      evaluateCondition(
        { id: 'c1', fieldId: 'q', operator: 'equals', value: 'yes' },
        { q: 'yes' },
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { id: 'c1', fieldId: 'q', operator: 'equals', value: 'no' },
        { q: 'yes' },
      ),
    ).toBe(false)
  })
})

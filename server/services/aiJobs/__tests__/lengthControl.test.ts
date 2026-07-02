import { describe, expect, it } from 'vitest'
import {
  countWords,
  LENGTH_MODE_TARGET_WORDS,
  resolveHardLimitWords,
  resolveTargetWords,
} from '../../../../shared/aiJobs'
import {
  compressionTask,
  exceedsHardLimit,
  lengthInstruction,
  resolveLengthBudget,
} from '../lengthControl'

describe('length control', () => {
  it('resolves word targets for the fixed modes', () => {
    expect(resolveTargetWords({ mode: 'kurz' })).toBe(LENGTH_MODE_TARGET_WORDS.kurz)
    expect(resolveTargetWords({ mode: 'mittel' })).toBe(LENGTH_MODE_TARGET_WORDS.mittel)
    expect(resolveTargetWords({ mode: 'gruendlich' })).toBe(LENGTH_MODE_TARGET_WORDS.gruendlich)
  })

  it('resolves and clamps custom targets', () => {
    expect(resolveTargetWords({ mode: 'custom', customTargetWords: 1500 })).toBe(1500)
    expect(resolveTargetWords({ mode: 'custom', customTargetWords: 10 })).toBe(50)
    expect(resolveTargetWords({ mode: 'custom', customTargetWords: 99999 })).toBe(5000)
    expect(resolveTargetWords({ mode: 'custom' })).toBeNull()
    expect(resolveTargetWords(undefined)).toBeNull()
  })

  it('hard limit gives ~13% headroom (1500 → ≈1700 from the product spec)', () => {
    const hard = resolveHardLimitWords(1500)
    expect(hard).toBe(1695)
    expect(hard).toBeGreaterThan(1500)
    expect(hard).toBeLessThanOrEqual(1700)
  })

  it('counts words on whitespace boundaries', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('  \n ')).toBe(0)
    expect(countWords('Patient stabil, Medikation unverändert.')).toBe(4)
    expect(countWords('a\nb\tc  d')).toBe(4)
  })

  it('builds a budget with a token cap above the word limit', () => {
    const budget = resolveLengthBudget({ mode: 'custom', customTargetWords: 1500 })
    expect(budget).not.toBeNull()
    expect(budget!.targetWords).toBe(1500)
    expect(budget!.hardLimitWords).toBe(1695)
    // Token cap must leave headroom above the hard word limit.
    expect(budget!.maxTokens).toBeGreaterThan(budget!.hardLimitWords)
    expect(resolveLengthBudget(undefined)).toBeNull()
  })

  it('detects hard-limit violations', () => {
    const budget = resolveLengthBudget({ mode: 'custom', customTargetWords: 50 })!
    const within = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ')
    const over = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ')
    expect(exceedsHardLimit(within, budget)).toBe(false)
    expect(exceedsHardLimit(over, budget)).toBe(true)
  })

  it('states target and hard limit in prompt fragments', () => {
    const budget = resolveLengthBudget({ mode: 'custom', customTargetWords: 1500 })!
    expect(lengthInstruction(budget)).toContain('1500')
    expect(lengthInstruction(budget)).toContain('1695')
    expect(compressionTask(budget)).toContain('1500')
    expect(compressionTask(budget)).toContain('1695')
  })
})

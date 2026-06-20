/**
 * Mode multiplier + env override tests.
 *
 * Mode multipliers are economic=1×, standard=2×, gruendlich=4× (configurable
 * up to 5× via GRUENDLICH_CREDIT_MULTIPLIER). These tests pin both the
 * static MODE_MULTIPLIERS snapshot and the dynamic getModeMultiplier reader.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MODE_MULTIPLIERS,
  getModeMultiplier,
  gruendlichMultiplier,
  marginCriticalThreshold,
  marginWarnThreshold,
  usdToGbpRate,
} from '../aiPricingConfig'
import { estimateCredits } from '../creditCalculator'

const ENV_KEYS = [
  'GRUENDLICH_CREDIT_MULTIPLIER',
  'USD_TO_GBP_RATE',
  'MARGIN_WARN_THRESHOLD',
  'MARGIN_CRITICAL_THRESHOLD',
] as const

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

describe('MODE_MULTIPLIERS (static snapshot)', () => {
  it('economic = 1, standard = 2, gruendlich = 4', () => {
    expect(MODE_MULTIPLIERS).toEqual({ economic: 1, standard: 2, gruendlich: 4 })
  })
})

describe('getModeMultiplier (dynamic)', () => {
  it('economic and standard are not influenced by env', () => {
    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '5'
    expect(getModeMultiplier('economic')).toBe(1)
    expect(getModeMultiplier('standard')).toBe(2)
  })

  it('gruendlich defaults to 4', () => {
    expect(getModeMultiplier('gruendlich')).toBe(4)
  })

  it('gruendlich can be raised to 5 via env', () => {
    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '5'
    expect(getModeMultiplier('gruendlich')).toBe(5)
  })

  it('gruendlich values are clamped to [4, 5]', () => {
    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '99'
    expect(getModeMultiplier('gruendlich')).toBe(5)

    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '1'
    expect(getModeMultiplier('gruendlich')).toBe(4)

    process.env.GRUENDLICH_CREDIT_MULTIPLIER = 'not-a-number'
    expect(getModeMultiplier('gruendlich')).toBe(4)
  })

  it('gruendlichMultiplier exposes the raw reader', () => {
    expect(gruendlichMultiplier()).toBe(4)
    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '4.5'
    expect(gruendlichMultiplier()).toBe(4.5)
  })
})

describe('mode multiplier x estimateCredits', () => {
  it('a single feature observes 1×, 2×, 4× at DeepSeek baseline', () => {
    const tokens = 1000 // within inline_text_edit base
    const econ = estimateCredits('inline_text_edit', 'economic', tokens, {
      modelId: 'deepseek-v4-flash',
    })
    const std = estimateCredits('inline_text_edit', 'standard', tokens, {
      modelId: 'deepseek-v4-flash',
    })
    const gru = estimateCredits('inline_text_edit', 'gruendlich', tokens, {
      modelId: 'deepseek-v4-flash',
    })
    expect(std).toBe(econ * 2)
    expect(gru).toBe(econ * 4)
  })

  it('5× gruendlich override flows through estimateCredits', () => {
    process.env.GRUENDLICH_CREDIT_MULTIPLIER = '5'
    const tokens = 1000
    const econ = estimateCredits('inline_text_edit', 'economic', tokens, {
      modelId: 'deepseek-v4-flash',
    })
    const gru = estimateCredits('inline_text_edit', 'gruendlich', tokens, {
      modelId: 'deepseek-v4-flash',
    })
    expect(gru).toBe(econ * 5)
  })
})

describe('USD→GBP rate + margin thresholds', () => {
  it('default USD→GBP rate is 0.79', () => {
    expect(usdToGbpRate()).toBe(0.79)
  })

  it('USD→GBP rate is configurable via env', () => {
    process.env.USD_TO_GBP_RATE = '0.81'
    expect(usdToGbpRate()).toBe(0.81)
  })

  it('default thresholds are 0.40 warn / 0.50 critical', () => {
    expect(marginWarnThreshold()).toBe(0.4)
    expect(marginCriticalThreshold()).toBe(0.5)
  })

  it('thresholds accept env overrides in (0, 1)', () => {
    process.env.MARGIN_WARN_THRESHOLD = '0.35'
    process.env.MARGIN_CRITICAL_THRESHOLD = '0.45'
    expect(marginWarnThreshold()).toBe(0.35)
    expect(marginCriticalThreshold()).toBe(0.45)
  })

  it('thresholds reject out-of-range env values', () => {
    process.env.MARGIN_WARN_THRESHOLD = '2.5'
    process.env.MARGIN_CRITICAL_THRESHOLD = '-1'
    expect(marginWarnThreshold()).toBe(0.4) // falls back to default
    expect(marginCriticalThreshold()).toBe(0.5)
  })
})

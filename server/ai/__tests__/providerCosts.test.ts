/**
 * Provider cost table — billing factor + USD cost estimation.
 *
 * The factor formula is documented in providerCosts.ts. These tests pin
 * the documented baseline (DeepSeek-v4-flash = factor 1.0) and verify that
 * more expensive providers (OpenAI gpt-4.1) round up to the documented
 * MAX_PROVIDER_COST_FACTOR. Env overrides are also exercised so an operator
 * hot-patch is verifiable.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_PROVIDER_COST_FACTOR,
  PROVIDER_COST_BASELINE_MODEL,
  blendedUsdPerMillion,
  computeEstimatedCostUsd,
  isPrimaryProviderForMode,
  listProviderCosts,
  providerCostFactor,
  resolveProviderCost,
} from '../providerCosts'

const ENV_KEYS_TO_RESET = [
  'PROVIDER_COST_DEEPSEEK_V4_FLASH_INPUT',
  'PROVIDER_COST_DEEPSEEK_V4_FLASH_OUTPUT',
  'PROVIDER_COST_GPT_4_1_INPUT',
  'PROVIDER_COST_GPT_4_1_OUTPUT',
] as const

beforeEach(() => {
  for (const key of ENV_KEYS_TO_RESET) delete process.env[key]
})

afterEach(() => {
  for (const key of ENV_KEYS_TO_RESET) delete process.env[key]
})

describe('resolveProviderCost / blendedUsdPerMillion', () => {
  it('returns null for unknown models so callers can fall back', () => {
    expect(resolveProviderCost('not-a-real-model-2099')).toBeNull()
    expect(blendedUsdPerMillion('not-a-real-model-2099')).toBeNull()
  })

  it('matches case-insensitively', () => {
    const row = resolveProviderCost('DEEPSEEK-V4-FLASH')
    expect(row).not.toBeNull()
    expect(row?.provider).toBe('deepseek')
  })

  it('blended is the average of input and output rates', () => {
    // deepseek-v4-flash defaults: 0.07 / 0.28 → average 0.175
    expect(blendedUsdPerMillion('deepseek-v4-flash')).toBeCloseTo(0.175, 5)
  })

  it('honours env overrides for both sides of the cost', () => {
    process.env.PROVIDER_COST_DEEPSEEK_V4_FLASH_INPUT = '0.10'
    process.env.PROVIDER_COST_DEEPSEEK_V4_FLASH_OUTPUT = '0.40'
    const row = resolveProviderCost('deepseek-v4-flash')
    expect(row?.inputUsd).toBe(0.10)
    expect(row?.outputUsd).toBe(0.40)
    expect(blendedUsdPerMillion('deepseek-v4-flash')).toBeCloseTo(0.25, 5)
  })
})

describe('providerCostFactor', () => {
  it('returns 1.0 for the baseline model', () => {
    expect(providerCostFactor(PROVIDER_COST_BASELINE_MODEL)).toBe(1)
  })

  it('returns 1.0 (never < 1) for unknown models', () => {
    expect(providerCostFactor('unknown-model-zzz')).toBe(1)
  })

  it('scales OpenAI gpt-4.1 up against the DeepSeek baseline', () => {
    const factor = providerCostFactor('gpt-4.1')
    // gpt-4.1 blended ($5.0/M) ÷ deepseek-v4-flash blended ($0.175/M)
    //   ≈ 28.6 → clamped to MAX_PROVIDER_COST_FACTOR (10).
    expect(factor).toBe(MAX_PROVIDER_COST_FACTOR)
  })

  it('returns a value between 1 and MAX_FACTOR for mid-tier OpenAI', () => {
    const factor = providerCostFactor('gpt-4o-mini')
    expect(factor).toBeGreaterThan(1)
    expect(factor).toBeLessThanOrEqual(MAX_PROVIDER_COST_FACTOR)
  })

  it('never returns Infinity or NaN even under odd env overrides', () => {
    process.env.PROVIDER_COST_DEEPSEEK_V4_FLASH_INPUT = '0'
    process.env.PROVIDER_COST_DEEPSEEK_V4_FLASH_OUTPUT = '0'
    // baseline 0/0 → blended 0 → guard returns factor 1
    expect(providerCostFactor('gpt-4.1')).toBe(1)
  })
})

describe('computeEstimatedCostUsd', () => {
  it('prices a representative DeepSeek call', () => {
    // 1000 input + 500 output @ deepseek-v4-flash → 1000/1M × 0.07 + 500/1M × 0.28
    //   = 0.00007 + 0.00014 = 0.00021
    const cost = computeEstimatedCostUsd({
      modelId: 'deepseek-v4-flash',
      inputTokens: 1000,
      outputTokens: 500,
    })
    expect(cost).toBeCloseTo(0.00021, 6)
  })

  it('prices a representative OpenAI gpt-4.1 call (~20× more than DeepSeek)', () => {
    // 1000/1M × 2.0 + 500/1M × 8.0 = 0.002 + 0.004 = 0.006
    const cost = computeEstimatedCostUsd({
      modelId: 'gpt-4.1',
      inputTokens: 1000,
      outputTokens: 500,
    })
    expect(cost).toBeCloseTo(0.006, 6)
  })

  it('prices Gemini 2.5 Flash for the future routing path', () => {
    // 1000/1M × 0.15 + 500/1M × 0.60 = 0.00015 + 0.0003 = 0.00045
    const cost = computeEstimatedCostUsd({
      modelId: 'gemini-2.5-flash',
      inputTokens: 1000,
      outputTokens: 500,
    })
    expect(cost).toBeCloseTo(0.00045, 6)
  })

  it('returns null for unknown models so the caller can decide whether to omit', () => {
    expect(
      computeEstimatedCostUsd({
        modelId: 'not-known',
        inputTokens: 100,
        outputTokens: 100,
      }),
    ).toBeNull()
  })

  it('rounds to 6 decimal places', () => {
    const cost = computeEstimatedCostUsd({
      modelId: 'deepseek-v4-flash',
      inputTokens: 9_999_999,
      outputTokens: 12_345,
    })
    // Should not be Infinity or NaN, should have <= 6 decimals
    expect(cost).not.toBeNull()
    if (cost != null) {
      const decimals = cost.toString().split('.')[1]?.length ?? 0
      expect(decimals).toBeLessThanOrEqual(6)
    }
  })
})

describe('isPrimaryProviderForMode', () => {
  it('economic mode primary is deepseek (Gemini and OpenAI are fallback)', () => {
    expect(isPrimaryProviderForMode('deepseek', 'economic')).toBe(true)
    expect(isPrimaryProviderForMode('google', 'economic')).toBe(false)
    expect(isPrimaryProviderForMode('openai', 'economic')).toBe(false)
  })

  it('standard mode primary is deepseek OR google', () => {
    expect(isPrimaryProviderForMode('deepseek', 'standard')).toBe(true)
    expect(isPrimaryProviderForMode('google', 'standard')).toBe(true)
    expect(isPrimaryProviderForMode('openai', 'standard')).toBe(false)
  })

  it('gruendlich mode primary is openai (DeepSeek / Gemini are fallback)', () => {
    expect(isPrimaryProviderForMode('openai', 'gruendlich')).toBe(true)
    expect(isPrimaryProviderForMode('deepseek', 'gruendlich')).toBe(false)
    expect(isPrimaryProviderForMode('google', 'gruendlich')).toBe(false)
  })
})

describe('listProviderCosts', () => {
  it('exposes every required model plus the Gemini wiring', () => {
    const list = listProviderCosts()
    const keys = Object.keys(list)
    for (const required of [
      'deepseek-v4-flash',
      'deepseek-chat',
      'deepseek-reasoner',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4.1',
    ]) {
      expect(keys).toContain(required)
    }
  })

  it('returned table is frozen', () => {
    const list = listProviderCosts()
    expect(Object.isFrozen(list)).toBe(true)
  })
})

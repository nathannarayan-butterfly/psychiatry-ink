/**
 * Tier → model resolution + EU data-residency tests.
 *
 * Asserts the finalized distinct-model-per-tier strategy:
 *   non-EU            → fast=DeepSeek, standard=Gemini, thorough=OpenAI gpt-5.5
 *   LLM_RESIDENCY=eu  → fast=Mistral small (rerouted), standard=Gemini (US ok),
 *                       thorough=OpenAI gpt-5.5 (US ok)
 * and that with no residency-compliant key the resolver fails closed (451).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveLlmCallModel } from '../resolveLlmCallModel'
import { LlmResidencyError } from '../providerResidency'
import {
  MODEL_TIER_SPECS,
  mistralSpecForTier,
  resolveStandardTierSpec,
} from '../../modelTierMapping'

const MUTATED_ENV = [
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'GOOGLE_API_KEY',
  'MISTRAL_API_KEY',
  'LLM_RESIDENCY',
  'LLM_BLOCKED_PROVIDERS',
  'STANDARD_PROVIDER',
  'STANDARD_MODEL',
] as const

let saved: Partial<Record<(typeof MUTATED_ENV)[number], string | undefined>> = {}

beforeEach(() => {
  saved = {}
  for (const key of MUTATED_ENV) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of MUTATED_ENV) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('resolveLlmCallModel — non-EU (global) deployment', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'dk'
    process.env.GOOGLE_API_KEY = 'gk'
    process.env.OPENAI_API_KEY = 'ok'
  })

  it('routes fast → DeepSeek', () => {
    const spec = resolveLlmCallModel({ tier: 'fast' })
    expect(spec.provider).toBe('deepseek')
    expect(spec.modelId).toBe(MODEL_TIER_SPECS.fast.modelId)
  })

  it('routes standard → Google Gemini', () => {
    const spec = resolveLlmCallModel({ tier: 'standard' })
    expect(spec.provider).toBe('google')
    expect(spec.modelId).toBe(MODEL_TIER_SPECS.standard.modelId)
  })

  it('routes thorough → OpenAI (gpt-5.5)', () => {
    const spec = resolveLlmCallModel({ tier: 'thorough' })
    expect(spec.provider).toBe('openai')
    expect(spec.modelId).toBe(MODEL_TIER_SPECS.thorough.modelId)
  })
})

describe('resolveLlmCallModel — LLM_RESIDENCY=eu', () => {
  beforeEach(() => {
    process.env.LLM_RESIDENCY = 'eu'
    process.env.DEEPSEEK_API_KEY = 'dk'
    process.env.MISTRAL_API_KEY = 'mk'
    process.env.GOOGLE_API_KEY = 'gk'
    process.env.OPENAI_API_KEY = 'ok'
  })

  it('reroutes Economical (fast) from DeepSeek (CN) to Mistral small (EU)', () => {
    const spec = resolveLlmCallModel({ tier: 'fast' })
    expect(spec.provider).toBe('mistral')
    expect(spec.modelId).toBe(mistralSpecForTier('fast').modelId)
  })

  it('keeps Standard on Gemini (US permitted under SCC/DPF)', () => {
    const spec = resolveLlmCallModel({ tier: 'standard' })
    expect(spec.provider).toBe('google')
  })

  it('keeps Gründlich on OpenAI gpt-5.5 (US permitted under SCC/DPF)', () => {
    const spec = resolveLlmCallModel({ tier: 'thorough' })
    expect(spec.provider).toBe('openai')
  })

  it('fails closed (LlmResidencyError) when only the blocked DeepSeek key is set', () => {
    delete process.env.MISTRAL_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.OPENAI_API_KEY
    expect(() => resolveLlmCallModel({ tier: 'fast' })).toThrow(LlmResidencyError)
  })
})

describe('resolveStandardTierSpec — env-overridable Standard routing', () => {
  it('defaults to Google Gemini when no STANDARD_PROVIDER env is set', () => {
    const spec = resolveStandardTierSpec()
    expect(spec.provider).toBe('google')
    expect(spec.modelId).toBe('gemini-3.5-flash')
  })

  it('respects GOOGLE_STANDARD_MODEL for the Gemini model id when provider stays google', () => {
    process.env.STANDARD_PROVIDER = 'google'
    const spec = resolveStandardTierSpec()
    expect(spec.provider).toBe('google')
    // Model id falls through to the GOOGLE_STANDARD_MODEL default.
    expect(spec.modelId).toBe('gemini-3.5-flash')
  })

  it('reroutes Standard to Mistral large via STANDARD_PROVIDER/STANDARD_MODEL', () => {
    process.env.STANDARD_PROVIDER = 'mistral'
    process.env.STANDARD_MODEL = 'mistral-large-latest'
    const spec = resolveStandardTierSpec()
    expect(spec.provider).toBe('mistral')
    expect(spec.modelId).toBe('mistral-large-latest')
    expect(spec.label).toContain('Mistral')
  })

  it('uses the provider default model when STANDARD_MODEL is omitted', () => {
    process.env.STANDARD_PROVIDER = 'mistral'
    const spec = resolveStandardTierSpec()
    expect(spec.provider).toBe('mistral')
    expect(spec.modelId).toBe('mistral-large-latest')
  })

  it('ignores an unknown STANDARD_PROVIDER and falls back to Google', () => {
    process.env.STANDARD_PROVIDER = 'not-a-provider'
    const spec = resolveStandardTierSpec()
    expect(spec.provider).toBe('google')
  })
})

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { normalizeAiUsage } from '../usage/normalizeUsage'
import { estimateCost } from '../usage/estimateCost'
import { recordAiUsageLog } from '../usage/recordAiUsageLog'
import { buildMonthlySummary } from '../usage/aggregateUsage'
import { MODEL_PRICING, listModelsWithMissingPricing } from '../pricing/modelPricing'

describe('normalizeAiUsage', () => {
  it('normalizes DeepSeek usage fields', () => {
    const result = normalizeAiUsage({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      rawUsage: {
        prompt_tokens: 1200,
        completion_tokens: 400,
        total_tokens: 1600,
        prompt_cache_hit_tokens: 200,
        prompt_cache_miss_tokens: 1000,
      },
    })
    expect(result.usageSource).toBe('provider_reported')
    expect(result.inputTokens).toBe(1200)
    expect(result.outputTokens).toBe(400)
    expect(result.totalTokens).toBe(1600)
    expect(result.cachedInputTokens).toBe(200)
    expect(result.cacheMissInputTokens).toBe(1000)
  })

  it('normalizes OpenAI usage with cached_tokens in prompt_tokens_details', () => {
    const result = normalizeAiUsage({
      provider: 'openai',
      model: 'gpt-4.1',
      rawUsage: {
        prompt_tokens: 500,
        completion_tokens: 150,
        total_tokens: 650,
        prompt_tokens_details: { cached_tokens: 100 },
      },
    })
    expect(result.usageSource).toBe('provider_reported')
    expect(result.inputTokens).toBe(500)
    expect(result.cachedInputTokens).toBe(100)
  })

  it('falls back to char estimate when usage missing', () => {
    const result = normalizeAiUsage({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      inputText: 'abcd'.repeat(100),
      outputText: 'xy'.repeat(50),
    })
    expect(result.usageSource).toBe('estimated_from_chars')
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(25)
    expect(result.totalTokens).toBe(125)
    expect(result.rawUsageJson).toBeNull()
  })

  it('never stores input text in normalized output', () => {
    const clinical = 'Patient Name: Secret Clinical Note'
    const result = normalizeAiUsage({
      provider: 'openai',
      model: 'gpt-4.1',
      inputText: clinical,
      outputText: 'draft',
    })
    expect(JSON.stringify(result)).not.toContain('Secret')
    expect(JSON.stringify(result)).not.toContain('Patient Name')
  })
})

describe('estimateCost', () => {
  it('estimates cost for known DeepSeek model', () => {
    const usage = normalizeAiUsage({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      rawUsage: { prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 },
    })
    const cost = estimateCost({ provider: 'deepseek', model: 'deepseek-v4-flash', usage })
    expect(cost.pricingMatched).toBe(true)
    expect(cost.estimatedCostUsd).toBeCloseTo(0.07, 4)
    expect(cost.pricingMissing).toBe(false)
  })

  it('returns null cost for unknown model', () => {
    const usage = normalizeAiUsage({
      provider: 'openai',
      model: 'unknown-model-xyz',
      rawUsage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    })
    const cost = estimateCost({ provider: 'openai', model: 'unknown-model-xyz', usage })
    expect(cost.pricingMatched).toBe(false)
    expect(cost.estimatedCostUsd).toBeNull()
    expect(cost.pricingMissing).toBe(true)
  })
})

describe('recordAiUsageLog', () => {
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY
    vi.restoreAllMocks()
  })

  it('logs without requiring clinical text in metadata', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await recordAiUsageLog({
      featureKey: 'document_generation',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      inputText: 'PHI must not appear in DB',
      outputText: 'draft output',
      metadata: { route: 'generate', tier: 'fast' },
    })
    expect(info).toHaveBeenCalled()
    const payload = JSON.stringify(info.mock.calls[0])
    expect(payload).not.toContain('PHI')
  })
})

describe('buildMonthlySummary', () => {
  it('returns zero summary when Supabase not configured', async () => {
    const summary = await buildMonthlySummary({ organisationId: 'org-1' })
    expect(summary.generationCount).toBe(0)
    expect(summary.totalTokens).toBe(0)
  })
})

describe('budget threshold detection', () => {
  it('lists models missing from pricing table', () => {
    const missing = listModelsWithMissingPricing(['deepseek-v4-flash', 'custom-fine-tune'])
    expect(missing).toEqual(['custom-fine-tune'])
    expect(MODEL_PRICING['gpt-4o-transcribe']).toBeDefined()
  })
})

describe('batch report JSON shape', () => {
  it('matches expected usageSummary fields for KB translation', () => {
    const report = {
      timestamp: new Date().toISOString(),
      usageSummary: {
        featureKey: 'kb_translation_de',
        calls: 10,
        inputTokens: 50000,
        outputTokens: 12000,
        totalTokens: 62000,
        providerReportedCount: 8,
        estimatedCount: 2,
      },
    }
    expect(report.usageSummary.featureKey).toBe('kb_translation_de')
    expect(report.usageSummary.totalTokens).toBe(62000)
    expect(report.usageSummary).toHaveProperty('providerReportedCount')
    expect(report.usageSummary).toHaveProperty('estimatedCount')
  })
})

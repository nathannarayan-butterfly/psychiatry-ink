/**
 * Provider routing — end-to-end fallback marker through runAiFeature.
 *
 * Spec:
 *   economic   → DeepSeek primary, anything else = fallback
 *   standard   → DeepSeek or Gemini primary, OpenAI = fallback
 *   gruendlich → OpenAI primary, DeepSeek/Gemini = fallback
 *
 * The fallback flag is asserted by inspecting the AiUsageLog rows written
 * by runAiFeature (the integration boundary we care about).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../db', () => ({
  prisma: {
    aiCreditAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    aiCreditLedger: { create: vi.fn(), findFirst: vi.fn() },
    aiUsageLog: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../services/llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

import { prisma } from '../../db'
import { callLlm } from '../../services/llmProvider'
import { runAiFeature } from '../runAiFeature'
import type { LlmCallResult } from '../types'

const mockedCallLlm = vi.mocked(callLlm)
const mockedPrisma = vi.mocked(prisma, true)

function llmResult(overrides: Partial<LlmCallResult>): LlmCallResult {
  return {
    text: 'ok',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheMissInputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      audioMinutes: null,
      usageSource: 'provider_reported',
      rawUsageJson: null,
    },
    requestId: null,
    latencyMs: 10,
    truncated: false,
    ...overrides,
  }
}

function wireAccount() {
  const account = {
    id: 'acc-1',
    userId: 'user-1',
    organisationId: null,
    monthlyCredits: 500,
    purchasedCredits: 0,
    monthlyResetAt: new Date(Date.now() + 30 * 86_400 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockedPrisma.aiCreditAccount.findUnique.mockResolvedValue(account)
  mockedPrisma.aiCreditAccount.create.mockResolvedValue(account)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
    return fn({
      aiCreditAccount: {
        findUnique: mockedPrisma.aiCreditAccount.findUnique,
        update: mockedPrisma.aiCreditAccount.update,
        updateMany: mockedPrisma.aiCreditAccount.updateMany,
      },
      aiCreditLedger: {
        create: mockedPrisma.aiCreditLedger.create,
        findFirst: mockedPrisma.aiCreditLedger.findFirst,
      },
    })
  })
  mockedPrisma.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 } as never)
  mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)
  mockedPrisma.aiUsageLog.create.mockResolvedValue({ id: 'log-1' } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  wireAccount()
})

describe('runAiFeature — fallback flag in AiUsageLog', () => {
  it('economic + deepseek → fallback=false (primary path)', async () => {
    mockedCallLlm.mockResolvedValue(llmResult({ provider: 'deepseek', model: 'deepseek-v4-flash' }))
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'economic',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.fallback).toBe(false)
  })

  it('economic + openai → fallback=true', async () => {
    mockedCallLlm.mockResolvedValue(llmResult({ provider: 'openai', model: 'gpt-4o-mini' }))
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'economic',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.fallback).toBe(true)
  })

  it('standard + google (Gemini) → fallback=false', async () => {
    mockedCallLlm.mockResolvedValue(llmResult({ provider: 'google', model: 'gemini-2.5-flash' }))
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'standard',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.fallback).toBe(false)
  })

  it('gruendlich + openai → fallback=false (primary path)', async () => {
    mockedCallLlm.mockResolvedValue(llmResult({ provider: 'openai', model: 'gpt-4.1' }))
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'gruendlich',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.fallback).toBe(false)
  })

  it('gruendlich + deepseek (fallback path) → fallback=true and credits factor=1 (cheaper bill)', async () => {
    mockedCallLlm.mockResolvedValue(
      llmResult({
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        usage: {
          inputTokens: 500,
          cachedInputTokens: 0,
          cacheMissInputTokens: 500,
          outputTokens: 500,
          totalTokens: 1000,
          audioMinutes: null,
          usageSource: 'provider_reported',
          rawUsageJson: null,
        },
      }),
    )
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'gruendlich',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.fallback).toBe(true)
    // Mode multiplier 4× × factor 1.0 = 4 credits for inline_text_edit @ 1000 tokens.
    expect(logCall.data.creditsCharged).toBe(4)
  })
})

describe('runAiFeature — estimatedCostUsd persisted in AiUsageLog', () => {
  it('records real USD cost from the provider cost table', async () => {
    mockedCallLlm.mockResolvedValue(
      llmResult({
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        usage: {
          inputTokens: 1_000_000,
          cachedInputTokens: 0,
          cacheMissInputTokens: 1_000_000,
          outputTokens: 1_000_000,
          totalTokens: 2_000_000,
          audioMinutes: null,
          usageSource: 'provider_reported',
          rawUsageJson: null,
        },
      }),
    )
    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'economic',
      systemPrompt: 's',
      userPrompt: 'u',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    // 1M input × $0.07/M + 1M output × $0.28/M = 0.07 + 0.28 = $0.35
    // Stored as string with 6 decimals.
    expect(logCall.data.estimatedCostUsd).toBe('0.350000')
  })

  it('records 0 cost on a failed call (no usable output)', async () => {
    mockedCallLlm.mockRejectedValue(new Error('Provider 503'))
    await expect(
      runAiFeature({
        featureKey: 'inline_text_edit',
        mode: 'gruendlich',
        systemPrompt: 's',
        userPrompt: 'u',
        usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
      }),
    ).rejects.toThrow('Provider 503')
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.success).toBe(false)
    expect(logCall.data.estimatedCostUsd).toBe('0.000000')
    expect(logCall.data.creditsCharged).toBe(0)
  })
})

/**
 * P1-C — labMedicationCorrelationAi credit-flow integration.
 *
 * Verifies that both legs of this service's DeepSeek → OpenAI second-opinion
 * chain are now routed through `runAiFeature`, which means each call:
 *   1. checks the user's credit balance (AiCreditAccount.findUnique),
 *   2. transactionally deducts credits on success (prisma.$transaction →
 *      AiCreditAccount.updateMany + AiCreditLedger.create),
 *   3. writes an AiUsageLog row carrying the correct feature key.
 *
 * Feature key routing under test:
 *  - DeepSeek primary batch → `lab_medication_correlation`
 *  - OpenAI second opinion   → `lab_medication_correlation_check`
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  prisma: {
    aiCreditAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    aiCreditLedger: {
      create: vi.fn(),
    },
    aiUsageLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('./llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

import { prisma } from '../db'
import { callLlm } from './llmProvider'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import {
  assessLabCorrelationsBatchWithAi,
  assessLabCorrelationWithAi,
} from './labMedicationCorrelationAi'
import type {
  LabBefundSnapshotInput,
  LabCorrelationMedicationInput,
  LabObservationInput,
} from '../../src/types/labMedicationCorrelation'
import type { LlmCallResult } from '../ai/types'

const mockedCallLlm = vi.mocked(callLlm)
const mockedPrisma = vi.mocked(prisma, true)

const med: LabCorrelationMedicationInput = {
  id: 'med-1',
  substance: 'Quetiapin',
  status: 'active',
  doseLineGerman: '100 mg abends',
}

const lab: LabObservationInput = {
  parameterName: 'ALT',
  normalizedParameter: 'alt',
  value: '85',
  unit: 'U/L',
  abnormality: 'high',
  labDate: '2026-05-01',
}

const snapshot: LabBefundSnapshotInput = {
  befundId: 'snap-1',
  labDate: '2026-05-01',
  source: 'labor_befund',
  parameters: [
    {
      parameterName: 'ALT',
      normalizedParameter: 'alt',
      value: '85',
      unit: 'U/L',
      abnormality: 'high',
    },
  ],
}

function batchPayloadJson(): string {
  return JSON.stringify({
    correlations: [
      {
        substanceName: 'Quetiapin',
        labParameter: 'alt',
        correlationStrength: 'possible',
        zusammenhang: 'Mögliche hepatische Belastung unter Quetiapin.',
        recommendation: 'Verlaufskontrolle Leberwerte in 2 Wochen.',
      },
    ],
  })
}

function singlePayloadJson(): string {
  return JSON.stringify({
    correlationStrength: 'possible',
    zusammenhang: 'Mögliche hepatische Belastung unter Quetiapin.',
    recommendation: 'Verlaufskontrolle Leberwerte in 2 Wochen.',
  })
}

function makeLlmResult(text: string, overrides: Partial<LlmCallResult> = {}): LlmCallResult {
  return {
    text,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    usage: {
      inputTokens: 800,
      cachedInputTokens: 0,
      cacheMissInputTokens: 800,
      outputTokens: 200,
      totalTokens: 1000,
      audioMinutes: null,
      usageSource: 'provider_reported',
      rawUsageJson: null,
    },
    requestId: 'req-1',
    latencyMs: 120,
    truncated: false,
    ...overrides,
  }
}

function mockCreditAccount(overrides: { monthlyCredits?: number; purchasedCredits?: number } = {}) {
  const account = {
    id: 'acc-1',
    userId: 'user-1',
    organisationId: null,
    monthlyCredits: overrides.monthlyCredits ?? 500,
    purchasedCredits: overrides.purchasedCredits ?? 0,
    monthlyResetAt: new Date(Date.now() + 30 * 86400 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockedPrisma.aiCreditAccount.findUnique.mockResolvedValue(account)
  mockedPrisma.aiCreditAccount.create.mockResolvedValue(account)
  return account
}

function mockTransactionSucceeds() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
    const txMock = {
      aiCreditAccount: {
        findUnique: mockedPrisma.aiCreditAccount.findUnique,
        update: mockedPrisma.aiCreditAccount.update,
        updateMany: mockedPrisma.aiCreditAccount.updateMany,
      },
      aiCreditLedger: { create: mockedPrisma.aiCreditLedger.create },
    }
    return fn(txMock)
  })
  mockedPrisma.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 } as never)
  mockedPrisma.aiCreditAccount.update.mockResolvedValue({} as never)
  mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)
  mockedPrisma.aiUsageLog.create.mockResolvedValue({ id: 'log-1' } as never)
}

describe('assessLabCorrelationsBatchWithAi — credit flow (P1-C)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes the DeepSeek batch call through runAiFeature: balance checked, credits deducted, AiUsageLog written under lab_medication_correlation', async () => {
    mockCreditAccount({ monthlyCredits: 500 })
    mockTransactionSucceeds()
    mockedCallLlm.mockResolvedValue(makeLlmResult(batchPayloadJson()))

    const out = await assessLabCorrelationsBatchWithAi({
      medications: [med],
      lastTwoLabSnapshots: [snapshot],
      abnormalParameters: [lab],
      focusPairs: [
        {
          substanceId: 'sub-quetiapin',
          substanceName: 'Quetiapin',
          labParameter: 'alt',
          labParameterLabel: 'ALT',
          kbHint: null,
        },
      ],
      resolvedByName: new Map([['quetiapin', { substanceId: 'sub-quetiapin' }]]),
      language: 'de',
      usageContext: {
        userId: 'user-1',
        organisationId: null,
        caseId: null,
        featureKey: 'lab_medication_correlation',
      },
    })

    expect(out.parseFailed).toBe(false)
    expect(out.results).toHaveLength(1)
    expect(out.results[0]?.correlationStrength).toBe('possible')

    // 1. Balance was checked BEFORE the LLM call.
    expect(mockedPrisma.aiCreditAccount.findUnique).toHaveBeenCalled()
    // 2. Credits were deducted transactionally on success.
    expect(mockedPrisma.$transaction).toHaveBeenCalledOnce()
    const ledgerArgs = mockedPrisma.aiCreditLedger.create.mock.calls[0][0]
    expect(ledgerArgs.data).toMatchObject({
      type: 'debit',
      featureKey: 'lab_medication_correlation',
    })
    expect(ledgerArgs.data.credits).toBeLessThan(0)
    // 3. AiUsageLog row was written with the credit feature key.
    expect(mockedPrisma.aiUsageLog.create).toHaveBeenCalledOnce()
    const logArgs = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logArgs.data.featureKey).toBe('lab_medication_correlation')
    expect(logArgs.data.success).toBe(true)
    expect(logArgs.data.creditsCharged).toBeGreaterThan(0)
  })

  it('blocks the call (no LLM, no deduction) when the user has zero credits', async () => {
    mockCreditAccount({ monthlyCredits: 0, purchasedCredits: 0 })
    mockedCallLlm.mockResolvedValue(makeLlmResult(batchPayloadJson()))

    await expect(
      assessLabCorrelationsBatchWithAi({
        medications: [med],
        lastTwoLabSnapshots: [snapshot],
        abnormalParameters: [lab],
        focusPairs: [
          {
            substanceId: 'sub-quetiapin',
            substanceName: 'Quetiapin',
            labParameter: 'alt',
            labParameterLabel: 'ALT',
            kbHint: null,
          },
        ],
        resolvedByName: new Map([['quetiapin', { substanceId: 'sub-quetiapin' }]]),
        language: 'de',
        usageContext: {
          userId: 'user-1',
          organisationId: null,
          caseId: null,
          featureKey: 'lab_medication_correlation',
        },
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError)

    // LLM provider must NOT have been called.
    expect(mockedCallLlm).not.toHaveBeenCalled()
    // Credits must NOT have been deducted.
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('assessLabCorrelationWithAi — credit flow (P1-C)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes the OpenAI second-opinion call through runAiFeature and bills lab_medication_correlation_check', async () => {
    mockCreditAccount({ monthlyCredits: 500 })
    mockTransactionSucceeds()
    mockedCallLlm.mockResolvedValue(
      makeLlmResult(singlePayloadJson(), { provider: 'openai', model: 'gpt-4.1' }),
    )

    const out = await assessLabCorrelationWithAi({
      med,
      lab,
      substanceId: 'sub-quetiapin',
      provider: 'openai',
      language: 'de',
      usageContext: {
        userId: 'user-1',
        organisationId: null,
        caseId: null,
        featureKey: 'lab_medication_correlation',
      },
    })

    expect(out).not.toBeNull()
    expect(out?.correlationStrength).toBe('possible')

    // Balance checked before egress.
    expect(mockedPrisma.aiCreditAccount.findUnique).toHaveBeenCalled()
    // Deducted under the second-opinion billing key.
    expect(mockedPrisma.$transaction).toHaveBeenCalledOnce()
    const ledgerArgs = mockedPrisma.aiCreditLedger.create.mock.calls[0][0]
    expect(ledgerArgs.data).toMatchObject({
      type: 'debit',
      featureKey: 'lab_medication_correlation_check',
    })
    // Usage log written under the second-opinion billing key.
    const logArgs = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logArgs.data.featureKey).toBe('lab_medication_correlation_check')
  })
})

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

// ── Mock the supabase-js credit + usage data layer ──────────────────────────
const ensureAccount = vi.fn()
const debit = vi.fn()
const insertAiUsageLog = vi.fn()

vi.mock('../data/credits', () => ({
  creditsRepo: {
    ensureAccount: (...args: unknown[]) => ensureAccount(...args),
    debit: (...args: unknown[]) => debit(...args),
    refund: vi.fn(),
    grantPurchased: vi.fn(),
    listLedger: vi.fn(),
    getAccountByUserId: vi.fn(),
    hasLedgerEntryWithNote: vi.fn(),
    startTrial: vi.fn(),
    applySubscription: vi.fn(),
    grantSubscriptionPeriod: vi.fn(),
    setLock: vi.fn(),
    getUserIdByStripeCustomerId: vi.fn(),
  },
}))

vi.mock('../data/aiUsage', () => ({
  insertAiUsageLog: (...args: unknown[]) => insertAiUsageLog(...args),
  listUserUsageSince: vi.fn().mockResolvedValue([]),
  listRecentUsageForUser: vi.fn().mockResolvedValue([]),
}))

// checkBalance → migrateLegacyCreditsIfNeeded; the mock no-ops so the legacy
// migration never runs in these unit tests.
vi.mock('./creditMigration', () => ({
  migrateLegacyCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
  accountIdFromUserId: (userId?: string) => userId?.trim() || 'default',
}))

// Soft-lock gate isolated — covered by subscriptionAccess.test.ts.
vi.mock('./subscriptionAccess', () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

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
    user_id: 'user-1',
    organisation_id: null,
    monthly_credits: overrides.monthlyCredits ?? 500,
    purchased_credits: overrides.purchasedCredits ?? 0,
    monthly_reset_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ensureAccount.mockResolvedValue(account as any)
  // The atomic ai_credit_debit RPC succeeds, and usage logging returns an id.
  debit.mockResolvedValue(true)
  insertAiUsageLog.mockResolvedValue('log-1')
  return account
}

describe('assessLabCorrelationsBatchWithAi — credit flow (P1-C)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes the DeepSeek batch call through runAiFeature: balance checked, credits deducted, AiUsageLog written under lab_medication_correlation', async () => {
    mockCreditAccount({ monthlyCredits: 500 })
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

    // 1. Balance was checked BEFORE the LLM call (account ensured).
    expect(ensureAccount).toHaveBeenCalled()
    // 2. Credits were deducted atomically via the ai_credit_debit RPC, under the
    //    correct feature key and with a positive spend amount.
    expect(debit).toHaveBeenCalledOnce()
    const [, debitCredits, debitFeatureKey] = debit.mock.calls[0]
    expect(debitFeatureKey).toBe('lab_medication_correlation')
    expect(debitCredits).toBeGreaterThan(0)
    // 3. ai_usage_logs row was written with the credit feature key.
    expect(insertAiUsageLog).toHaveBeenCalledOnce()
    const logArg = insertAiUsageLog.mock.calls[0][0]
    expect(logArg.featureKey).toBe('lab_medication_correlation')
    expect(logArg.success).toBe(true)
    expect(logArg.creditsCharged).toBeGreaterThan(0)
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
    expect(debit).not.toHaveBeenCalled()
  })
})

describe('assessLabCorrelationWithAi — credit flow (P1-C)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes the OpenAI second-opinion call through runAiFeature and bills lab_medication_correlation_check', async () => {
    mockCreditAccount({ monthlyCredits: 500 })
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
    expect(ensureAccount).toHaveBeenCalled()
    // Deducted under the second-opinion billing key via the atomic RPC.
    expect(debit).toHaveBeenCalledOnce()
    expect(debit.mock.calls[0][2]).toBe('lab_medication_correlation_check')
    // Usage log written under the second-opinion billing key.
    const logArg = insertAiUsageLog.mock.calls[0][0]
    expect(logArg.featureKey).toBe('lab_medication_correlation_check')
  })
})

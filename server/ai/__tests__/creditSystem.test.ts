/**
 * Credit system tests.
 *
 * Covers:
 *  - Credit estimation (base + overflow, mode multiplier)
 *  - Successful credit deduction flow
 *  - Failed AI call does NOT deduct credits
 *  - Insufficient credits blocks call before LLM is contacted
 *  - Standard / Gründlich mode multipliers
 *  - Overflow token billing
 *  - Ledger balance correctness
 *  - Provider usage normalization (creditCalculator uses token counts)
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mock Prisma before importing any module that uses it ───────────────────
vi.mock('../../db', () => ({
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
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock callLlm (raw) — safeLlmEgress delegates to it
vi.mock('../../services/llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

import { prisma } from '../../db'
import { callLlm } from '../../services/llmProvider'
import {
  estimateCredits,
  calculateFinalCredits,
  estimateTokensFromText,
} from '../creditCalculator'
import {
  checkBalance,
  deductCreditsTransactionally,
  InsufficientCreditsError,
} from '../creditGuard'
import { logAiUsage } from '../usageLogger'
import { modeToTier, parseMode } from '../aiRouter'
import { runAiFeature } from '../runAiFeature'
import type { LlmCallResult } from '../types'

// ── Test doubles ────────────────────────────────────────────────────────────

const mockedCallLlm = vi.mocked(callLlm)
const mockedPrisma = vi.mocked(prisma, true)

function makeLlmResult(overrides: Partial<LlmCallResult> = {}): LlmCallResult {
  return {
    text: 'Generated text',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    usage: {
      inputTokens: 1000,
      cachedInputTokens: 0,
      cacheMissInputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      audioMinutes: null,
      usageSource: 'provider_reported',
      rawUsageJson: null,
    },
    requestId: null,
    latencyMs: 200,
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

function mockTransaction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
    const txMock = {
      aiCreditAccount: {
        findUnique: mockedPrisma.aiCreditAccount.findUnique,
        update: mockedPrisma.aiCreditAccount.update,
        updateMany: mockedPrisma.aiCreditAccount.updateMany,
      },
      aiCreditLedger: {
        create: mockedPrisma.aiCreditLedger.create,
      },
    }
    return fn(txMock)
  })
  mockedPrisma.aiCreditAccount.update.mockResolvedValue({} as never)
  mockedPrisma.aiCreditAccount.updateMany.mockResolvedValue({ count: 1 } as never)
  mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)
}

// ── creditCalculator tests ───────────────────────────────────────────────────

describe('creditCalculator.estimateCredits', () => {
  // economic mode defaults route to the baseline provider (DeepSeek-v4-flash,
  // factor=1.0), so the documented mode multiplier holds 1:1 here. gruendlich
  // defaults to OpenAI gpt-4.1 (factor ~10×) — see the provider-cost test
  // group below for the cross-provider assertions.
  it('returns base × multiplier for tokens within included limit', () => {
    // inline_text_edit: base=1, maxIncluded=2000, multiplier(economic)=1, factor=1
    const cost = estimateCredits('inline_text_edit', 'economic', 1000)
    expect(cost).toBe(1)

    // standard multiplier = 2, factor=1 (DeepSeek primary)
    const cost2 = estimateCredits('inline_text_edit', 'standard', 1000)
    expect(cost2).toBe(2)
  })

  it('applies Gründlich multiplier (4×) when billed against the DeepSeek baseline', () => {
    // Force the DeepSeek baseline model so the provider-cost factor is 1.0
    // and the pure mode multiplier is observable here.
    const cost = estimateCredits('inline_text_edit', 'gruendlich', 1000, {
      modelId: 'deepseek-v4-flash',
    })
    expect(cost).toBe(4) // 1 × 4 × 1.0 = 4
  })

  it('bills overflow tokens in blocks when totalTokens > maxIncluded', () => {
    // inline_text_edit: base=1, maxIncluded=2000, blockSize=1000, overflowCreditsPerBlock=1
    // With 4000 tokens at economic (1×, factor=1): overflow = 4000-2000 = 2000 → 2 blocks → 2 extra credits
    // total = 1 (base) + 2 (overflow) = 3
    const cost = estimateCredits('inline_text_edit', 'economic', 4000)
    expect(cost).toBe(3)
  })

  it('overflow billing is also multiplied by mode', () => {
    // At standard (2×, factor=1) with same overflow:
    //   base + overflow = (1 × 2) + (2 × 1 × 2) = 6
    const cost = estimateCredits('inline_text_edit', 'standard', 4000)
    expect(cost).toBe(6)
  })

  it('minimum cost is 1 credit', () => {
    const cost = estimateCredits('transcription', 'economic', 0)
    expect(cost).toBeGreaterThanOrEqual(1)
  })

  it('uses DEFAULT_RULE for unknown feature keys', () => {
    const cost = estimateCredits('nonexistent_feature_xyz', 'economic', 1000)
    expect(cost).toBeGreaterThanOrEqual(1)
  })
})

describe('creditCalculator.calculateFinalCredits', () => {
  it('uses actual total tokens from provider usage', () => {
    const cost = calculateFinalCredits('inline_text_edit', 'economic', { totalTokens: 3000 })
    // 3000 tokens: overflow = 1000 → 1 block → total = 1 + 1 = 2 (factor=1)
    expect(cost).toBe(2)
  })

  it('scales final credits up when the actual model is more expensive than the baseline', () => {
    // economic mode normally costs 1 credit for inline_text_edit @ 1000 tokens.
    // If a call ends up on gpt-4.1 instead of DeepSeek, the provider-cost
    // factor must lift the credit cost above 1 — even though the mode is
    // economic. This is the "OpenAI must not consume credits at the same
    // rate as DeepSeek" guarantee in the spec.
    const cost = calculateFinalCredits(
      'inline_text_edit',
      'economic',
      { totalTokens: 1000 },
      { modelId: 'gpt-4.1' },
    )
    expect(cost).toBeGreaterThan(1)
  })
})

describe('creditCalculator.estimateTokensFromText', () => {
  it('estimates roughly chars/4', () => {
    const text = 'a'.repeat(400)
    expect(estimateTokensFromText(text)).toBe(100)
  })
})

// ── aiRouter tests ──────────────────────────────────────────────────────────

describe('aiRouter', () => {
  it('maps economic → fast', () => expect(modeToTier('economic')).toBe('fast'))
  it('maps standard → standard', () => expect(modeToTier('standard')).toBe('standard'))
  it('maps gruendlich → thorough', () => expect(modeToTier('gruendlich')).toBe('thorough'))

  it('parseMode falls back to standard for invalid input', () => {
    expect(parseMode('invalid')).toBe('standard')
    expect(parseMode(null)).toBe('standard')
    expect(parseMode(undefined)).toBe('standard')
  })

  it('parseMode respects custom fallback', () => {
    expect(parseMode('invalid', 'economic')).toBe('economic')
  })
})

// ── creditGuard tests ───────────────────────────────────────────────────────

describe('creditGuard.checkBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when estimated credits = 0', async () => {
    await expect(checkBalance('user-1', 0)).resolves.toBeUndefined()
    expect(mockedPrisma.aiCreditAccount.findUnique).not.toHaveBeenCalled()
  })

  it('throws InsufficientCreditsError when balance is too low', async () => {
    mockCreditAccount({ monthlyCredits: 2, purchasedCredits: 0 })
    await expect(checkBalance('user-1', 5)).rejects.toThrow(InsufficientCreditsError)
  })

  it('succeeds when monthly + purchased >= estimated', async () => {
    mockCreditAccount({ monthlyCredits: 3, purchasedCredits: 2 })
    await expect(checkBalance('user-1', 5)).resolves.toBeUndefined()
  })

  it('counts purchased credits towards available balance', async () => {
    mockCreditAccount({ monthlyCredits: 0, purchasedCredits: 10 })
    await expect(checkBalance('user-1', 5)).resolves.toBeUndefined()
  })
})

describe('creditGuard.deductCreditsTransactionally', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok=false when balance is insufficient at deduction time', async () => {
    mockCreditAccount({ monthlyCredits: 2, purchasedCredits: 0 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
    })
    expect(result.ok).toBe(false)
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('runs a transaction and returns ok=true on success', async () => {
    mockCreditAccount({ monthlyCredits: 100, purchasedCredits: 0 })
    mockTransaction()
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
    })
    expect(result.ok).toBe(true)
    expect(mockedPrisma.$transaction).toHaveBeenCalledOnce()
  })

  // ── P1-A: overdraft race regression ─────────────────────────────────────
  //
  // Two concurrent debits for an account with exactly enough credits for ONE
  // of them must produce exactly one winner. The loser observes the
  // conditional updateMany returning count=0 and returns { ok: false }
  // without writing a ledger row. Balance can never go negative.
  it('serializes concurrent debits via conditional updateMany (no overdraft)', async () => {
    // Shared state behind the mocks — mimics the database row.
    const balance = { monthlyCredits: 5, purchasedCredits: 0 }
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      organisationId: null,
      monthlyResetAt: new Date(Date.now() + 30 * 86400 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockedPrisma.aiCreditAccount.findUnique as any).mockImplementation(
      async () => ({
        ...account,
        monthlyCredits: balance.monthlyCredits,
        purchasedCredits: balance.purchasedCredits,
      }),
    )

    // Atomic conditional update: only decrements when both gte guards pass.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockedPrisma.aiCreditAccount.updateMany as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any) => {
        const minPurchased = args.where?.purchasedCredits?.gte ?? 0
        const minMonthly = args.where?.monthlyCredits?.gte ?? 0
        if (
          balance.purchasedCredits >= minPurchased &&
          balance.monthlyCredits >= minMonthly
        ) {
          balance.purchasedCredits -= args.data?.purchasedCredits?.decrement ?? 0
          balance.monthlyCredits -= args.data?.monthlyCredits?.decrement ?? 0
          return { count: 1 }
        }
        return { count: 0 }
      },
    )

    mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)

    // Sequence the transaction so both concurrent calls fully enter
    // before either runs its conditional updateMany — this is the worst
    // case for the race.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      const txMock = {
        aiCreditAccount: {
          findUnique: mockedPrisma.aiCreditAccount.findUnique,
          updateMany: mockedPrisma.aiCreditAccount.updateMany,
        },
        aiCreditLedger: { create: mockedPrisma.aiCreditLedger.create },
      }
      return fn(txMock)
    })

    const [a, b] = await Promise.all([
      deductCreditsTransactionally({
        userId: 'user-1',
        credits: 5,
        featureKey: 'inline_text_edit',
      }),
      deductCreditsTransactionally({
        userId: 'user-1',
        credits: 5,
        featureKey: 'inline_text_edit',
      }),
    ])

    // Exactly one winner.
    const winners = [a.ok, b.ok].filter(Boolean)
    expect(winners).toHaveLength(1)
    // Balance never goes negative — and the loser writes no ledger row.
    expect(balance.monthlyCredits).toBeGreaterThanOrEqual(0)
    expect(balance.purchasedCredits).toBeGreaterThanOrEqual(0)
    expect(mockedPrisma.aiCreditLedger.create).toHaveBeenCalledOnce()
  })
})

// ── P1-B: monthly reset / replenishment ────────────────────────────────────

describe('creditGuard.ensureCreditAccount (monthly reset)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('replenishes monthlyCredits and writes a monthly_grant ledger row when monthlyResetAt is in the past', async () => {
    const pastReset = new Date(Date.now() - 86400 * 1000)
    mockedPrisma.aiCreditAccount.findUnique.mockResolvedValueOnce({
      id: 'acc-1',
      userId: 'user-1',
      organisationId: null,
      monthlyCredits: 0,
      purchasedCredits: 50,
      monthlyResetAt: pastReset,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    mockedPrisma.aiCreditAccount.updateMany.mockResolvedValueOnce({ count: 1 } as never)
    mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)

    const { ensureCreditAccount } = await import('../creditGuard')
    const account = await ensureCreditAccount('user-1')

    expect(account.monthlyCredits).toBe(500)
    // Purchased credits are preserved across the reset.
    expect(account.purchasedCredits).toBe(50)

    // updateMany was keyed on the stale monthlyResetAt for atomicity.
    expect(mockedPrisma.aiCreditAccount.updateMany).toHaveBeenCalledOnce()
    const updateArgs = mockedPrisma.aiCreditAccount.updateMany.mock.calls[0][0]
    expect(updateArgs.where).toMatchObject({ id: 'acc-1', monthlyResetAt: pastReset })
    expect(updateArgs.data.monthlyCredits).toBe(500)
    expect(updateArgs.data.monthlyResetAt).toBeInstanceOf(Date)
    expect((updateArgs.data.monthlyResetAt as Date).getTime()).toBeGreaterThan(Date.now())

    // Ledger row recorded the grant.
    expect(mockedPrisma.aiCreditLedger.create).toHaveBeenCalledOnce()
    const ledgerArgs = mockedPrisma.aiCreditLedger.create.mock.calls[0][0]
    expect(ledgerArgs.data).toMatchObject({
      accountId: 'acc-1',
      type: 'monthly_grant',
      credits: 500,
    })
  })

  it('does NOT replenish when monthlyResetAt is in the future', async () => {
    const futureReset = new Date(Date.now() + 30 * 86400 * 1000)
    mockedPrisma.aiCreditAccount.findUnique.mockResolvedValueOnce({
      id: 'acc-1',
      userId: 'user-1',
      organisationId: null,
      monthlyCredits: 12,
      purchasedCredits: 5,
      monthlyResetAt: futureReset,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const { ensureCreditAccount } = await import('../creditGuard')
    const account = await ensureCreditAccount('user-1')

    expect(account.monthlyCredits).toBe(12)
    expect(account.purchasedCredits).toBe(5)
    expect(mockedPrisma.aiCreditAccount.updateMany).not.toHaveBeenCalled()
    expect(mockedPrisma.aiCreditLedger.create).not.toHaveBeenCalled()
  })

  it('two concurrent first-of-the-month calls grant exactly once (no double-grant)', async () => {
    const pastReset = new Date(Date.now() - 86400 * 1000)
    const initialRow = {
      id: 'acc-1',
      userId: 'user-1',
      organisationId: null,
      monthlyCredits: 0,
      purchasedCredits: 0,
      monthlyResetAt: pastReset,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    let currentResetAt: Date = pastReset

    // Both concurrent callers see the same stale row initially.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockedPrisma.aiCreditAccount.findUnique as any).mockImplementation(
      async () => ({
        ...initialRow,
        monthlyResetAt: currentResetAt,
        monthlyCredits: currentResetAt === pastReset ? 0 : 500,
      }),
    )

    // updateMany succeeds ONLY when keyed on the still-stale reset timestamp;
    // after the first winner advances `currentResetAt`, the second loses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockedPrisma.aiCreditAccount.updateMany as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any) => {
        const whereReset = args.where?.monthlyResetAt
        if (whereReset && whereReset.getTime() === currentResetAt.getTime()) {
          currentResetAt = args.data.monthlyResetAt as Date
          return { count: 1 }
        }
        return { count: 0 }
      },
    )

    mockedPrisma.aiCreditLedger.create.mockResolvedValue({} as never)

    const { ensureCreditAccount } = await import('../creditGuard')
    const [a, b] = await Promise.all([
      ensureCreditAccount('user-1'),
      ensureCreditAccount('user-1'),
    ])

    // Both calls return the granted balance (winner observes 500 directly;
    // loser re-reads and observes the winner's update).
    expect(a.monthlyCredits).toBe(500)
    expect(b.monthlyCredits).toBe(500)
    // Only ONE ledger row is written across both concurrent callers.
    expect(mockedPrisma.aiCreditLedger.create).toHaveBeenCalledOnce()
    expect(mockedPrisma.aiCreditLedger.create.mock.calls[0][0].data.type).toBe(
      'monthly_grant',
    )
  })
})

// ── usageLogger tests ────────────────────────────────────────────────────────

describe('usageLogger.logAiUsage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes a row to AiUsageLog and returns the id', async () => {
    mockedPrisma.aiUsageLog.create.mockResolvedValue({ id: 'log-123' } as never)
    const id = await logAiUsage({
      userId: 'user-1',
      organisationId: null,
      caseRef: null,
      featureKey: 'inline_text_edit',
      mode: 'standard',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      creditsCharged: 3,
      success: true,
    })
    expect(id).toBe('log-123')
    expect(mockedPrisma.aiUsageLog.create).toHaveBeenCalledOnce()
    const call = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    // Verify no text/prompt fields are stored
    expect(JSON.stringify(call.data)).not.toContain('systemPrompt')
    expect(JSON.stringify(call.data)).not.toContain('userPrompt')
    expect(JSON.stringify(call.data)).not.toContain('patient')
  })

  it('returns null and logs to console on error (never throws)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedPrisma.aiUsageLog.create.mockRejectedValue(new Error('DB down'))
    const id = await logAiUsage({
      userId: 'user-1',
      organisationId: null,
      caseRef: null,
      featureKey: 'inline_text_edit',
      mode: 'standard',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsCharged: 0,
      success: false,
    })
    expect(id).toBeNull()
    consoleSpy.mockRestore()
  })
})

// ── runAiFeature integration tests ──────────────────────────────────────────

describe('runAiFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPrisma.aiUsageLog.create.mockResolvedValue({ id: 'log-1' } as never)
  })

  it('calls callLlm and returns result when balance is sufficient', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
    mockTransaction()
    mockedCallLlm.mockResolvedValue(makeLlmResult())

    const result = await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'economic',
      systemPrompt: 'system',
      userPrompt: 'user',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })

    expect(result.text).toBe('Generated text')
    expect(mockedCallLlm).toHaveBeenCalledOnce()
  })

  it('throws InsufficientCreditsError and does NOT call callLlm', async () => {
    mockCreditAccount({ monthlyCredits: 0, purchasedCredits: 0 })

    await expect(
      runAiFeature({
        featureKey: 'inline_text_edit',
        mode: 'standard',
        systemPrompt: 'system',
        userPrompt: 'user',
        usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
      }),
    ).rejects.toThrow(InsufficientCreditsError)

    expect(mockedCallLlm).not.toHaveBeenCalled()
  })

  it('does NOT deduct credits when callLlm throws', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
    mockedCallLlm.mockRejectedValue(new Error('Provider error'))

    await expect(
      runAiFeature({
        featureKey: 'inline_text_edit',
        mode: 'economic',
        systemPrompt: 'system',
        userPrompt: 'user',
        usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
      }),
    ).rejects.toThrow('Provider error')

    // Transaction (deduction) should NOT have run
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('logs failure to AiUsageLog even when callLlm throws', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
    mockedCallLlm.mockRejectedValue(new Error('Provider error'))

    await expect(
      runAiFeature({
        featureKey: 'inline_text_edit',
        mode: 'economic',
        systemPrompt: 'system',
        userPrompt: 'user',
        usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
      }),
    ).rejects.toThrow()

    // Failure log should have been written
    expect(mockedPrisma.aiUsageLog.create).toHaveBeenCalledOnce()
    const logCall = mockedPrisma.aiUsageLog.create.mock.calls[0][0]
    expect(logCall.data.success).toBe(false)
  })

  it('skips credit accounting when skipCreditAccounting=true', async () => {
    mockedCallLlm.mockResolvedValue(makeLlmResult())

    const result = await runAiFeature({
      featureKey: 'criteria_draft_generate',
      skipCreditAccounting: true,
      systemPrompt: 'system',
      userPrompt: 'user',
    })

    expect(result.text).toBe('Generated text')
    expect(mockedPrisma.aiCreditAccount.findUnique).not.toHaveBeenCalled()
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('applies Gründlich mode (4× multiplier) resulting in higher credit deduction', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
    mockTransaction()
    mockedCallLlm.mockResolvedValue(makeLlmResult({ usage: {
      inputTokens: 500, cachedInputTokens: 0, cacheMissInputTokens: 500,
      outputTokens: 500, totalTokens: 1000,
      audioMinutes: null, usageSource: 'provider_reported', rawUsageJson: null,
    }}))

    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'gruendlich',
      systemPrompt: 'system',
      userPrompt: 'user',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })

    // inline_text_edit at gruendlich (4×): base=1×4=4 credits for 1000 tokens (within 2000 limit)
    const ledgerCall = mockedPrisma.aiCreditLedger.create.mock.calls[0][0]
    expect(Math.abs(ledgerCall.data.credits)).toBe(4)
  })

  it('mode=standard uses tier standard (deepseek)', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
    mockTransaction()
    mockedCallLlm.mockResolvedValue(makeLlmResult())

    await runAiFeature({
      featureKey: 'inline_text_edit',
      mode: 'standard',
      systemPrompt: 'system',
      userPrompt: 'user',
      usageContext: { userId: 'user-1', featureKey: 'inline_text_edit' },
    })

    // callLlm receives tier='standard'
    expect(mockedCallLlm).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'standard' }),
    )
  })
})

// ── All known AI routes use runAiFeature ─────────────────────────────────────

describe('route egress invariant — runAiFeature exports', () => {
  it('runAiFeature and InsufficientCreditsError are exported correctly', () => {
    // This test documents the invariant: runAiFeature → callLlmSafely → callLlm.
    // The egress audit test in safeLlmEgressAudit.test.ts enforces this at the file level.
    expect(typeof runAiFeature).toBe('function')
    expect(typeof InsufficientCreditsError).toBe('function')
    // Verify InsufficientCreditsError is an Error subclass
    const err = new InsufficientCreditsError(5, 10)
    expect(err).toBeInstanceOf(Error)
    expect(err.available).toBe(5)
    expect(err.required).toBe(10)
    expect(err.name).toBe('InsufficientCreditsError')
  })
})

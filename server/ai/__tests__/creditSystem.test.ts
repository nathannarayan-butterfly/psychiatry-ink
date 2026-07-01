/**
 * Credit system tests.
 *
 * Covers:
 *  - Credit estimation (base + overflow, mode multiplier)
 *  - Successful credit deduction flow (atomic ai_credit_debit RPC wrapper)
 *  - Failed AI call does NOT deduct credits
 *  - Insufficient credits blocks call before LLM is contacted
 *  - Standard / Gründlich mode multipliers
 *  - Overflow token billing
 *  - Usage logging via the supabase-js ai_usage_logs seam
 *
 * The credit data layer is now supabase-js (server/data/credits.ts wrapping the
 * atomic SECURITY DEFINER RPCs). Atomicity (purchased-first spend, no-overdraft
 * gte guards, single-winner monthly grant) lives in Postgres and is exercised by
 * the migration; these unit tests assert the JS seam delegates correctly and
 * maps rows faithfully.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// ── Mock the supabase-js credit data layer ──────────────────────────────────
const ensureAccount = vi.fn()
const debit = vi.fn()
const refund = vi.fn()
const grantPurchased = vi.fn()
const listLedger = vi.fn()

vi.mock('../../data/credits', () => ({
  creditsRepo: {
    ensureAccount: (...args: unknown[]) => ensureAccount(...args),
    debit: (...args: unknown[]) => debit(...args),
    refund: (...args: unknown[]) => refund(...args),
    grantPurchased: (...args: unknown[]) => grantPurchased(...args),
    listLedger: (...args: unknown[]) => listLedger(...args),
    getAccountByUserId: vi.fn(),
    hasLedgerEntryWithNote: vi.fn(),
    startTrial: vi.fn(),
    applySubscription: vi.fn(),
    grantSubscriptionPeriod: vi.fn(),
    setLock: vi.fn(),
    getUserIdByStripeCustomerId: vi.fn(),
  },
}))

// AI usage logging now writes to ai_usage_logs via the supabase-js seam.
const insertAiUsageLog = vi.fn()
vi.mock('../../data/aiUsage', () => ({
  insertAiUsageLog: (...args: unknown[]) => insertAiUsageLog(...args),
  listUserUsageSince: vi.fn().mockResolvedValue([]),
  listRecentUsageForUser: vi.fn().mockResolvedValue([]),
}))

// checkBalance / getCreditSummary call migrateLegacyCreditsIfNeeded first; the
// mock no-ops so the legacy migration never runs in these unit tests.
vi.mock('../../services/creditMigration', () => ({
  migrateLegacyCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
  accountIdFromUserId: (userId?: string) => userId?.trim() || 'default',
}))

// Mock callLlm (raw) — safeLlmEgress delegates to it
vi.mock('../../services/llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

// The soft-lock gate in runAiFeature delegates to subscriptionAccess (which
// reads the account via the Supabase seam). These credit-flow tests isolate the
// credit logic; the access decision itself is covered by subscriptionAccess.test.ts.
// computeAccess + AccessLockedError are also stubbed because creditGuard's spend
// gate (assertCanSpendCredits) imports them; here access is always granted so the
// credit math is exercised in isolation.
vi.mock('../../services/subscriptionAccess', () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
  computeAccess: vi.fn(() => ({ access: true, locked: false, reason: 'no_account' })),
  AccessLockedError: class AccessLockedError extends Error {
    code = 'subscription_required'
    reason = 'subscription_required'
  },
}))

import { callLlm } from '../../services/llmProvider'
import {
  estimateCredits,
  calculateFinalCredits,
  estimateTokensFromText,
} from '../creditCalculator'
import {
  checkBalance,
  deductCreditsTransactionally,
  ensureCreditAccount,
  InsufficientCreditsError,
} from '../creditGuard'
import { logAiUsage } from '../usageLogger'
import { modeToTier, parseMode, tierToMode } from '../aiRouter'
import { runAiFeature } from '../runAiFeature'
import type { LlmCallResult } from '../types'

// ── Test doubles ────────────────────────────────────────────────────────────

const mockedCallLlm = vi.mocked(callLlm)

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

/** Build a snake_case ai_credit_accounts row and wire it onto ensureAccount. */
function mockCreditAccount(
  overrides: { monthlyCredits?: number; purchasedCredits?: number } = {},
) {
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
  // Default: the atomic debit succeeds unless a test overrides it.
  debit.mockResolvedValue(true)
  return account
}

// ── creditCalculator tests ───────────────────────────────────────────────────

describe('creditCalculator.estimateCredits', () => {
  it('returns base × multiplier for tokens within included limit', () => {
    // inline_text_edit: base=1, maxIncluded=2000, multiplier(economic)=1
    const cost = estimateCredits('inline_text_edit', 'economic', 1000)
    expect(cost).toBe(1) // 1 × 1 = 1

    // standard multiplier = 2
    const cost2 = estimateCredits('inline_text_edit', 'standard', 1000)
    expect(cost2).toBe(2) // 1 × 2 = 2
  })

  it('applies Gründlich multiplier (4×)', () => {
    const cost = estimateCredits('inline_text_edit', 'gruendlich', 1000)
    expect(cost).toBe(4) // 1 × 4 = 4
  })

  it('bills overflow tokens in blocks when totalTokens > maxIncluded', () => {
    // inline_text_edit: base=1, maxIncluded=2000, blockSize=1000, overflowCreditsPerBlock=1
    // With 4000 tokens at economic (1×): overflow = 4000-2000 = 2000 → 2 blocks → 2 extra credits
    // total = 1 (base) + 2 (overflow) = 3
    const cost = estimateCredits('inline_text_edit', 'economic', 4000)
    expect(cost).toBe(3)
  })

  it('overflow billing is also multiplied by mode', () => {
    // Formula: base × modeMultiplier + overflowBlocks × overflowCreditsPerBlock × modeMultiplier
    // = (1 × 2) + (2 × 1 × 2) = 2 + 4 = 6
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
    // 3000 tokens: overflow = 1000 → 1 block → total = 1 + 1 = 2
    expect(cost).toBe(2)
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

  // Inverse map: a user-selected tier must drive the credit multiplier so the
  // charge matches the model the tier routes to (the per-tier billing fix).
  it('maps fast → economic', () => expect(tierToMode('fast')).toBe('economic'))
  it('maps standard → standard', () => expect(tierToMode('standard')).toBe('standard'))
  it('maps thorough → gruendlich', () => expect(tierToMode('thorough')).toBe('gruendlich'))

  it('round-trips modeToTier ∘ tierToMode for every tier', () => {
    for (const tier of ['fast', 'standard', 'thorough'] as const) {
      expect(modeToTier(tierToMode(tier))).toBe(tier)
    }
  })

  it('tier→mode scales the credit multiplier 1× / 2× / 4×', () => {
    // butterfly: base 4, 1000 tokens within the included window → base × multiplier.
    expect(estimateCredits('butterfly', tierToMode('fast'), 1000)).toBe(4) // economic 1×
    expect(estimateCredits('butterfly', tierToMode('standard'), 1000)).toBe(8) // standard 2×
    expect(estimateCredits('butterfly', tierToMode('thorough'), 1000)).toBe(16) // gruendlich 4×
  })
})

// ── creditGuard tests ───────────────────────────────────────────────────────

describe('creditGuard.checkBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when estimated credits = 0', async () => {
    await expect(checkBalance('user-1', 0)).resolves.toBeUndefined()
    expect(ensureAccount).not.toHaveBeenCalled()
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

describe('creditGuard.ensureCreditAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delegates to the ai_credit_ensure_account RPC with the monthly grant, and maps the row', async () => {
    const account = mockCreditAccount({ monthlyCredits: 500, purchasedCredits: 50 })

    const mapped = await ensureCreditAccount('user-1')

    // Monthly grant = MONTHLY_CREDIT_GRANT (500). The next reset boundary is
    // computed entirely inside the RPC (rolling 30 days from the account's own
    // creation/prior-reset date) — the client no longer passes it.
    expect(ensureAccount).toHaveBeenCalledOnce()
    const [userId, grant] = ensureAccount.mock.calls[0]
    expect(userId).toBe('user-1')
    expect(grant).toBe(500)

    // snake_case row → camelCase mapping, purchased credits preserved.
    expect(mapped.id).toBe('acc-1')
    expect(mapped.monthlyCredits).toBe(500)
    expect(mapped.purchasedCredits).toBe(50)
    expect(mapped.monthlyResetAt).toBeInstanceOf(Date)
    expect(mapped.monthlyResetAt.toISOString()).toBe(account.monthly_reset_at)
  })
})

describe('creditGuard.deductCreditsTransactionally', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok=false when balance is insufficient at the advisory pre-check', async () => {
    mockCreditAccount({ monthlyCredits: 2, purchasedCredits: 0 })
    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
    })
    expect(result.ok).toBe(false)
    // The RPC is never invoked when the account is plainly underwater.
    expect(debit).not.toHaveBeenCalled()
  })

  it('delegates to the atomic ai_credit_debit RPC and returns ok=true on success', async () => {
    mockCreditAccount({ monthlyCredits: 100, purchasedCredits: 0 })
    debit.mockResolvedValue(true)

    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
      mode: 'standard',
    })

    expect(result.ok).toBe(true)
    expect(debit).toHaveBeenCalledOnce()
    const [accountId, credits, featureKey, opts] = debit.mock.calls[0]
    expect(accountId).toBe('acc-1')
    expect(credits).toBe(5)
    expect(featureKey).toBe('inline_text_edit')
    expect(opts).toMatchObject({ note: 'mode=standard' })
  })

  it('propagates a lost debit race (RPC returns false) as ok=false, no ledger row', async () => {
    // Account has enough to pass the advisory check, but the atomic RPC reports
    // the loser of a concurrent race — the seam must surface ok=false.
    mockCreditAccount({ monthlyCredits: 5, purchasedCredits: 0 })
    debit.mockResolvedValue(false)

    const result = await deductCreditsTransactionally({
      userId: 'user-1',
      credits: 5,
      featureKey: 'inline_text_edit',
    })

    expect(result.ok).toBe(false)
    expect(debit).toHaveBeenCalledOnce()
  })
})

// ── usageLogger tests ────────────────────────────────────────────────────────

describe('usageLogger.logAiUsage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes a row to ai_usage_logs and returns the id', async () => {
    insertAiUsageLog.mockResolvedValue('log-123')
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
    expect(insertAiUsageLog).toHaveBeenCalledOnce()
    const arg = insertAiUsageLog.mock.calls[0][0]
    // Verify no text/prompt fields are stored
    expect(JSON.stringify(arg)).not.toContain('systemPrompt')
    expect(JSON.stringify(arg)).not.toContain('userPrompt')
    expect(JSON.stringify(arg)).not.toContain('patient')
  })

  it('returns null and logs to console on error (never throws)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    insertAiUsageLog.mockRejectedValue(new Error('DB down'))
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
    insertAiUsageLog.mockResolvedValue('log-1')
  })

  it('calls callLlm and returns result when balance is sufficient', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
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

    // Deduction RPC should NOT have run
    expect(debit).not.toHaveBeenCalled()
  })

  it('logs failure to ai_usage_logs even when callLlm throws', async () => {
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
    expect(insertAiUsageLog).toHaveBeenCalledOnce()
    const arg = insertAiUsageLog.mock.calls[0][0]
    expect(arg.success).toBe(false)
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
    expect(ensureAccount).not.toHaveBeenCalled()
    expect(debit).not.toHaveBeenCalled()
  })

  it('applies Gründlich mode (4× multiplier) resulting in higher credit deduction', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
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
    expect(debit).toHaveBeenCalledOnce()
    expect(debit.mock.calls[0][1]).toBe(4)
  })

  it('mode=standard uses tier standard (deepseek)', async () => {
    mockCreditAccount({ monthlyCredits: 100 })
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

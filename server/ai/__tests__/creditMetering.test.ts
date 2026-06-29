/**
 * Credit metering / counter-reconciliation tests.
 *
 * Covers the billing changes:
 *   - 16  patient_education_generic per-section cost lowered.
 *   - 14b dictation/transcription charge scales with transcript length / audio
 *         duration (no flat fee).
 *   - 15b standalone translation charge scales with text length (tokens).
 *   - 17  the "used credits" counter is derived from the credit LEDGER (net
 *         debits) so it reconciles with the balance (used + remaining == total).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

import { estimateCredits } from '../creditCalculator'
import {
  dictationCreditsForTranscript,
  MIN_DICTATION_CREDITS,
} from '../transcriptionCredits'

// ── 16. Patientenaufklärung (patient_education_generic) ──────────────────────

describe('patient_education_generic credit cost (item 16)', () => {
  it('costs 2 credits per section at standard (down from 4)', () => {
    // Typical section: small prompt + ≤2200-token output, well within 4000.
    expect(estimateCredits('patient_education_generic', 'standard', 2500)).toBe(2)
  })

  it('costs 4 credits per section at gruendlich', () => {
    expect(estimateCredits('patient_education_generic', 'gruendlich', 2500)).toBe(4)
  })

  it('a full ~10-section sheet at standard costs ~20 credits (was ~40)', () => {
    const perSection = estimateCredits('patient_education_generic', 'standard', 2500)
    expect(perSection * 10).toBe(20)
  })

  it('only bills overflow for unusually long sections (>4000 tokens)', () => {
    // 8000 tokens → overflow 4000 / 2000 = 2 blocks → base 2 + 2×1×2 = 6.
    expect(estimateCredits('patient_education_generic', 'standard', 8000)).toBe(6)
  })
})

// ── 15b. Translation (standalone_translation) ────────────────────────────────

describe('standalone_translation credit cost (item 15b)', () => {
  it('charges a low base for a short passage (scales with length, not flat)', () => {
    // ≤1500 tokens → base 1 × standard 2 = 2 credits.
    expect(estimateCredits('standalone_translation', 'standard', 800)).toBe(2)
  })

  it('bills longer text per overflow block', () => {
    // 5000 tokens → overflow (5000-1500)=3500 / 1000 = 4 blocks → 2 + 4×2 = 10.
    expect(estimateCredits('standalone_translation', 'standard', 5000)).toBe(10)
  })

  it('is cheaper than the old document_generation fall-through for short text', () => {
    const translation = estimateCredits('standalone_translation', 'standard', 800)
    const oldFallthrough = estimateCredits('document_generation', 'standard', 800) // base 4 → 8
    expect(translation).toBeLessThan(oldFallthrough)
  })
})

// ── 14b. Dictation / transcription length-based metering ─────────────────────

describe('dictationCreditsForTranscript (item 14b)', () => {
  it('charges the base credit for a short dictation', () => {
    expect(dictationCreditsForTranscript('Kurze Notiz.', 20)).toBe(1)
  })

  it('scales up with a longer transcript', () => {
    // ~2000 tokens → 8000 chars. transcription rule: base 1 + (2000-1000)/500 = 3.
    const long = 'a'.repeat(8000)
    expect(dictationCreditsForTranscript(long, 60)).toBe(3)
  })

  it('applies an audio-duration floor when the transcript is sparse', () => {
    // Empty/short transcript but 5 minutes of audio → ceil(300/120) = 3.
    expect(dictationCreditsForTranscript('', 300)).toBe(3)
  })

  it('never charges below the minimum', () => {
    expect(dictationCreditsForTranscript('', 0)).toBe(MIN_DICTATION_CREDITS)
  })

  it('is no longer a flat 5-credit charge for short notes', () => {
    expect(dictationCreditsForTranscript('Ein Satz.', 5)).toBeLessThan(5)
  })
})

// ── 17. Ledger-based "used" counter reconciliation ───────────────────────────

const ensureAccount = vi.fn()
const sumNetSpendSince = vi.fn()

vi.mock('../../data/credits', () => ({
  creditsRepo: {
    ensureAccount: (...args: unknown[]) => ensureAccount(...args),
    sumNetSpendSince: (...args: unknown[]) => sumNetSpendSince(...args),
  },
}))

vi.mock('../../services/creditMigration', () => ({
  migrateLegacyCreditsIfNeeded: vi.fn().mockResolvedValue(undefined),
  accountIdFromUserId: (userId?: string) => userId?.trim() || 'default',
}))

vi.mock('../../services/subscriptionAccess', () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
  computeAccess: vi.fn(() => ({ access: true, locked: false, reason: 'no_account' })),
  AccessLockedError: class AccessLockedError extends Error {},
}))

describe('getCreditsUsedThisPeriod (item 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureAccount.mockResolvedValue({
      id: 'acc-1',
      monthly_credits: 398,
      purchased_credits: 0,
      monthly_reset_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    })
  })

  it('returns the ledger net spend (so used + remaining == granted)', async () => {
    const { getCreditsUsedThisPeriod, getCreditSummary } = await import('../creditGuard')
    // Ledger says 102 credits were actually debited this period (incl. dictation
    // debits that never reached ai_usage_logs.credits_charged).
    sumNetSpendSince.mockResolvedValue(102)

    const used = await getCreditsUsedThisPeriod('user-1')
    const summary = await getCreditSummary('user-1')

    expect(used).toBe(102)
    // 102 used + 398 remaining == 500 granted — the counter now reconciles.
    expect(used + summary.totalAvailable).toBe(500)
  })

  it('queries the ledger since the start of the current UTC month', async () => {
    const { getCreditsUsedThisPeriod } = await import('../creditGuard')
    sumNetSpendSince.mockResolvedValue(0)

    await getCreditsUsedThisPeriod('user-1')

    expect(sumNetSpendSince).toHaveBeenCalledOnce()
    const [accountId, sinceIso] = sumNetSpendSince.mock.calls[0]
    expect(accountId).toBe('acc-1')
    const since = new Date(sinceIso as string)
    expect(since.getUTCDate()).toBe(1)
    expect(since.getUTCHours()).toBe(0)
  })
})

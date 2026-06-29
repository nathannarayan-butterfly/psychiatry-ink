/**
 * sumNetSpendSince — ledger-based net-spend math (item 17).
 *
 * Verifies the sign handling that makes the "used" counter reconcile with the
 * balance: debit rows are stored NEGATIVE, refund rows POSITIVE, and grants /
 * purchases are excluded by the `type` filter, so net spend = -(Σ credits).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const gte = vi.fn()
const inFn = vi.fn(() => ({ gte }))
const eq = vi.fn(() => ({ in: inFn }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('../services/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}))

import { sumNetSpendSince } from './credits'

beforeEach(() => {
  vi.clearAllMocks()
  eq.mockReturnValue({ in: inFn })
  inFn.mockReturnValue({ gte })
  select.mockReturnValue({ eq })
  from.mockReturnValue({ select })
})

describe('sumNetSpendSince', () => {
  it('returns the absolute net of negative debits and positive refunds', async () => {
    // Debited 110, refunded 8 → net spent 102.
    gte.mockResolvedValue({
      data: [
        { credits: -50, type: 'debit' },
        { credits: -60, type: 'debit' },
        { credits: 8, type: 'refund' },
      ],
      error: null,
    })

    await expect(sumNetSpendSince('acc-1', '2026-06-01T00:00:00.000Z')).resolves.toBe(102)
  })

  it('queries only debit/refund rows since the given timestamp', async () => {
    gte.mockResolvedValue({ data: [], error: null })

    await sumNetSpendSince('acc-1', '2026-06-01T00:00:00.000Z')

    expect(from).toHaveBeenCalledWith('ai_credit_ledger')
    expect(eq).toHaveBeenCalledWith('account_id', 'acc-1')
    expect(inFn).toHaveBeenCalledWith('type', ['debit', 'refund'])
    expect(gte).toHaveBeenCalledWith('created_at', '2026-06-01T00:00:00.000Z')
  })

  it('never returns a negative number', async () => {
    // Defensive: a period with more refunds than debits clamps to 0.
    gte.mockResolvedValue({ data: [{ credits: 5, type: 'refund' }], error: null })
    await expect(sumNetSpendSince('acc-1', '2026-06-01T00:00:00.000Z')).resolves.toBe(0)
  })

  it('throws when the ledger read errors', async () => {
    gte.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(sumNetSpendSince('acc-1', '2026-06-01T00:00:00.000Z')).rejects.toThrow(/boom/)
  })
})

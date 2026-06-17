import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Priority 3 — atomic credit reservation.
 *
 * `reserveCredits` must perform the affordability check and the decrement as a
 * SINGLE conditional SQL UPDATE (`updateMany WHERE balance >= amount`) so two
 * concurrent generations can never both pass a check-then-deduct and overspend.
 */

const updateMany = vi.fn()
const findUnique = vi.fn()
const upsert = vi.fn()
const update = vi.fn()

vi.mock('../db', () => ({
  prisma: {
    creditBalance: {
      updateMany: (...args: unknown[]) => updateMany(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
      update: (...args: unknown[]) => update(...args),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        creditBalance: {
          updateMany: (...args: unknown[]) => updateMany(...args),
          findUnique: (...args: unknown[]) => findUnique(...args),
          update: (...args: unknown[]) => update(...args),
        },
      }),
  },
}))

import { refundCredits, reserveCredits } from './credits'

beforeEach(() => {
  updateMany.mockReset()
  findUnique.mockReset()
  upsert.mockReset()
  update.mockReset()
  upsert.mockResolvedValue({ id: 'user-1', balance: 100, plan: 'free' })
})

describe('reserveCredits (atomic)', () => {
  it('decrements via a single conditional updateMany guarded by balance >= amount', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    findUnique.mockResolvedValue({ id: 'user-1', balance: 90 })

    const result = await reserveCredits(10, 'user-1')

    expect(result).toEqual({ ok: true, balance: 90 })
    expect(updateMany).toHaveBeenCalledTimes(1)
    const arg = updateMany.mock.calls[0]![0] as {
      where: { id: string; balance: { gte: number } }
      data: { balance: { decrement: number } }
    }
    expect(arg.where.id).toBe('user-1')
    expect(arg.where.balance).toEqual({ gte: 10 })
    expect(arg.data.balance).toEqual({ decrement: 10 })
  })

  it('fails (ok=false) without decrementing when the balance is insufficient', async () => {
    // The conditional UPDATE matches no row → count 0 → reservation rejected.
    updateMany.mockResolvedValue({ count: 0 })
    findUnique.mockResolvedValue({ id: 'user-1', balance: 5 })

    const result = await reserveCredits(10, 'user-1')

    expect(result.ok).toBe(false)
    expect(result.balance).toBe(5)
  })

  it('short-circuits non-positive amounts without an UPDATE', async () => {
    findUnique.mockResolvedValue({ id: 'user-1', balance: 100 })
    const result = await reserveCredits(0, 'user-1')
    expect(result).toEqual({ ok: true, balance: 100 })
    expect(updateMany).not.toHaveBeenCalled()
  })
})

describe('refundCredits', () => {
  it('increments the balance back when a generation fails', async () => {
    update.mockResolvedValue({ id: 'user-1', balance: 110 })
    const balance = await refundCredits(10, 'user-1')
    expect(balance).toBe(110)
    const arg = update.mock.calls[0]![0] as { data: { balance: { increment: number } } }
    expect(arg.data.balance).toEqual({ increment: 10 })
  })
})

/**
 * POST /api/ai-credits/webhook tests.
 *
 * Covers:
 *  - Stripe signature verification failures → 400 with no body.
 *  - Idempotent re-delivery (same event id processed once).
 *  - checkout.session.completed flips status to paid, increments
 *    purchasedCredits, and emits a `purchase_credit` ledger row.
 *  - checkout.session.expired marks the row failed.
 *  - charge.refunded marks the row refunded, decrements purchasedCredits,
 *    and clamps the decrement at 0 when credits were already spent.
 */

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const constructEvent = vi.fn()
const paymentIntentsRetrieve = vi.fn()
const chargesRetrieve = vi.fn()

vi.mock('../../db', () => ({
  prisma: {
    aiCreditPurchase: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    aiCreditAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    aiCreditLedger: {
      create: vi.fn(),
    },
    processedWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    // Inline transaction passthrough so the handler's $transaction(fn) body
    // sees the same mocked methods (the prod path uses tx.* directly).
    $transaction: vi.fn(async (fn) => fn({
      aiCreditPurchase: {
        updateMany: vi.fn(),
      },
      aiCreditAccount: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      aiCreditLedger: {
        create: vi.fn(),
      },
    })),
  },
}))

vi.mock('../../services/stripeClient', () => ({
  getStripe: vi.fn(),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test'),
}))

import { prisma } from '../../db'
import { aiCreditsWebhookRouter } from '../aiCreditsWebhook'
import { getStripe } from '../../services/stripeClient'

const mockedPrisma = vi.mocked(prisma, true)
const mockedGetStripe = vi.mocked(getStripe)

let server: Server
let baseUrl: string

beforeAll(() => {
  const app = express()
  app.use(
    '/api/ai-credits/webhook',
    express.raw({ type: 'application/json' }),
    aiCreditsWebhookRouter,
  )
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

/**
 * The handler runs every credit-write inside `prisma.$transaction(async tx => …)`.
 * We rebuild the tx mock per-test so call counts are scoped to that test.
 */
function configureTransactionMock(): {
  txPurchaseUpdateMany: ReturnType<typeof vi.fn>
  txAccountUpdate: ReturnType<typeof vi.fn>
  txLedgerCreate: ReturnType<typeof vi.fn>
} {
  const txPurchaseUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
  const txAccountUpdate = vi.fn().mockResolvedValue({})
  const txLedgerCreate = vi.fn().mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.$transaction as any).mockImplementation(async (fn: any) =>
    fn({
      aiCreditPurchase: {
        updateMany: txPurchaseUpdateMany,
      },
      aiCreditAccount: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'acc-1',
          userId: 'user-1',
          monthlyCredits: 200,
          purchasedCredits: 0,
          monthlyResetAt: new Date('2026-07-01'),
        }),
        update: txAccountUpdate,
        create: vi.fn().mockResolvedValue({ id: 'acc-1' }),
      },
      aiCreditLedger: {
        create: txLedgerCreate,
      },
    }),
  )
  return { txPurchaseUpdateMany, txAccountUpdate, txLedgerCreate }
}

beforeEach(() => {
  vi.clearAllMocks()

  mockedGetStripe.mockReturnValue({
    webhooks: { constructEvent },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
    charges: { retrieve: chargesRetrieve },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  // Default dedupe state: event not yet processed.
  ;(mockedPrisma.processedWebhookEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  ;(mockedPrisma.processedWebhookEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
  ;(mockedPrisma.aiCreditPurchase.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  ;(mockedPrisma.aiCreditAccount.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'acc-1',
    userId: 'user-1',
    monthlyCredits: 200,
    purchasedCredits: 0,
    monthlyResetAt: new Date('2026-07-01'),
  })
})

describe('POST /api/ai-credits/webhook', () => {
  it('returns 400 when the signature header is missing', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(400)
    expect(constructEvent).not.toHaveBeenCalled()
  })

  it('returns 400 with no body when signature verification fails', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload.')
    })
    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 'invalid' },
      body: '{}',
    })
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toBe('')
    expect(mockedPrisma.processedWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('credits the account when checkout.session.completed arrives for a pending purchase', async () => {
    const tx = configureTransactionMock()

    constructEvent.mockReturnValue({
      id: 'evt_paid_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_paid_1',
          mode: 'payment',
          payment_status: 'paid',
          client_reference_id: 'purchase-1',
        },
      },
    })

    ;(mockedPrisma.aiCreditPurchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'purchase-1',
      userId: 'user-1',
      bundleId: 'b-1',
      credits: 250,
      status: 'pending',
      externalRef: 'cs_test_paid_1',
    })

    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(res.status).toBe(200)

    expect(tx.txPurchaseUpdateMany).toHaveBeenCalledOnce()
    expect(tx.txPurchaseUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'paid' })
    expect(tx.txAccountUpdate).toHaveBeenCalledOnce()
    expect(tx.txAccountUpdate.mock.calls[0][0].data).toEqual({
      purchasedCredits: { increment: 250 },
    })
    expect(tx.txLedgerCreate).toHaveBeenCalledOnce()
    expect(tx.txLedgerCreate.mock.calls[0][0].data).toMatchObject({
      type: 'purchase_credit',
      bucket: 'purchased',
      credits: 250,
      note: 'bundle_purchase:purchase-1',
    })

    expect(mockedPrisma.processedWebhookEvent.create).toHaveBeenCalledOnce()
    expect(
      (mockedPrisma.processedWebhookEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data,
    ).toMatchObject({ eventId: 'evt_paid_1', eventType: 'checkout.session.completed' })
  })

  it('idempotent re-delivery: the same event id processed once does not double-credit', async () => {
    const tx = configureTransactionMock()

    constructEvent.mockReturnValue({
      id: 'evt_paid_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_dup',
          mode: 'payment',
          payment_status: 'paid',
          client_reference_id: 'purchase-1',
        },
      },
    })

    // First time: not processed.
    // Second time: already processed → short-circuit at the dedupe table read.
    ;(mockedPrisma.processedWebhookEvent.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ eventId: 'evt_paid_dup', eventType: 'checkout.session.completed' })

    ;(mockedPrisma.aiCreditPurchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'purchase-1',
      userId: 'user-1',
      bundleId: 'b-1',
      credits: 250,
      status: 'pending',
      externalRef: 'cs_test_dup',
    })

    const r1 = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(r1.status).toBe(200)
    expect(tx.txAccountUpdate).toHaveBeenCalledOnce()

    const r2 = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(r2.status).toBe(200)
    const body = await r2.json()
    expect(body.duplicate).toBe(true)
    // Second delivery must NOT increment credits again.
    expect(tx.txAccountUpdate).toHaveBeenCalledOnce()
  })

  it('checkout.session.expired marks the purchase failed without crediting', async () => {
    const tx = configureTransactionMock()

    constructEvent.mockReturnValue({
      id: 'evt_expired_1',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired_1',
          mode: 'payment',
          client_reference_id: 'purchase-2',
        },
      },
    })

    ;(mockedPrisma.aiCreditPurchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'purchase-2',
      userId: 'user-1',
      bundleId: 'b-1',
      credits: 100,
      status: 'pending',
      externalRef: 'cs_test_expired_1',
    })
    ;(mockedPrisma.aiCreditPurchase.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(res.status).toBe(200)
    expect(mockedPrisma.aiCreditPurchase.updateMany).toHaveBeenCalledOnce()
    expect(
      (mockedPrisma.aiCreditPurchase.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toMatchObject({
      where: { id: 'purchase-2', status: { in: ['pending'] } },
      data: { status: 'failed' },
    })
    // No credit ledger writes for an expired session.
    expect(tx.txLedgerCreate).not.toHaveBeenCalled()
  })

  it('charge.refunded full refund decrements purchasedCredits and writes a refund ledger row', async () => {
    // Override transaction mock with a richer account-state snapshot:
    // user has 250 purchased credits (the full bundle) — refund decrements all 250.
    const txPurchaseUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
    const txAccountUpdate = vi.fn().mockResolvedValue({})
    const txLedgerCreate = vi.fn().mockResolvedValue({})
    ;(mockedPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (fn) =>
      fn({
        aiCreditPurchase: { updateMany: txPurchaseUpdateMany },
        aiCreditAccount: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'acc-1',
            userId: 'user-1',
            monthlyCredits: 200,
            purchasedCredits: 250,
            monthlyResetAt: new Date('2026-07-01'),
          }),
          update: txAccountUpdate,
          create: vi.fn(),
        },
        aiCreditLedger: { create: txLedgerCreate },
      }),
    )

    constructEvent.mockReturnValue({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_refund_1',
          amount: 999,
          amount_refunded: 999,
          currency: 'gbp',
          metadata: { purchaseId: 'purchase-3' },
          payment_intent: 'pi_test_1',
        },
      },
    })

    ;(mockedPrisma.aiCreditPurchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'purchase-3',
      userId: 'user-1',
      bundleId: 'b-1',
      credits: 250,
      status: 'paid',
      externalRef: 'cs_test_refunded_1',
    })

    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(res.status).toBe(200)

    expect(txPurchaseUpdateMany).toHaveBeenCalledOnce()
    expect(txPurchaseUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'refunded' })

    expect(txAccountUpdate).toHaveBeenCalledOnce()
    expect(txAccountUpdate.mock.calls[0][0].data).toEqual({
      purchasedCredits: { decrement: 250 },
    })
    expect(txLedgerCreate).toHaveBeenCalledOnce()
    expect(txLedgerCreate.mock.calls[0][0].data).toMatchObject({
      type: 'refund',
      bucket: 'purchased',
      credits: -250,
    })
    expect(txLedgerCreate.mock.calls[0][0].data.note).toContain('bundle_refund:purchase-3')
  })

  it('charge.refunded clamps the decrement at 0 when credits were already spent', async () => {
    // User had the 250-credit bundle but already spent 200 → only 50 left.
    // Full refund should decrement by 50 (not 250) and note the clamp.
    const txPurchaseUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
    const txAccountUpdate = vi.fn().mockResolvedValue({})
    const txLedgerCreate = vi.fn().mockResolvedValue({})
    ;(mockedPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (fn) =>
      fn({
        aiCreditPurchase: { updateMany: txPurchaseUpdateMany },
        aiCreditAccount: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'acc-1',
            userId: 'user-1',
            monthlyCredits: 0,
            purchasedCredits: 50, // already spent 200 of 250
            monthlyResetAt: new Date('2026-07-01'),
          }),
          update: txAccountUpdate,
          create: vi.fn(),
        },
        aiCreditLedger: { create: txLedgerCreate },
      }),
    )

    constructEvent.mockReturnValue({
      id: 'evt_refund_clamp_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_refund_clamp_1',
          amount: 999,
          amount_refunded: 999,
          currency: 'gbp',
          metadata: { purchaseId: 'purchase-4' },
          payment_intent: 'pi_test_2',
        },
      },
    })

    ;(mockedPrisma.aiCreditPurchase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'purchase-4',
      userId: 'user-1',
      bundleId: 'b-1',
      credits: 250,
      status: 'paid',
      externalRef: 'cs_test_clamped',
    })

    const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=ok' },
      body: '{}',
    })
    expect(res.status).toBe(200)

    expect(txAccountUpdate).toHaveBeenCalledOnce()
    expect(txAccountUpdate.mock.calls[0][0].data).toEqual({
      purchasedCredits: { decrement: 50 },
    })
    expect(txLedgerCreate).toHaveBeenCalledOnce()
    expect(txLedgerCreate.mock.calls[0][0].data.credits).toBe(-50)
    expect(txLedgerCreate.mock.calls[0][0].data.note).toMatch(/clamped at 0/i)
  })
})

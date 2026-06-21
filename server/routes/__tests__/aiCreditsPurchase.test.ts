/**
 * POST /api/ai-credits/purchase tests.
 *
 * Covers:
 *  - Unauthenticated requests are rejected (401).
 *  - Missing bundleId → 400.
 *  - Unknown SKU → 400.
 *  - No Stripe key configured → 503.
 *  - Missing Stripe Price ID for the SKU → 503.
 *  - Happy path → 201, AiCreditPurchase row with status='pending',
 *    Stripe Checkout Session created with the right line_items / urls /
 *    client_reference_id / metadata, externalRef written back to row.
 *  - Stripe SDK throwing → 502 with generic message, row rolled back to failed.
 *  - GET /bundles returns the 5 Beta SKUs.
 */

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db', () => ({
  prisma: {
    aiCreditBundle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    aiCreditPurchase: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

const checkoutSessionsCreate = vi.fn()

vi.mock('../../services/stripeClient', () => ({
  getStripe: vi.fn(),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test'),
  isStripeCheckoutConfigured: vi.fn(() => true),
  resolvePriceIdForSku: vi.fn((sku: string) => `price_test_${sku.replace(/^credits-/, '')}`),
  resolvePublicAppOrigin: vi.fn(() => 'https://app.example.com'),
}))

import { prisma } from '../../db'
import { aiCreditsRouter } from '../aiCredits'
import { CREDIT_BUNDLE_SKUS } from '../../ai/aiPricingConfig'
import {
  getStripe,
  isStripeCheckoutConfigured,
  resolvePriceIdForSku,
} from '../../services/stripeClient'

const mockedPrisma = vi.mocked(prisma, true)
const mockedGetStripe = vi.mocked(getStripe)
const mockedIsStripeConfigured = vi.mocked(isStripeCheckoutConfigured)
const mockedResolvePrice = vi.mocked(resolvePriceIdForSku)

let server: Server
let baseUrl: string

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'NODE_ENV',
  'ENABLE_DEV_AUTH_BYPASS',
] as const

beforeAll(() => {
  const app = express()
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json())
  app.use('/api/ai-credits', aiCreditsRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of ENV_KEYS) delete process.env[key]
  process.env.SUPABASE_URL = 'https://testproj.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_testanonkey'

  // Stripe defaults: configured, with a real session create.
  checkoutSessionsCreate.mockResolvedValue({
    id: 'cs_test_session_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_session_1',
  })
  mockedIsStripeConfigured.mockReturnValue(true)
  mockedGetStripe.mockReturnValue({
    checkout: { sessions: { create: checkoutSessionsCreate } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  mockedResolvePrice.mockImplementation((sku: string) =>
    sku.startsWith('credits-') ? `price_test_${sku.replace(/^credits-/, '')}` : null,
  )

  mockedPrisma.aiCreditBundle.findMany.mockResolvedValue(
    CREDIT_BUNDLE_SKUS.map((b, idx) => ({
      id: `b-${idx}`,
      sku: b.sku,
      credits: b.credits,
      priceGbp: b.priceGbp.toFixed(2),
      active: true,
      createdAt: new Date(),
    })) as never,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockedPrisma.aiCreditBundle.findUnique as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ where }: any) => {
      const sku = where?.sku
      const idx = CREDIT_BUNDLE_SKUS.findIndex((b) => b.sku === sku)
      if (idx === -1) return null
      const b = CREDIT_BUNDLE_SKUS[idx]
      return {
        id: `b-${idx}`,
        sku: b.sku,
        credits: b.credits,
        priceGbp: b.priceGbp.toFixed(2),
        active: true,
        createdAt: new Date(),
      }
    },
  )
  mockedPrisma.aiCreditPurchase.create.mockResolvedValue({
    id: 'pp-1',
    userId: 'user-1',
    bundleId: 'b-1',
    credits: 250,
    priceGbp: '9.99',
    status: 'pending',
    externalRef: null,
    createdAt: new Date('2026-06-21T00:00:00Z'),
    paidAt: null,
  } as never)
  mockedPrisma.aiCreditPurchase.update.mockResolvedValue({} as never)
  mockedPrisma.aiCreditPurchase.updateMany.mockResolvedValue({ count: 1 } as never)
  mockedPrisma.aiCreditPurchase.findMany.mockResolvedValue([] as never)
})

describe('GET /api/ai-credits/bundles', () => {
  it('returns all five Beta SKUs in ascending credit order', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/bundles`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bundles).toHaveLength(5)
    const skus = body.bundles.map((b: { sku: string }) => b.sku)
    expect(skus).toEqual([
      'credits-100',
      'credits-250',
      'credits-500',
      'credits-1000',
      'credits-2500',
    ])
    for (const bundle of body.bundles) {
      expect(bundle.unitPriceGbp).toBeGreaterThan(0)
      expect(bundle.priceGbp).toBeGreaterThan(0)
      expect(bundle.credits).toBeGreaterThan(0)
    }
  })
})

describe('POST /api/ai-credits/purchase', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bundleId: 'credits-250' }),
    })
    expect(res.status).toBe(401)
    expect(mockedPrisma.aiCreditPurchase.create).not.toHaveBeenCalled()
    expect(checkoutSessionsCreate).not.toHaveBeenCalled()
  })

  it('rejects missing bundleId with 400', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    expect(mockedPrisma.aiCreditPurchase.create).not.toHaveBeenCalled()
  })

  it('rejects unknown SKU with 400', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
      },
      body: JSON.stringify({ bundleId: 'credits-12345' }),
    })
    expect(res.status).toBe(400)
    expect(mockedPrisma.aiCreditPurchase.create).not.toHaveBeenCalled()
  })

  it('returns 503 when Stripe is not configured', async () => {
    mockedIsStripeConfigured.mockReturnValue(false)
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ bundleId: 'credits-250' }),
    })
    expect(res.status).toBe(503)
    expect(mockedPrisma.aiCreditPurchase.create).not.toHaveBeenCalled()
    expect(checkoutSessionsCreate).not.toHaveBeenCalled()
  })

  it('returns 503 when no Price ID is configured for the SKU', async () => {
    mockedResolvePrice.mockReturnValue(null)
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ bundleId: 'credits-250' }),
    })
    expect(res.status).toBe(503)
    expect(checkoutSessionsCreate).not.toHaveBeenCalled()
  })

  it('creates a Stripe Checkout Session with the right line_items, urls, metadata and persists externalRef', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
        origin: 'https://app.example.com',
      },
      body: JSON.stringify({ bundleId: 'credits-250' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.purchase.sku).toBe('credits-250')
    expect(body.purchase.credits).toBe(250)
    expect(body.checkout.url).toBe('https://checkout.stripe.com/c/pay/cs_test_session_1')
    expect(body.checkout.sessionId).toBe('cs_test_session_1')

    // Inserted the pending purchase row.
    expect(mockedPrisma.aiCreditPurchase.create).toHaveBeenCalledOnce()
    const createArgs = mockedPrisma.aiCreditPurchase.create.mock.calls[0][0]
    expect(createArgs.data.userId).toBe('user-1')
    expect(createArgs.data.status).toBe('pending')

    // Called Stripe with the resolved Price ID + return URLs + client_reference_id.
    expect(checkoutSessionsCreate).toHaveBeenCalledOnce()
    const stripeArgs = checkoutSessionsCreate.mock.calls[0][0]
    expect(stripeArgs.mode).toBe('payment')
    expect(stripeArgs.line_items).toEqual([
      { price: 'price_test_250', quantity: 1 },
    ])
    expect(stripeArgs.success_url).toBe(
      'https://app.example.com/settings/ai-credits?purchase=success&session_id={CHECKOUT_SESSION_ID}',
    )
    expect(stripeArgs.cancel_url).toBe(
      'https://app.example.com/settings/ai-credits?purchase=cancelled',
    )
    expect(stripeArgs.client_reference_id).toBe('pp-1')
    expect(stripeArgs.metadata).toMatchObject({
      purchaseId: 'pp-1',
      userId: 'user-1',
      bundleSku: 'credits-250',
      credits: '250',
    })
    // Dynamic payment methods: explicitly do NOT pass payment_method_types.
    expect('payment_method_types' in stripeArgs).toBe(false)

    // Externalref persisted so the webhook can dedupe by session id too.
    expect(mockedPrisma.aiCreditPurchase.update).toHaveBeenCalledOnce()
    const updateArgs = mockedPrisma.aiCreditPurchase.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: 'pp-1' })
    expect(updateArgs.data).toEqual({ externalRef: 'cs_test_session_1' })
  })

  it('returns 502 and marks the purchase failed when Stripe throws', async () => {
    checkoutSessionsCreate.mockRejectedValueOnce(new Error('stripe down'))
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
        origin: 'https://app.example.com',
      },
      body: JSON.stringify({ bundleId: 'credits-100' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).not.toContain('stripe down')

    // Pending purchase was inserted but then rolled back to failed.
    expect(mockedPrisma.aiCreditPurchase.create).toHaveBeenCalledOnce()
    expect(mockedPrisma.aiCreditPurchase.updateMany).toHaveBeenCalled()
    const rollback = mockedPrisma.aiCreditPurchase.updateMany.mock.calls[0][0]
    expect(rollback.where).toMatchObject({ id: 'pp-1', status: 'pending' })
    expect(rollback.data).toEqual({ status: 'failed' })
  })

  it('accepts the `sku` field as an alias for `bundleId`', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
        origin: 'https://app.example.com',
      },
      body: JSON.stringify({ sku: 'credits-100' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.purchase.sku).toBe('credits-100')
    expect(checkoutSessionsCreate).toHaveBeenCalledOnce()
  })
})

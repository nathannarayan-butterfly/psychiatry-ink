/**
 * POST /api/ai-credits/purchase tests.
 *
 * Covers:
 *  - Unauthenticated requests are rejected (401).
 *  - Missing bundleId → 400.
 *  - Unknown SKU → 400.
 *  - Happy path → 201, AiCreditPurchase row with status='pending'.
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
    },
  },
}))

import { prisma } from '../../db'
import { aiCreditsRouter } from '../aiCredits'
import { CREDIT_BUNDLE_SKUS } from '../../ai/aiPricingConfig'

const mockedPrisma = vi.mocked(prisma, true)

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
  // Configure Supabase so requireRouteAuth doesn't auto-bypass to 'default'.
  process.env.SUPABASE_URL = 'https://testproj.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_testanonkey'

  // Default bundle catalogue available in DB.
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

  it('records a pending purchase and returns the bundle metadata', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
      },
      body: JSON.stringify({ bundleId: 'credits-250' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.purchase.sku).toBe('credits-250')
    expect(body.purchase.credits).toBe(250)
    expect(body.purchase.priceGbp).toBe(9.99)
    expect(body.purchase.status).toBe('pending')
    expect(body.checkout.url).toBeNull()

    expect(mockedPrisma.aiCreditPurchase.create).toHaveBeenCalledOnce()
    const args = mockedPrisma.aiCreditPurchase.create.mock.calls[0][0]
    expect(args.data.userId).toBe('user-1')
    expect(args.data.status).toBe('pending')
    expect(args.data.priceGbp).toBe('9.99')
    expect(args.data.credits).toBe(250)
  })

  it('accepts the `sku` field as an alias for `bundleId`', async () => {
    const res = await fetch(`${baseUrl}/api/ai-credits/purchase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-user': 'user-1',
      },
      body: JSON.stringify({ sku: 'credits-100' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.purchase.sku).toBe('credits-100')
  })
})

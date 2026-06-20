/**
 * Admin AI analytics route tests.
 *
 * Covers:
 *  - 404 gating when `ENABLE_ADMIN_AI_ANALYTICS_API` is unset.
 *  - 401 / 403 / 200 progression mirroring kb-admin.
 *  - Aggregation correctness on a seeded dataset (revenue × costs × bucket split).
 *  - Margin warning thresholds trip correctly.
 *  - `?from=` / `?to=` window narrowing.
 */

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock prisma BEFORE importing the router ─────────────────────────────────
vi.mock('../../db', () => ({
  prisma: {
    aiCreditPurchase: { findMany: vi.fn() },
    aiUsageLog: { findMany: vi.fn() },
    aiCreditLedger: { findMany: vi.fn() },
  },
}))

import { prisma } from '../../db'
import { adminAiAnalyticsRouter } from '../adminAiAnalytics'

const mockedPrisma = vi.mocked(prisma, true)

const ENV_KEYS = [
  'ENABLE_ADMIN_AI_ANALYTICS_API',
  'ADMIN_AI_ANALYTICS_API_ENABLED',
  'KB_ADMIN_USER_IDS',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'NODE_ENV',
  'MARGIN_WARN_THRESHOLD',
  'MARGIN_CRITICAL_THRESHOLD',
  'USD_TO_GBP_RATE',
] as const

let server: Server
let baseUrl: string

beforeAll(() => {
  const app = express()
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json())
  app.use('/api/admin/ai-analytics', adminAiAnalyticsRouter)
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
  // Default empty dataset.
  mockedPrisma.aiCreditPurchase.findMany.mockResolvedValue([] as never)
  mockedPrisma.aiUsageLog.findMany.mockResolvedValue([] as never)
  mockedPrisma.aiCreditLedger.findMany.mockResolvedValue([] as never)
})

function makeAuthConfigured() {
  process.env.SUPABASE_URL = 'https://testproj.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_testanonkey'
}

async function fetchAnalytics(headers: Record<string, string> = {}, query = '') {
  return fetch(`${baseUrl}/api/admin/ai-analytics${query}`, { headers })
}

describe('admin-ai-analytics gating', () => {
  it('returns 404 when the env flag is unset (hides the route)', async () => {
    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(404)
  })

  it('legacy env flag also enables the route', async () => {
    process.env.ADMIN_AI_ANALYTICS_API_ENABLED = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await fetchAnalytics({ 'x-test-user': 'random-user' })
    // 403 (admin gate) proves the API is enabled — a disabled API returns 404.
    expect(res.status).toBe(403)
  })

  it('explicit ENABLE_ADMIN_AI_ANALYTICS_API=false wins over the legacy flag', async () => {
    process.env.ENABLE_ADMIN_AI_ANALYTICS_API = 'false'
    process.env.ADMIN_AI_ANALYTICS_API_ENABLED = 'true'
    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(404)
  })

  it('returns 401 for unauthenticated requests when enabled', async () => {
    process.env.ENABLE_ADMIN_AI_ANALYTICS_API = 'true'
    makeAuthConfigured()
    const res = await fetchAnalytics()
    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated user lacks an admin role', async () => {
    process.env.ENABLE_ADMIN_AI_ANALYTICS_API = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await fetchAnalytics({ 'x-test-user': 'non-admin-user' })
    expect(res.status).toBe(403)
  })

  it('returns 200 for an authenticated admin', async () => {
    process.env.ENABLE_ADMIN_AI_ANALYTICS_API = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.window).toBeDefined()
    expect(body.marginHealth.status).toBe('healthy')
  })
})

describe('admin-ai-analytics aggregation', () => {
  beforeEach(() => {
    process.env.ENABLE_ADMIN_AI_ANALYTICS_API = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
  })

  it('rolls up revenue per bundle and total credits consumed by bucket', async () => {
    mockedPrisma.aiCreditPurchase.findMany.mockResolvedValue([
      {
        id: 'p1',
        userId: 'u1',
        bundleId: 'b1',
        credits: 250,
        priceGbp: '9.99',
        status: 'paid',
        externalRef: null,
        createdAt: new Date(),
        paidAt: new Date(),
        bundle: { id: 'b1', sku: 'credits-250', credits: 250, priceGbp: '9.99', active: true, createdAt: new Date() },
      },
      {
        id: 'p2',
        userId: 'u2',
        bundleId: 'b2',
        credits: 500,
        priceGbp: '17.99',
        status: 'paid',
        externalRef: null,
        createdAt: new Date(),
        paidAt: new Date(),
        bundle: { id: 'b2', sku: 'credits-500', credits: 500, priceGbp: '17.99', active: true, createdAt: new Date() },
      },
    ] as never)

    mockedPrisma.aiCreditLedger.findMany.mockResolvedValue([
      { credits: -50, bucket: 'monthly' },
      { credits: -20, bucket: 'purchased' },
      { credits: -10, bucket: 'monthly' },
    ] as never)

    mockedPrisma.aiUsageLog.findMany.mockResolvedValue([
      {
        featureKey: 'inline_text_edit',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        mode: 'economic',
        creditsCharged: 50,
        estimatedCostUsd: '0.100000',
        fallback: false,
        success: true,
        userId: 'u1',
        caseRef: 'case-1',
      },
      {
        featureKey: 'arztbrief_section',
        provider: 'openai',
        model: 'gpt-4.1',
        mode: 'gruendlich',
        creditsCharged: 30,
        estimatedCostUsd: '2.500000',
        fallback: false,
        success: true,
        userId: 'u2',
        caseRef: 'case-2',
      },
    ] as never)

    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.revenue.totalGbp).toBeCloseTo(27.98, 2)
    expect(body.revenue.perBundle).toHaveLength(2)

    expect(body.credits.monthlyConsumed).toBe(60)
    expect(body.credits.purchasedConsumed).toBe(20)
    expect(body.credits.totalConsumed).toBe(80)

    expect(body.cost.totalEstimatedUsd).toBeCloseTo(2.6, 5)
    expect(body.cost.openAiCostUsd).toBeCloseTo(2.5, 5)
    expect(body.cost.gruendlichCostUsd).toBeCloseTo(2.5, 5)
    expect(body.cost.openAiCostShare).toBeCloseTo(2.5 / 2.6, 3)

    expect(body.averages.distinctCases).toBe(2)
    expect(body.averages.distinctUsers).toBe(2)
    expect(body.averages.costPerPatientUsd).toBeCloseTo(1.3, 4)

    const arztFeature = body.features.find((f: { featureKey: string }) => f.featureKey === 'arztbrief_section')
    expect(arztFeature).toBeDefined()
    expect(arztFeature.callCount).toBe(1)

    expect(body.providers.map((p: { provider: string }) => p.provider).sort()).toEqual(['deepseek', 'openai'])
  })

  it('flags failed-call and fallback costs separately', async () => {
    mockedPrisma.aiUsageLog.findMany.mockResolvedValue([
      {
        featureKey: 'x',
        provider: 'openai',
        model: 'gpt-4.1',
        mode: 'gruendlich',
        creditsCharged: 0,
        estimatedCostUsd: '0.500000',
        fallback: false,
        success: false,
        userId: 'u',
        caseRef: null,
      },
      {
        featureKey: 'x',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        mode: 'gruendlich',
        creditsCharged: 4,
        estimatedCostUsd: '0.001000',
        fallback: true,
        success: true,
        userId: 'u',
        caseRef: null,
      },
    ] as never)

    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    const body = await res.json()
    expect(body.cost.failedCallCostUsd).toBeCloseTo(0.5, 5)
    expect(body.cost.fallbackCostUsd).toBeCloseTo(0.001, 5)
  })

  it('marks marginHealth=critical when variable cost > 50% of revenue', async () => {
    mockedPrisma.aiCreditPurchase.findMany.mockResolvedValue([
      {
        id: 'p',
        userId: 'u',
        bundleId: 'b',
        credits: 100,
        priceGbp: '10.00',
        status: 'paid',
        externalRef: null,
        createdAt: new Date(),
        paidAt: new Date(),
        bundle: { id: 'b', sku: 'credits-100', credits: 100, priceGbp: '10.00', active: true, createdAt: new Date() },
      },
    ] as never)
    // 8 USD cost × 0.79 GBP/USD = 6.32 GBP → 63.2% of 10 GBP → critical.
    mockedPrisma.aiUsageLog.findMany.mockResolvedValue([
      {
        featureKey: 'x',
        provider: 'openai',
        model: 'gpt-4.1',
        mode: 'gruendlich',
        creditsCharged: 100,
        estimatedCostUsd: '8.000000',
        fallback: false,
        success: true,
        userId: 'u',
        caseRef: null,
      },
    ] as never)

    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    const body = await res.json()
    expect(body.marginHealth.status).toBe('critical')
    expect(body.marginHealth.thresholds.warn).toBeCloseTo(0.4, 5)
    expect(body.marginHealth.thresholds.critical).toBeCloseTo(0.5, 5)
  })

  it('marks marginHealth=warning when variable cost is between 40% and 50% of revenue', async () => {
    mockedPrisma.aiCreditPurchase.findMany.mockResolvedValue([
      {
        id: 'p',
        userId: 'u',
        bundleId: 'b',
        credits: 100,
        priceGbp: '10.00',
        status: 'paid',
        externalRef: null,
        createdAt: new Date(),
        paidAt: new Date(),
        bundle: { id: 'b', sku: 'credits-100', credits: 100, priceGbp: '10.00', active: true, createdAt: new Date() },
      },
    ] as never)
    // 5.5 USD × 0.79 = 4.345 GBP → 43.45% → warning.
    mockedPrisma.aiUsageLog.findMany.mockResolvedValue([
      {
        featureKey: 'x',
        provider: 'openai',
        model: 'gpt-4.1',
        mode: 'gruendlich',
        creditsCharged: 100,
        estimatedCostUsd: '5.500000',
        fallback: false,
        success: true,
        userId: 'u',
        caseRef: null,
      },
    ] as never)

    const res = await fetchAnalytics({ 'x-test-user': 'admin-1' })
    const body = await res.json()
    expect(body.marginHealth.status).toBe('warning')
  })

  it('honours ?from= and ?to= window query params', async () => {
    const from = '2026-06-01T00:00:00.000Z'
    const to = '2026-06-15T00:00:00.000Z'
    const res = await fetchAnalytics(
      { 'x-test-user': 'admin-1' },
      `?from=${from}&to=${to}`,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.window.from).toBe(from)
    expect(body.window.to).toBe(to)
    expect(body.window.days).toBe(14)
    // Verify the prisma queries used the right range.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageCall = mockedPrisma.aiUsageLog.findMany.mock.calls[0][0] as any
    expect(usageCall?.where?.createdAt?.gte?.toISOString?.()).toBe(from)
    expect(usageCall?.where?.createdAt?.lte?.toISOString?.()).toBe(to)
  })
})

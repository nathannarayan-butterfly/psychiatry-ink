import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Priority 1 — auth rejection on a PHI/credit route.
 * Priority 3 — ownership binding + attribution + atomic reservation wiring.
 *
 * The generation-log route is the credit-spending boundary. Unauthenticated
 * requests must be REJECTED (401) instead of silently spending the shared
 * `default` account, logs must be bound to their creator, and credits must be
 * reserved atomically up front.
 */

const generationLogCreate = vi.fn()
const generationLogFindUnique = vi.fn()
const generationLogUpdate = vi.fn()
const reserveCredits = vi.fn()
const refundCredits = vi.fn()
const getCreditBalance = vi.fn()

vi.mock('../db', () => ({
  prisma: {
    generationLog: {
      create: (...a: unknown[]) => generationLogCreate(...a),
      findUnique: (...a: unknown[]) => generationLogFindUnique(...a),
      update: (...a: unknown[]) => generationLogUpdate(...a),
    },
  },
}))

vi.mock('../services/credits', () => ({
  reserveCredits: (...a: unknown[]) => reserveCredits(...a),
  refundCredits: (...a: unknown[]) => refundCredits(...a),
  getCreditBalance: (...a: unknown[]) => getCreditBalance(...a),
}))

vi.mock('../services/orgPermissions', () => ({
  ORG_HEADER: 'x-organisation-id',
  getCurrentOrganisation: vi.fn(async () => ({ id: 'org-1' })),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const { generationLogRouter } = await import('./generationLog')
  const app = express()
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json())
  app.use('/api/generation-log', generationLogRouter)
  server = app.listen(0)
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  generationLogCreate.mockReset()
  generationLogFindUnique.mockReset()
  generationLogUpdate.mockReset()
  reserveCredits.mockReset()
  refundCredits.mockReset()
  getCreditBalance.mockReset()
  delete process.env.ENABLE_DEV_AUTH_BYPASS
})

const validBody = {
  documentType: 'arztbrief',
  aiMode: 'generate',
  inputTextLength: 100,
  estimatedInputTokens: 50,
  estimatedCredits: 5,
}

async function postLog(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/generation-log`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('generation-log auth (Priority 1)', () => {
  it('rejects an unauthenticated create with 401 and never reserves credits', async () => {
    const res = await postLog(validBody)
    expect(res.status).toBe(401)
    expect(reserveCredits).not.toHaveBeenCalled()
    expect(generationLogCreate).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated PATCH with 401', async () => {
    const res = await fetch(`${baseUrl}/api/generation-log/abc`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    expect(res.status).toBe(401)
    expect(generationLogFindUnique).not.toHaveBeenCalled()
  })
})

describe('generation-log ownership + reservation (Priority 3)', () => {
  it('reserves credits atomically and binds the log to the creator', async () => {
    reserveCredits.mockResolvedValue({ ok: true, balance: 95 })
    generationLogCreate.mockResolvedValue({ id: 'log-1' })

    const res = await postLog(validBody, { 'x-test-user': 'user-1' })
    expect(res.status).toBe(201)

    expect(reserveCredits).toHaveBeenCalledWith(5, 'user-1')
    const createArg = generationLogCreate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(createArg.data.userId).toBe('user-1')
    expect(createArg.data.organisationId).toBe('org-1')
    expect(createArg.data.creditsDeducted).toBe(true)
  })

  it('returns 402 (and creates no log) when reservation fails', async () => {
    reserveCredits.mockResolvedValue({ ok: false, balance: 1 })
    const res = await postLog(validBody, { 'x-test-user': 'user-1' })
    expect(res.status).toBe(402)
    expect(generationLogCreate).not.toHaveBeenCalled()
  })

  it('forbids finalising another user\'s log (403)', async () => {
    generationLogFindUnique.mockResolvedValue({
      id: 'log-1',
      userId: 'owner',
      estimatedCredits: 5,
      creditsDeducted: true,
    })
    const res = await fetch(`${baseUrl}/api/generation-log/log-1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-test-user': 'attacker' },
      body: JSON.stringify({ status: 'failed' }),
    })
    expect(res.status).toBe(403)
    expect(refundCredits).not.toHaveBeenCalled()
    expect(generationLogUpdate).not.toHaveBeenCalled()
  })

  it('refunds the owner when their own generation fails', async () => {
    generationLogFindUnique.mockResolvedValue({
      id: 'log-1',
      userId: 'user-1',
      estimatedCredits: 5,
      creditsDeducted: true,
      provider: null,
      model: null,
    })
    refundCredits.mockResolvedValue(100)
    generationLogUpdate.mockResolvedValue({ id: 'log-1', status: 'failed' })

    const res = await fetch(`${baseUrl}/api/generation-log/log-1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
      body: JSON.stringify({ status: 'failed' }),
    })
    expect(res.status).toBe(200)
    expect(refundCredits).toHaveBeenCalledWith(5, 'user-1')
    const body = (await res.json()) as { balance: number }
    expect(body.balance).toBe(100)
  })
})

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Route-level tests for the account lifecycle endpoints.
 *
 * The lifecycle service, Supabase admin client, and GoTrue password-grant call
 * are replaced with fakes so the Express handlers run end-to-end without a live
 * DB/Stripe/Auth. We assert the security-critical behaviours: auth is required,
 * the org-ownership BLOCK surfaces as 409, the DELETE flow re-verifies the
 * literal token AND the password server-side (never trusting the client), and
 * the cron sweep is gated by the shared secret.
 */

const lifecycle = vi.hoisted(() => ({
  getLifecycleStatus: vi.fn(),
  unsubscribe: vi.fn(),
  reactivate: vi.fn(),
  requestDelete: vi.fn(),
  cancelDelete: vi.fn(),
  runDuePurges: vi.fn(),
}))

vi.mock('../services/accountLifecycle', () => lifecycle)

vi.mock('../services/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({ data: { user: { email: 'user@example.com' } }, error: null }),
      },
    },
  }),
}))

// Fake the GoTrue password grant: succeeds only when password === 'correct'.
vi.mock('../utils/httpTimeout', () => ({
  fetchWithTimeout: (_url: string, init: { body?: string }) => {
    let password = ''
    try {
      password = JSON.parse(init.body ?? '{}').password
    } catch {
      /* ignore */
    }
    return Promise.resolve({ ok: password === 'correct' })
  },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'anon-key'
  process.env.ACCOUNT_CRON_SECRET = 'top-secret'

  const { accountRouter } = await import('./account')
  const app = express()
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/account', accountRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

async function post(path: string, body: unknown, opts: { user?: string; cronSecret?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.user) headers['x-test-user'] = opts.user
  if (opts.cronSecret !== undefined) headers['x-cron-secret'] = opts.cronSecret
  return fetch(`${baseUrl}/api/account${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('GET /api/account/lifecycle', () => {
  it('requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/account/lifecycle`)
    expect(res.status).toBe(401)
    expect(lifecycle.getLifecycleStatus).not.toHaveBeenCalled()
  })

  it('returns the lifecycle status for an authenticated user', async () => {
    lifecycle.getLifecycleStatus.mockResolvedValue({ accountStatus: 'active' })
    const res = await fetch(`${baseUrl}/api/account/lifecycle`, {
      headers: { 'x-test-user': 'user-1' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ accountStatus: 'active' })
    expect(lifecycle.getLifecycleStatus).toHaveBeenCalledWith('user-1')
  })
})

describe('POST /api/account/unsubscribe', () => {
  it('surfaces the org-ownership BLOCK as 409', async () => {
    lifecycle.unsubscribe.mockResolvedValue({
      ok: false,
      organisations: [{ id: 'org-1', name: 'Clinic' }],
    })
    const res = await post('/unsubscribe', {}, { user: 'user-1' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('org_block')
    expect(body.organisations).toEqual([{ id: 'org-1', name: 'Clinic' }])
  })

  it('returns the new status on success', async () => {
    lifecycle.unsubscribe.mockResolvedValue({ ok: true, status: { accountStatus: 'dormant' } })
    const res = await post('/unsubscribe', {}, { user: 'user-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ accountStatus: 'dormant' })
  })
})

describe('POST /api/account/delete', () => {
  it('rejects a wrong confirmation token before any password work', async () => {
    const res = await post('/delete', { confirmation: 'delete', password: 'correct' }, { user: 'user-1' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('confirmation_mismatch')
    expect(lifecycle.requestDelete).not.toHaveBeenCalled()
  })

  it('rejects a missing password', async () => {
    const res = await post('/delete', { confirmation: 'DELETE', password: '' }, { user: 'user-1' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('password_incorrect')
    expect(lifecycle.requestDelete).not.toHaveBeenCalled()
  })

  it('rejects an incorrect password with 403 and never requests deletion', async () => {
    const res = await post('/delete', { confirmation: 'DELETE', password: 'wrong' }, { user: 'user-1' })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('password_incorrect')
    expect(lifecycle.requestDelete).not.toHaveBeenCalled()
  })

  it('enters delete_pending when token and password are both valid', async () => {
    lifecycle.requestDelete.mockResolvedValue({ ok: true, status: { accountStatus: 'delete_pending' } })
    const res = await post('/delete', { confirmation: 'DELETE', password: 'correct' }, { user: 'user-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ accountStatus: 'delete_pending' })
    expect(lifecycle.requestDelete).toHaveBeenCalledWith('user-1')
  })

  it('surfaces the org-ownership BLOCK as 409 even after a valid password', async () => {
    lifecycle.requestDelete.mockResolvedValue({
      ok: false,
      organisations: [{ id: 'org-2', name: 'Group' }],
    })
    const res = await post('/delete', { confirmation: 'DELETE', password: 'correct' }, { user: 'user-1' })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('org_block')
  })
})

describe('POST /api/account/lifecycle/run-purges', () => {
  it('rejects a missing/incorrect cron secret', async () => {
    const res = await post('/lifecycle/run-purges', {}, { cronSecret: 'nope' })
    expect(res.status).toBe(401)
    expect(lifecycle.runDuePurges).not.toHaveBeenCalled()
  })

  it('runs the sweep with the correct cron secret', async () => {
    lifecycle.runDuePurges.mockResolvedValue({ claimed: 0, purged: 0 })
    const res = await post('/lifecycle/run-purges', {}, { cronSecret: 'top-secret' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ claimed: 0, purged: 0 })
    expect(lifecycle.runDuePurges).toHaveBeenCalledTimes(1)
  })
})

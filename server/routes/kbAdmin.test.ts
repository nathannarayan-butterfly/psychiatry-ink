import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { kbAdminRouter } from './kbAdmin'

/**
 * Gating coverage for the KB review console + KB write endpoints after the
 * KB-admin role was removed:
 *   - Destructive / global operations (publish, approve, archive, contribution
 *     review) require the platform **System Admin** (`SYSTEM_ADMIN_USER_IDS`).
 *   - Everyday KB write endpoints (drugs / preparations) are open to any
 *     authenticated user — there is no longer a KB-admin tier.
 *   - Identity comes ONLY from the server-verified `req.authUserId`; the old
 *     spoofable `x-kb-user-id` header is never trusted.
 */

const ENV_KEYS = [
  'SYSTEM_ADMIN_USER_IDS',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

let server: Server
let baseUrl: string

beforeAll(() => {
  const app = express()
  // Simulate an authenticated user (normally set by optionalAuth from a token).
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json())
  app.use('/api/kb-admin', kbAdminRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

function makeAuthConfigured() {
  process.env.SUPABASE_URL = 'https://testproj.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_testanonkey'
}

async function postMutation(headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/kb-admin/substances/abc/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  })
}

describe('KB review console gating (System Admin)', () => {
  it('exposes /status unauthenticated (no env-flag hiding) and reports config', async () => {
    const res = await fetch(`${baseUrl}/api/kb-admin/status`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { enabled: boolean; supabaseConfigured: boolean }
    expect(body.enabled).toBe(true)
    expect(body.supabaseConfigured).toBe(false)
  })

  it('returns 401 for destructive ops when the request is unauthenticated', async () => {
    // Pin a non-empty allowlist so the dev "empty allowlist allows" fallback
    // does not mask the authentication gate.
    process.env.SYSTEM_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await postMutation()
    expect(res.status).toBe(401)
  })

  it('returns 403 when an authenticated user is not the System Admin', async () => {
    process.env.SYSTEM_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await postMutation({ 'x-test-user': 'random-user' })
    expect(res.status).toBe(403)
  })

  it('System Admin passes role gating and reaches the 503 config gate', async () => {
    process.env.SYSTEM_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    // SUPABASE_SERVICE_ROLE_KEY intentionally unset -> isKbAdminConfigured() false.
    const res = await postMutation({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(503)
  })

  it('ignores the legacy spoofable x-kb-user-id header for identity', async () => {
    process.env.SYSTEM_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    // No verified req.authUserId; only the spoofable header claims to be admin.
    const res = await postMutation({ 'x-kb-user-id': 'admin-1' })
    expect(res.status).toBe(401)
  })
})

async function postDrugs(headers: Record<string, string> = {}, body: unknown = { drugs: [] }) {
  return fetch(`${baseUrl}/api/kb-admin/drugs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function postPreparations(
  headers: Record<string, string> = {},
  body: unknown = { preparations: [] },
) {
  return fetch(`${baseUrl}/api/kb-admin/preparations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/**
 * The KB write endpoints (drugs / preparations) back the everyday clinician KB
 * editing UI. They are open to any authenticated user (no KB-admin tier), but
 * still require a verified identity because they perform service-role writes
 * that stand in for the direct browser writes the secure RLS blocks.
 */
describe('KB write endpoints (open to any authenticated user)', () => {
  it('rejects unauthenticated writes with 401', async () => {
    makeAuthConfigured()
    const drugRes = await postDrugs()
    const prepRes = await postPreparations()
    expect(drugRes.status).toBe(401)
    expect(prepRes.status).toBe(401)
  })

  it('allows any authenticated user past the auth gate (503 when service role unset)', async () => {
    makeAuthConfigured()
    // No SYSTEM_ADMIN_USER_IDS and a non-admin user: still allowed to write.
    const drugRes = await postDrugs({ 'x-test-user': 'random-user' }, { drugs: [{ id: 'd1' }] })
    expect(drugRes.status).toBe(503)
  })

  it('validates the body for authenticated users (400 on malformed payload)', async () => {
    makeAuthConfigured()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_testkey'
    const missingArray = await postDrugs({ 'x-test-user': 'random-user' }, { drugs: 'nope' })
    const missingId = await postDrugs({ 'x-test-user': 'random-user' }, { drugs: [{ generic: 'x' }] })
    const prepMissingId = await postPreparations(
      { 'x-test-user': 'random-user' },
      { preparations: [{ tradeName: 'x' }] },
    )
    expect(missingArray.status).toBe(400)
    expect(missingId.status).toBe(400)
    expect(prepMissingId.status).toBe(400)
  })

  it('rejects unauthenticated deletes with 401', async () => {
    makeAuthConfigured()
    const res = await fetch(`${baseUrl}/api/kb-admin/drugs/some-id`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })
})

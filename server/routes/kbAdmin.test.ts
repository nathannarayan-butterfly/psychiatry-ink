import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { kbAdminRouter } from './kbAdmin'

/**
 * Integration coverage for P0-2: KB Admin API must be secure-by-default.
 * Verifies env-flag gating (404), authentication (401) and role gating (403)
 * without requiring a live Supabase backend.
 */

const ENV_KEYS = [
  'ENABLE_KB_ADMIN_API',
  'KB_ADMIN_API_ENABLED',
  'KB_ADMIN_USER_IDS',
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

describe('KB Admin API gating (P0-2)', () => {
  it('returns 404 when the API is disabled by default', async () => {
    const res = await postMutation({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(404)
  })

  it('returns 404 even for read routes when disabled', async () => {
    const res = await fetch(`${baseUrl}/api/kb-admin/substances`)
    expect(res.status).toBe(404)
  })

  it('returns 404 for /status when disabled — does not leak existence (P1-5)', async () => {
    const res = await fetch(`${baseUrl}/api/kb-admin/status`)
    expect(res.status).toBe(404)
  })

  it('returns 200 for /status when explicitly enabled', async () => {
    process.env.ENABLE_KB_ADMIN_API = 'true'
    const res = await fetch(`${baseUrl}/api/kb-admin/status`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { enabled: boolean }
    expect(body.enabled).toBe(true)
  })

  it('legacy KB_ADMIN_API_ENABLED=true alias still enables the API', async () => {
    process.env.KB_ADMIN_API_ENABLED = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    // Authenticated but NOT on the allowlist -> 403 proves the API is enabled
    // (a disabled API would have returned 404).
    const res = await postMutation({ 'x-test-user': 'random-user' })
    expect(res.status).toBe(403)
  })

  it('explicit ENABLE_KB_ADMIN_API=false overrides legacy enable -> 404', async () => {
    process.env.ENABLE_KB_ADMIN_API = 'false'
    process.env.KB_ADMIN_API_ENABLED = 'true'
    const res = await postMutation({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(404)
  })

  it('returns 401 when enabled but request is unauthenticated', async () => {
    process.env.ENABLE_KB_ADMIN_API = 'true'
    makeAuthConfigured()
    const res = await postMutation()
    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated user lacks an admin role', async () => {
    process.env.ENABLE_KB_ADMIN_API = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await postMutation({ 'x-test-user': 'non-admin-user' })
    expect(res.status).toBe(403)
  })

  it('admin role + env enablement passes gating (reaches 503 config gate, not 4xx)', async () => {
    process.env.ENABLE_KB_ADMIN_API = 'true'
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    // SUPABASE_SERVICE_ROLE_KEY intentionally unset -> isKbAdminConfigured() false.
    const res = await postMutation({ 'x-test-user': 'admin-1' })
    expect(res.status).toBe(503)
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
 * Coverage for the legacy JSONB KB write endpoints that replace direct browser
 * writes the secure RLS now blocks. These are gated by KB-editor permission but
 * NOT by the `ENABLE_KB_ADMIN_API` console flag, so they must enforce auth even
 * when that flag is unset.
 */
describe('KB legacy JSONB write endpoints (RLS reroute)', () => {
  it('is reachable without ENABLE_KB_ADMIN_API (401, not 404) when unauthenticated', async () => {
    makeAuthConfigured()
    const drugRes = await postDrugs()
    const prepRes = await postPreparations()
    expect(drugRes.status).toBe(401)
    expect(prepRes.status).toBe(401)
  })

  it('rejects authenticated non-editors with 403', async () => {
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const drugRes = await postDrugs({ 'x-test-user': 'random-user' })
    const prepRes = await postPreparations({ 'x-test-user': 'random-user' })
    expect(drugRes.status).toBe(403)
    expect(prepRes.status).toBe(403)
  })

  it('returns 503 for KB editors when the service-role key is not configured', async () => {
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    // SUPABASE_SERVICE_ROLE_KEY intentionally unset.
    const drugRes = await postDrugs({ 'x-test-user': 'admin-1' }, { drugs: [{ id: 'd1' }] })
    expect(drugRes.status).toBe(503)
  })

  it('validates the body for authorized KB editors (400 on malformed payload)', async () => {
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_testkey'
    const missingArray = await postDrugs({ 'x-test-user': 'admin-1' }, { drugs: 'nope' })
    const missingId = await postDrugs({ 'x-test-user': 'admin-1' }, { drugs: [{ generic: 'x' }] })
    const prepMissingId = await postPreparations(
      { 'x-test-user': 'admin-1' },
      { preparations: [{ tradeName: 'x' }] },
    )
    expect(missingArray.status).toBe(400)
    expect(missingId.status).toBe(400)
    expect(prepMissingId.status).toBe(400)
  })

  it('rejects deletes from non-editors with 403', async () => {
    process.env.KB_ADMIN_USER_IDS = 'admin-1'
    makeAuthConfigured()
    const res = await fetch(`${baseUrl}/api/kb-admin/drugs/some-id`, {
      method: 'DELETE',
      headers: { 'x-test-user': 'random-user' },
    })
    expect(res.status).toBe(403)
  })
})

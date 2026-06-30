/**
 * Konsil sharing disabled — Design D interim mitigation.
 *
 * The Konsil module (`/api/consultation/*`) used to accept new consultation
 * requests where the client could pick `patient_identifier_mode = 'full'` and
 * thereby write plaintext patient names server-side. That conflicts with the
 * new identifier-vault model, so every mutating route now returns
 * `410 Gone` + `code: 'konsil_disabled'`. Read paths stay open so historical
 * consultations remain accessible.
 *
 * This test exercises the route module directly with a fake Express
 * request/response so the assertion is independent of Supabase configuration.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { consultationRouter } from '../routes/consultation'
import {
  KONSIL_DISABLED_CODE,
} from '../utils/konsilDisabled'

interface FakeRes {
  statusCode: number
  body: unknown
  status(code: number): FakeRes
  json(body: unknown): FakeRes
}

function createFakeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  return res
}

interface FakeReq {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
  query: Record<string, unknown>
  params: Record<string, string>
  ip?: string
}

function findRoute(method: string, path: string) {
  // express Router exposes its registered layers on .stack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (consultationRouter as unknown as { stack: any[] }).stack
  for (const layer of stack) {
    if (!layer.route) continue
    const route = layer.route
    const routePath = route.path
    const methods = route.methods as Record<string, boolean>
    if (!methods[method.toLowerCase()]) continue
    if (typeof routePath === 'string') {
      // express path-to-regexp; for our routes everything is static / single-param
      const regex = new RegExp(
        '^' + routePath.replace(/:[a-zA-Z]+/g, '([^/]+)').replace(/\//g, '\\/') + '$',
      )
      const match = path.match(regex)
      if (!match) continue
      const params: Record<string, string> = {}
      const paramNames = (routePath.match(/:[a-zA-Z]+/g) ?? []).map((segment) =>
        segment.slice(1),
      )
      for (let i = 0; i < paramNames.length; i += 1) {
        params[paramNames[i]] = decodeURIComponent(match[i + 1])
      }
      return { handler: layer.route.stack[0].handle, params }
    }
  }
  return null
}

async function callRoute(
  method: string,
  path: string,
  body: unknown = {},
  headers: Record<string, string> = {},
) {
  const found = findRoute(method, path)
  if (!found) throw new Error(`route not found: ${method} ${path}`)
  const req: FakeReq = {
    method,
    url: path,
    headers: {
      authorization: 'Bearer test',
      'x-user-id': 'user-1',
      ...headers,
    },
    body,
    query: {},
    params: found.params,
    ip: '127.0.0.1',
  }
  const res = createFakeRes()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (found.handler as any)(req as any, res as any, () => {})
  return res
}

describe('Konsil — sharing disabled (Design D interim)', () => {
  const prevEnv = process.env.ENABLE_KONSIL_SHARING

  beforeAll(() => {
    delete process.env.ENABLE_KONSIL_SHARING
  })

  afterAll(() => {
    if (prevEnv === undefined) delete process.env.ENABLE_KONSIL_SHARING
    else process.env.ENABLE_KONSIL_SHARING = prevEnv
  })

  const mutatingRoutes: Array<[string, string]> = [
    ['post', '/'],
    ['post', '/invites/accept'],
    ['post', '/abc-123/report/draft'],
    ['post', '/abc-123/report/submit'],
    ['post', '/abc-123/more-info'],
    ['post', '/abc-123/respond'],
    ['post', '/abc-123/reviewed'],
    ['post', '/abc-123/archive'],
    ['post', '/abc-123/revoke'],
  ]

  for (const [method, path] of mutatingRoutes) {
    it(`returns 410 Gone for ${method.toUpperCase()} ${path}`, async () => {
      const res = await callRoute(method, path)
      expect(res.statusCode).toBe(410)
      const body = res.body as { error?: string; code?: string }
      expect(body.code).toBe(KONSIL_DISABLED_CODE)
      expect(typeof body.error).toBe('string')
      expect((body.error ?? '').length).toBeGreaterThan(0)
    })
  }

  it('respects ENABLE_KONSIL_SHARING=true override (falls through to next handler)', async () => {
    process.env.ENABLE_KONSIL_SHARING = 'true'
    try {
      const res = await callRoute('post', '/', {
        caseId: 'case-1',
        specialty: 'Psychiatrie',
        title: 'x',
        clinicalQuestion: 'x',
      })
      // With the override on, the disable guard is skipped — the route then
      // reaches the auth/Supabase precondition checks and returns either 401
      // (no auth) or 503 (no Supabase). It must NOT return 410.
      expect(res.statusCode).not.toBe(410)
    } finally {
      delete process.env.ENABLE_KONSIL_SHARING
    }
  })
})

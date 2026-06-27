import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_LAST_UPDATED } from '../../shared/legalVersion'

/**
 * POST /api/account/legal-consent — durable Datenschutz/AGB consent recording.
 *
 * The Supabase admin client is replaced with an in-memory fake so the route +
 * repo run end-to-end (including the unique (user_id, terms_version)
 * idempotency) without a live database. We assert: auth is required, the first
 * call records, a repeat is an idempotent no-op, the version is pinned
 * server-side regardless of the request body, and the locale is normalized.
 */

const { store, getSupabaseAdmin } = vi.hoisted(() => {
  type Row = {
    id: string
    user_id: string
    privacy_version: string
    terms_version: string
    locale: string | null
  }
  const rows: Row[] = []

  function makeBuilder(table: string) {
    const filters: Record<string, unknown> = {}
    const builder = {
      select() {
        return builder
      },
      eq(column: string, value: unknown) {
        filters[column] = value
        return builder
      },
      maybeSingle() {
        if (table !== 'user_legal_acceptances') return Promise.resolve({ data: null, error: null })
        const found = rows.find(
          (r) => r.user_id === filters.user_id && r.terms_version === filters.terms_version,
        )
        return Promise.resolve({ data: found ? { id: found.id } : null, error: null })
      },
      upsert(values: Omit<Row, 'id'>) {
        const exists = rows.some(
          (r) => r.user_id === values.user_id && r.terms_version === values.terms_version,
        )
        if (!exists) rows.push({ id: `row-${rows.length + 1}`, ...values })
        return Promise.resolve({ error: null })
      },
    }
    return builder
  }

  return {
    store: rows,
    getSupabaseAdmin: () => ({ from: (table: string) => makeBuilder(table) }),
  }
})

vi.mock('../services/supabaseAdmin', () => ({ getSupabaseAdmin }))

let server: Server
let baseUrl: string

beforeAll(async () => {
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
  store.length = 0
})

async function postConsent(body: unknown, user?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (user) headers['x-test-user'] = user
  return fetch(`${baseUrl}/api/account/legal-consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/account/legal-consent', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await postConsent({ locale: 'de' })
    expect(res.status).toBe(401)
    expect(store.length).toBe(0)
  })

  it('records consent on first call and pins the version server-side', async () => {
    const res = await postConsent({ locale: 'de', termsVersion: 'attacker-supplied' }, 'user-1')
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; recorded: boolean; version: string }
    expect(data).toMatchObject({ ok: true, recorded: true, version: LEGAL_LAST_UPDATED })
    expect(store).toHaveLength(1)
    expect(store[0]).toMatchObject({
      user_id: 'user-1',
      privacy_version: LEGAL_LAST_UPDATED,
      terms_version: LEGAL_LAST_UPDATED,
      locale: 'de',
    })
  })

  it('is idempotent per (user_id, terms_version) on repeat calls', async () => {
    const first = await postConsent({ locale: 'de' }, 'user-1')
    expect((await first.json()).recorded).toBe(true)

    const second = await postConsent({ locale: 'en' }, 'user-1')
    expect(second.status).toBe(200)
    expect((await second.json()).recorded).toBe(false)

    // Still exactly one row, original locale preserved.
    expect(store).toHaveLength(1)
    expect(store[0].locale).toBe('de')
  })

  it('records independently per user', async () => {
    await postConsent({ locale: 'de' }, 'user-1')
    await postConsent({ locale: 'fr' }, 'user-2')
    expect(store).toHaveLength(2)
  })

  it('normalizes / drops invalid locale tokens', async () => {
    const res = await postConsent({ locale: 'not a locale!!' }, 'user-3')
    expect(res.status).toBe(200)
    expect(store[0].locale).toBeNull()
  })
})

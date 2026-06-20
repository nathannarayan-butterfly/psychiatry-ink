import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { pharmaAskRouter } from './pharmaAsk'

/**
 * P1-1 (round 2) — PHI egress guard on /api/pharma-ask.
 *
 * Pharma-Ask is a generic clinical-pharmacology Q&A surface. Patient context
 * should never reach the LLM provider. Tests run against the mock provider
 * (no API key) which echoes the assembled user prompt back as `answer`, so we
 * can directly inspect what reached the egress boundary.
 */

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'GOOGLE_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
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
  app.use(express.json({ limit: '5mb' }))
  app.use('/api/pharma-ask', pharmaAskRouter)
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

async function postAsk(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/pharma-ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('POST /api/pharma-ask — PHI egress guard', () => {
  it('scrubs patient name (via patientHints) / DOB / email from forwarded prompt', async () => {
    const res = await postAsk({
      language: 'de',
      medicationName: 'Sertralin',
      patientHints: { patientName: 'Erika Musterfrau', patientDob: '12.04.1978' },
      question:
        'Erika Musterfrau, geb. 12.04.1978, patient@example.com — verträglich?',
      sectionData: 'Patient: Erika Musterfrau, Tel 030-123 4567.',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string }
    expect(data.answer).not.toMatch(/Erika/)
    expect(data.answer).not.toMatch(/Musterfrau/)
    expect(data.answer).not.toContain('12.04.1978')
    expect(data.answer).not.toContain('patient@example.com')
    expect(data.answer).not.toContain('030-123 4567')
    expect(data.answer).toContain('[REDACTED]')
  })

  it('still redacts unconditional PHI (DOB / email / phone) when patientHints are missing', async () => {
    const res = await postAsk({
      language: 'de',
      medicationName: 'Sertralin',
      question: 'DOB 12.04.1978, patient@example.com, Tel 030-123 4567 — verträglich?',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string }
    expect(data.answer).not.toContain('12.04.1978')
    expect(data.answer).not.toContain('patient@example.com')
    expect(data.answer).not.toContain('030-123 4567')
  })

  it('redacts ISO and slash DOBs unconditionally even without patientHints', async () => {
    const res = await postAsk({
      language: 'de',
      medicationName: 'Quetiapin',
      question: 'DOB 1978-04-12, alternativ 12/04/1978 — Standarddosierung?',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string }
    expect(data.answer).not.toContain('1978-04-12')
    expect(data.answer).not.toContain('12/04/1978')
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/pharma-ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: 'de',
        medicationName: 'Sertralin',
        question: 'Halbwertszeit?',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await postAsk({ language: 'de', medicationName: 'Sertralin' })
    expect(res.status).toBe(400)
  })
})

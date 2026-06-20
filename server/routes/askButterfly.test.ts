import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { askButterflyRouter } from './askButterfly'

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
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
  app.use(express.json())
  app.use('/api/ask-butterfly', askButterflyRouter)
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

async function postChat(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/ask-butterfly`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ask-butterfly', () => {
  it('returns an assistant reply in mock mode', async () => {
    const res = await postChat({
      language: 'de',
      messages: [{ role: 'user', content: 'Was ist Sertralin?' }],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string; mock?: boolean; model: { provider: string } }
    expect(data.answer.length).toBeGreaterThan(0)
    expect(data.mock).toBe(true)
    expect(data.model.provider).toBeTruthy()
  })

  it('requires messages ending with a user turn', async () => {
    const res = await postChat({
      language: 'de',
      messages: [{ role: 'assistant', content: 'Hallo' }],
    })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/ask-butterfly`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: 'de',
        messages: [{ role: 'user', content: 'Hallo' }],
      }),
    })
    expect(res.status).toBe(401)
  })
})

/**
 * PHI egress guard — Beta hardening round 2.
 *
 * Ask Butterfly is a generic chat surface that the prompt template explicitly
 * tells the model has no access to patient records. We must therefore re-scrub
 * every clinician-supplied message server-side. The mock provider (no API key)
 * echoes the assembled user prompt back as `answer`, so we can directly
 * inspect what reached the LLM trust boundary.
 */
describe('POST /api/ask-butterfly — PHI egress guard', () => {
  it('scrubs patient name (via patientHints) / DOB / case codes / email from forwarded messages', async () => {
    const res = await postChat({
      language: 'de',
      patientHints: { patientName: 'Erika Musterfrau', patientDob: '12.04.1978' },
      messages: [
        {
          role: 'user',
          content:
            'Erika Musterfrau, geboren am 12.04.1978, Email patient@example.com. Fall AB-12345. Zusammenfassen?',
        },
      ],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string }
    // Mock provider echoes the (sanitized) user prompt — verify obvious PHI
    // never reached the egress boundary.
    expect(data.answer).not.toContain('Erika')
    expect(data.answer).not.toContain('Musterfrau')
    expect(data.answer).not.toContain('12.04.1978')
    expect(data.answer).not.toContain('patient@example.com')
    expect(data.answer).not.toContain('AB-12345')
    expect(data.answer).toContain('[REDACTED]')
  })

  it('still redacts unconditional PHI (DOB / email / case codes) when patientHints are missing', async () => {
    const res = await postChat({
      language: 'de',
      messages: [
        {
          role: 'user',
          content:
            'DOB 12.04.1978, Email patient@example.com, Fall AB-12345 — bitte einschätzen.',
        },
      ],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string }
    expect(data.answer).not.toContain('12.04.1978')
    expect(data.answer).not.toContain('patient@example.com')
    expect(data.answer).not.toContain('AB-12345')
    expect(data.answer).toContain('[REDACTED]')
  })

  it('scrubs DOB across DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY formats', async () => {
    const dobFormats = ['1978-04-12', '12/04/1978', '12-04-1978', '12.04.1978', '12.04.78']
    for (const dob of dobFormats) {
      const res = await postChat({
        language: 'de',
        messages: [{ role: 'user', content: `DOB ${dob} bitte interpretieren.` }],
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { answer: string }
      expect(data.answer, `format ${dob}`).not.toContain(dob)
    }
  })
})

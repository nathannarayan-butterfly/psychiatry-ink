import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyServerPhiGuard, generateRouter } from './generate'

/**
 * P1-1 — server-side PHI guard on /api/generate.
 *
 * Verifies that obvious identifiers (patient name, DOB, case codes / UUIDs,
 * dates, emails, phone) are stripped before the prompt reaches the LLM
 * provider. Runs against the no-API-key mock path of `callLlm`, which echoes
 * the (sanitized) user prompt back so we can assert directly on what the
 * provider would have seen.
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
  app.use(express.json({ limit: '25mb' }))
  app.use('/api/generate', generateRouter)
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

async function postGenerate(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('applyServerPhiGuard', () => {
  it('redacts DOB-context dates, case codes, phone and email', () => {
    const out = applyServerPhiGuard({
      systemPrompt: 'Reply concisely.',
      userPrompt:
        'Geboren am 12.04.1978, Telefon 030-123 4567, Mail patient@example.com, Versicherung XY-12345678.',
    })
    expect(out.userPrompt).not.toContain('12.04.1978')
    expect(out.userPrompt).not.toContain('patient@example.com')
    expect(out.userPrompt).not.toContain('030-123 4567')
    expect(out.userPrompt).not.toContain('XY-12345678')
    expect(out.userPrompt).toContain('[REDACTED]')
  })

  it('redacts the patient name when patientHints are provided', () => {
    const out = applyServerPhiGuard({
      systemPrompt: 'Patient: Erika Musterfrau.',
      userPrompt: 'Erika Musterfrau berichtet über Schlafstörungen.',
      patientHints: { patientName: 'Erika Musterfrau' },
    })
    expect(out.systemPrompt).not.toMatch(/Erika/)
    expect(out.systemPrompt).not.toMatch(/Musterfrau/)
    expect(out.userPrompt).not.toMatch(/Erika/)
    expect(out.userPrompt).not.toMatch(/Musterfrau/)
  })

  it('redacts DOB when patientHints.patientDob is provided', () => {
    const out = applyServerPhiGuard({
      systemPrompt: 'system',
      userPrompt: 'DOB: 1978-04-12 in record',
      patientHints: { patientDob: '1978-04-12' },
    })
    expect(out.userPrompt).not.toContain('1978-04-12')
  })

  it('redacts DEMO-* and UUID case identifiers from prompts', () => {
    const out = applyServerPhiGuard({
      systemPrompt: 'system',
      userPrompt:
        'Case DEMO-CASE-0001, also c1f2c4a0-1234-4abc-8def-0123456789ab in scope.',
    })
    expect(out.userPrompt).not.toContain('DEMO-CASE-0001')
    expect(out.userPrompt).not.toContain('c1f2c4a0-1234-4abc-8def-0123456789ab')
  })

  it('does not crash on empty prompts', () => {
    const out = applyServerPhiGuard({ systemPrompt: '', userPrompt: '' })
    expect(out.systemPrompt).toBe('')
    expect(out.userPrompt).toBe('')
  })
})

describe('POST /api/generate (mock provider)', () => {
  it('does NOT forward unsanitized PHI to the LLM provider', async () => {
    const res = await postGenerate({
      tier: 'fast',
      systemPrompt: 'Reply with a one-line summary.',
      userPrompt:
        'Erika Musterfrau, geboren am 12.04.1978, Email patient@example.com. Bitte zusammenfassen.',
      patientHints: { patientName: 'Erika Musterfrau', patientDob: '12.04.1978' },
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { text: string }
    // Mock provider echoes the (sanitized) user prompt.
    expect(data.text).not.toMatch(/Erika/)
    expect(data.text).not.toMatch(/Musterfrau/)
    expect(data.text).not.toContain('12.04.1978')
    expect(data.text).not.toContain('patient@example.com')
    expect(data.text).toContain('[REDACTED]')
  })

  it('does NOT forward DEMO-* case codes to the LLM provider', async () => {
    const res = await postGenerate({
      tier: 'fast',
      systemPrompt: 'Echo.',
      userPrompt: 'Case id DEMO-CASE-0001, please summarize.',
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { text: string }
    expect(data.text).not.toContain('DEMO-CASE-0001')
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tier: 'fast',
        systemPrompt: 's',
        userPrompt: 'u',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await postGenerate({ tier: 'fast', systemPrompt: 's' })
    expect(res.status).toBe(400)
  })

  it('redacts ISO / slash / hyphen DOB formats unconditionally (no patientHints)', async () => {
    for (const dob of ['1978-04-12', '12/04/1978', '12-04-1978', '12.04.78']) {
      const res = await postGenerate({
        tier: 'fast',
        systemPrompt: 'Echo.',
        userPrompt: `Geburtsdatum ${dob}, bitte kurz interpretieren.`,
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { text: string }
      expect(data.text, `format ${dob}`).not.toContain(dob)
    }
  })

  it('runs unconditional PHI detection even when patientHints are missing', async () => {
    const res = await postGenerate({
      tier: 'fast',
      systemPrompt: 'Echo.',
      userPrompt:
        'Patient kontaktierte uns über patient@example.com, Tel 030-123 4567, Fall AB-12345.',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { text: string }
    expect(data.text).not.toContain('patient@example.com')
    expect(data.text).not.toContain('030-123 4567')
    expect(data.text).not.toContain('AB-12345')
  })
})

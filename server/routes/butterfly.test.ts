import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { butterflyRouter } from './butterfly'

/**
 * Integration coverage for the Butterfly extraction route with the MOCK LLM
 * provider (no API key). Verifies the route batches the provided unresolved
 * criteria, returns per-criterion results, and marks them AI-suggested /
 * pending — never auto-accepted.
 */

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
  app.use('/api/butterfly', butterflyRouter)
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

const PACKAGE = {
  version: 1,
  builtAt: new Date().toISOString(),
  caseId: 'case-1',
  patientLabel: 'Patient',
  sections: [
    { key: 'anamnesis', id: 'aufnahme', label: 'Aufnahme', content: 'Trinkt täglich, berichtet starkes Verlangen.' },
  ],
  isDeidentified: true,
}

const CRITERIA = [
  { id: 'f10_2.craving', text: 'Starkes Verlangen, Alkohol zu konsumieren' },
  { id: 'f10_2.tolerance', text: 'Toleranzentwicklung' },
]

async function postExtract(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/butterfly/extract`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('POST /api/butterfly/extract', () => {
  it('returns per-criterion AI-suggested results (mock mode, not auto-accepted)', async () => {
    const res = await postExtract({
      caseId: 'case-1',
      disorderName: 'Alkoholabhängigkeit',
      criteria: CRITERIA,
      package: PACKAGE,
      language: 'de',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      results: Array<{ id: string; status: string; provenance: string; evidenceStrength: string }>
      mock: boolean
    }
    // One result per queried (unresolved) criterion — batched in a single call.
    expect(data.results).toHaveLength(CRITERIA.length)
    expect(data.results.map((r) => r.id).sort()).toEqual(['f10_2.craving', 'f10_2.tolerance'])
    for (const result of data.results) {
      expect(['met', 'not_met', 'unclear']).toContain(result.status)
      // Provenance proves results land as pending suggestions, never accepted facts.
      expect(result.provenance).toBe('pending_clinician_review')
      expect(result.evidenceStrength).toBe('inferred')
    }
    // No API key configured -> mock provider; results stay unclear (no auto-resolve).
    expect(data.mock).toBe(true)
    expect(data.results.every((r) => r.status === 'unclear')).toBe(true)
  })

  it('requires caseId, disorderName and criteria', async () => {
    const res = await postExtract({ caseId: 'case-1', language: 'de' })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/butterfly/extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caseId: 'case-1', disorderName: 'X', criteria: CRITERIA, package: PACKAGE, language: 'de' }),
    })
    expect(res.status).toBe(401)
  })
})

async function postInterview(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/butterfly/interview-questions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('POST /api/butterfly/interview-questions', () => {
  it('returns concrete interview questions per criterion (mock mode, deterministic)', async () => {
    const res = await postInterview({
      caseId: 'case-1',
      disorderId: 'alcohol_dependence',
      disorderName: 'Alkoholabhängigkeit',
      criteria: [
        { id: 'f10_2.craving', text: 'Starkes Verlangen, Alkohol zu konsumieren', citation: 'ICD-10 F10.2 (a)' },
        { id: 'f10_2.tolerance', text: 'Toleranzentwicklung' },
      ],
      language: 'de',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      mock: boolean
      results: Array<{ criterionId: string; questions: string[] }>
    }
    expect(data.mock).toBe(true)
    expect(data.results).toHaveLength(2)
    expect(data.results.map((r) => r.criterionId).sort()).toEqual(['f10_2.craving', 'f10_2.tolerance'])
    for (const result of data.results) {
      expect(result.questions.length).toBeGreaterThanOrEqual(1)
      expect(result.questions.length).toBeLessThanOrEqual(3)
    }
    // Patient-directed and grounded in the criterion text.
    expect(data.results[0].questions[0]).toContain('Starkes Verlangen, Alkohol zu konsumieren')
  })

  it('requires caseId, disorderName and criteria', async () => {
    const res = await postInterview({ caseId: 'case-1', language: 'de' })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/butterfly/interview-questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId: 'case-1',
        disorderName: 'X',
        criteria: [{ id: 'c1', text: 'Test' }],
        language: 'de',
      }),
    })
    expect(res.status).toBe(401)
  })
})

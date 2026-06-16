import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { inlineEditRouter } from './inlineEdit'

/**
 * Integration coverage for the inline AI edit route with the MOCK LLM provider
 * (no API key). Verifies the edit endpoint returns rewritten text and the
 * transcription endpoint degrades to mock mode (so dev/tests work offline).
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
  app.use(express.json({ limit: '25mb' }))
  app.use('/api/inline-edit', inlineEditRouter)
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

async function postEdit(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/inline-edit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

async function postTranscribe(body: unknown, user = 'user-1') {
  return fetch(`${baseUrl}/api/inline-edit/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': user },
    body: JSON.stringify(body),
  })
}

describe('POST /api/inline-edit', () => {
  it('returns rewritten text in mock mode (no API key)', async () => {
    const res = await postEdit({
      caseId: 'case-1',
      selectedText: 'Patient wirkt unruhig.',
      contextBefore: 'Erstkontakt.',
      contextAfter: 'Keine akute Eigengefährdung.',
      instruction: 'Formuliere das klinischer.',
      language: 'de',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { editedText: string; mock: boolean; disclaimer: string }
    expect(data.mock).toBe(true)
    expect(data.editedText.length).toBeGreaterThan(0)
    // The mock provider echoes the selection; the suffix is stripped server-side.
    expect(data.editedText).toContain('Patient wirkt unruhig.')
    expect(data.editedText).not.toContain('[AI draft')
    expect(data.disclaimer).toMatch(/prüfen/i)
  })

  it('requires selectedText and instruction', async () => {
    const missingInstruction = await postEdit({ selectedText: 'abc', language: 'de' })
    expect(missingInstruction.status).toBe(400)

    const missingSelection = await postEdit({ instruction: 'kürzen', language: 'de' })
    expect(missingSelection.status).toBe(400)
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/inline-edit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ selectedText: 'abc', instruction: 'kürzen', language: 'de' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/inline-edit/transcribe', () => {
  it('returns mock mode when no provider key is configured', async () => {
    const res = await postTranscribe({ caseId: 'case-1', audioBase64: 'AAAA', mimeType: 'audio/webm' })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { text: string; mock: boolean }
    expect(data.mock).toBe(true)
    expect(data.text).toBe('')
  })

  it('requires audioBase64', async () => {
    const res = await postTranscribe({ caseId: 'case-1' })
    expect(res.status).toBe(400)
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/inline-edit/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'AAAA' }),
    })
    expect(res.status).toBe(401)
  })
})

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

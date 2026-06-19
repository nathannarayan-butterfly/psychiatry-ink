import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import { documentImportMappingRouter } from './documentImportMapping'

let server: Server
let baseUrl = ''

beforeAll(() => {
  const app = express()
  app.use(express.json())
  app.use('/api/document-import', documentImportMappingRouter)
  server = app.listen(0)
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server?.close()
})

afterEach(() => {
  delete process.env.ENABLE_DOCUMENT_IMPORT_AI
  delete process.env.OPENAI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
})

async function post(body: unknown) {
  return fetch(`${baseUrl}/api/document-import/suggest-mapping`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/document-import/suggest-mapping', () => {
  it('returns 404 when the flag is disabled (default)', async () => {
    const res = await post({ language: 'de', items: [{ candidateId: 'c1', deidentifiedText: 'x', currentModule: 'document' }] })
    expect(res.status).toBe(404)
  })

  it('returns deterministic mock suggestions when enabled without API keys', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    const res = await post({
      language: 'de',
      items: [
        { candidateId: 'c1', deidentifiedText: 'F32.1 Depression', currentModule: 'document' },
        { candidateId: 'c2', deidentifiedText: 'Sertralin', currentModule: 'medication' },
      ],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { mock?: boolean; suggestions: { candidateId: string; suggestedModule: string }[] }
    expect(data.mock).toBe(true)
    expect(data.suggestions).toHaveLength(2)
    expect(data.suggestions[0]).toMatchObject({ candidateId: 'c1', suggestedModule: 'document' })
  })

  it('rejects malformed requests with 400', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    const res = await post({ items: [] })
    expect(res.status).toBe(400)
  })
})

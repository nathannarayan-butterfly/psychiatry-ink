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

async function postMapping(body: unknown) {
  return fetch(`${baseUrl}/api/document-import/suggest-mapping`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function postAnalyze(body: unknown) {
  return fetch(`${baseUrl}/api/document-import/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/document-import/suggest-mapping', () => {
  it('returns 404 when the flag is disabled (default)', async () => {
    const res = await postMapping({ language: 'de', items: [{ candidateId: 'c1', deidentifiedText: 'x', currentModule: 'document' }] })
    expect(res.status).toBe(404)
  })

  it('returns deterministic mock suggestions when enabled without API keys', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    const res = await postMapping({
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
    const res = await postMapping({ items: [] })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/document-import/analyze', () => {
  it('returns 404 when the flag is disabled (default)', async () => {
    const res = await postAnalyze({
      language: 'de',
      metadata: {
        detectedFormat: 'docx',
        parsingMode: 'structured',
        moduleCounts: { medication: 1 },
        noticeCodes: [],
        candidates: [],
      },
      mappingItems: [],
    })
    expect(res.status).toBe(404)
  })

  it('returns mock mapping + overview suggestions when enabled without API keys', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    const res = await postAnalyze({
      language: 'de',
      metadata: {
        detectedFormat: 'csv',
        parsingMode: 'structured',
        moduleCounts: { medication: 2, therapy: 1, risk: 1 },
        noticeCodes: ['mapping_uncertain'],
        candidates: [
          {
            candidateId: 'c1',
            module: 'document',
            confidence: 'low',
            structuralHint: 'Abschnitt: Medikation',
            needsMappingAssist: true,
          },
        ],
      },
      mappingItems: [
        { candidateId: 'c1', deidentifiedText: 'Abschnitt: Medikation', currentModule: 'document' },
      ],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      mock?: boolean
      mappingSuggestions: { suggestedModule: string }[]
      overviewWidgetSuggestions: { widget: string }[]
      patientSubheading?: string
    }
    expect(data.mock).toBe(true)
    expect(data.mappingSuggestions[0]?.suggestedModule).toBe('medication')
    expect(data.overviewWidgetSuggestions.some((s) => s.widget === 'compliance')).toBe(true)
    expect(data.overviewWidgetSuggestions.some((s) => s.widget === 'angemeldete-therapien')).toBe(true)
    expect(data.patientSubheading).toMatch(/Mock:/)
  })
})

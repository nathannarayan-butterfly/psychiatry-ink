import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'

vi.mock('../services/llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

import { callLlm } from '../services/llmProvider'
import { documentImportMappingRouter } from './documentImportMapping'

const mockedCallLlm = vi.mocked(callLlm)

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
  mockedCallLlm.mockReset()
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

/**
 * P1-1 (round 2) — server-side re-scrub of client-asserted `deidentifiedText`.
 *
 * The client claims it has scrubbed the import payload, but we never trust
 * that. The server re-runs the authoritative PHI scrubber and also asserts
 * fail-closed via the central guard before forwarding to the LLM. The LLM
 * provider call is mocked here so we can directly capture and assert the
 * sanitized payload.
 */
describe('POST /api/document-import — server re-scrubs client deidentifiedText', () => {
  it('redacts patient name / DOB / email even when the client called the field "deidentifiedText"', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ suggestions: [] }),
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: {
        inputTokens: 10,
        cachedInputTokens: 0,
        cacheMissInputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        audioMinutes: null,
        usageSource: 'provider_reported',
        rawUsageJson: null,
      },
      requestId: 'req-test',
      latencyMs: 1,
      truncated: false,
    })

    const res = await postMapping({
      language: 'de',
      patientHints: { patientName: 'Erika Musterfrau', patientDob: '12.04.1978' },
      items: [
        {
          candidateId: 'c1',
          // Client lies: this STILL contains PHI, we must scrub server-side.
          deidentifiedText:
            'Erika Musterfrau, geb. 12.04.1978, Tel 030-123 4567, Mail patient@example.com.',
          currentModule: 'document',
        },
      ],
    })

    expect(res.status).toBe(200)
    expect(mockedCallLlm).toHaveBeenCalledTimes(1)
    const args = mockedCallLlm.mock.calls[0]![0]!
    expect(args.userPrompt).not.toMatch(/Erika/)
    expect(args.userPrompt).not.toMatch(/Musterfrau/)
    expect(args.userPrompt).not.toContain('12.04.1978')
    expect(args.userPrompt).not.toContain('030-123 4567')
    expect(args.userPrompt).not.toContain('patient@example.com')
    expect(args.userPrompt).toContain('[REDACTED]')
  })

  it('still redacts unconditional PHI (DOB / email / phone) without patientHints', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ suggestions: [] }),
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: {
        inputTokens: 10,
        cachedInputTokens: 0,
        cacheMissInputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        audioMinutes: null,
        usageSource: 'provider_reported',
        rawUsageJson: null,
      },
      requestId: 'req-test',
      latencyMs: 1,
      truncated: false,
    })

    const res = await postMapping({
      language: 'de',
      items: [
        {
          candidateId: 'c1',
          deidentifiedText: 'DOB 12.04.1978, Tel 030-123 4567, Mail patient@example.com.',
          currentModule: 'document',
        },
      ],
    })
    expect(res.status).toBe(200)
    const args = mockedCallLlm.mock.calls[0]![0]!
    expect(args.userPrompt).not.toContain('12.04.1978')
    expect(args.userPrompt).not.toContain('030-123 4567')
    expect(args.userPrompt).not.toContain('patient@example.com')
    expect(args.userPrompt).toContain('[REDACTED]')
  })

  it('re-scrubs deidentifiedText in /analyze too', async () => {
    process.env.ENABLE_DOCUMENT_IMPORT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ mappingSuggestions: [], overviewWidgetSuggestions: [] }),
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: {
        inputTokens: 10,
        cachedInputTokens: 0,
        cacheMissInputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        audioMinutes: null,
        usageSource: 'provider_reported',
        rawUsageJson: null,
      },
      requestId: 'req-test',
      latencyMs: 1,
      truncated: false,
    })

    const res = await postAnalyze({
      language: 'de',
      metadata: {
        detectedFormat: 'docx',
        parsingMode: 'structured',
        moduleCounts: { medication: 1 },
        noticeCodes: [],
        candidates: [],
      },
      mappingItems: [
        {
          candidateId: 'c1',
          deidentifiedText: 'DOB 1978-04-12 patient@example.com',
          currentModule: 'document',
        },
      ],
    })
    expect(res.status).toBe(200)
    const args = mockedCallLlm.mock.calls[0]![0]!
    expect(args.userPrompt).not.toContain('1978-04-12')
    expect(args.userPrompt).not.toContain('patient@example.com')
  })
})

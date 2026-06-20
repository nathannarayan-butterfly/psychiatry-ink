import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'

vi.mock('../services/llmProvider', () => ({
  callLlm: vi.fn(),
  llmResultModel: vi.fn(),
}))

import { callLlm } from '../services/llmProvider'
import { psychopathExtractRouter } from './psychopathExtract'

const mockedCallLlm = vi.mocked(callLlm)

let server: Server
let baseUrl = ''

beforeAll(() => {
  const app = express()
  app.use(express.json())
  app.use('/api/psychopath', psychopathExtractRouter)
  server = app.listen(0)
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server?.close()
})

afterEach(() => {
  delete process.env.ENABLE_PSYCHOPATH_EXTRACT_AI
  delete process.env.OPENAI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  mockedCallLlm.mockReset()
})

async function postExtract(body: unknown) {
  return fetch(`${baseUrl}/api/psychopath/extract`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const SAMPLE_PPB =
  'Bewusstsein: wach, allseits orientiert. Affekt: gedrückt, Antrieb: reduziert. ' +
  'Denkinhalt: unauffällig. Keine Suizidalität.'

describe('POST /api/psychopath/extract', () => {
  it('returns 404 when the flag is disabled (default)', async () => {
    const res = await postExtract({
      language: 'de',
      deidentifiedText: SAMPLE_PPB,
      sourceTextHash: 'abc123',
    })
    expect(res.status).toBe(404)
    const data = (await res.json()) as { error?: string }
    expect(data.error).toMatch(/ENABLE_PSYCHOPATH_EXTRACT_AI/)
  })

  it('returns deterministic mock extraction when enabled without API keys', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    const res = await postExtract({
      language: 'de',
      deidentifiedText: SAMPLE_PPB,
      sourceTextHash: 'abc123',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      mock?: boolean
      domains?: Array<{ domainKey: string; status: string; detail?: string | null }>
      fields: Record<string, string | null>
      courseDirection?: string | null
    }
    expect(data.mock).toBe(true)
    expect(data.domains?.find((d) => d.domainKey === 'consciousness')?.status).toBe('positive')
    expect(data.domains?.find((d) => d.domainKey === 'affect')?.detail).toMatch(/gedrückt/i)
    expect(data.domains?.find((d) => d.domainKey === 'drive')?.detail).toMatch(/reduziert/i)
    expect(data.domains?.find((d) => d.domainKey === 'suicidality')?.status).toBe('negative')

    for (const domain of data.domains ?? []) {
      if (domain.status !== 'positive' && domain.status !== 'unclear') continue
      const detail = domain.detail?.trim() ?? ''
      expect(detail.length).toBeGreaterThanOrEqual(3)
      expect(['Gedanken', 'Antrieb', 'Suizidale', 'Kontakt', 'Krankheitseinsicht']).not.toContain(detail)
    }
  })

  it('does not emit label-echo positives for AMDP template wording', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    const templatePpb =
      'Formales Denken gedämpft. Antrieb reduziert. Keine Suizidalität. ' +
      'Sozialverhalten zurückgezogen. Krankheitseinsicht vermindert.'
    const res = await postExtract({
      language: 'de',
      deidentifiedText: templatePpb,
      sourceTextHash: 'template1234',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      domains?: Array<{ domainKey: string; status: string; detail?: string | null }>
    }
    const positives = (data.domains ?? []).filter((d) => d.status === 'positive')
    expect(positives.find((d) => d.domainKey === 'thoughtForm')?.detail).toMatch(/gedämpft/i)
    expect(positives.find((d) => d.domainKey === 'drive')?.detail).toMatch(/reduziert/i)
    expect(positives.find((d) => d.domainKey === 'suicidality')).toBeUndefined()
    expect(positives.every((d) => !/^(Gedanken|Antrieb|Suizidale|Kontakt|Krankheitseinsicht)$/i.test(d.detail ?? ''))).toBe(
      true,
    )
  })

  it('handles realistic admission PPB without false suicidality positives', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    const realisticPpb =
      'Der Patient präsentierte sich in leicht ungepflegtem Erscheinungsbild, distanziert im Kontakt. ' +
      'Deutschkenntnisse ausreichend für die Exploration. Formales Denken gedämpft, Antrieb reduziert. ' +
      'Keine Suizidalität. Krankheitseinsicht vermindert.'
    const res = await postExtract({
      language: 'de',
      deidentifiedText: realisticPpb,
      sourceTextHash: 'realisticppb1',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      domains?: Array<{ domainKey: string; status: string; detail?: string | null }>
    }
    expect(data.domains?.find((d) => d.domainKey === 'suicidality')?.status).toBe('negative')
    expect(data.domains?.find((d) => d.domainKey === 'socialInteraction')?.detail ?? '').toMatch(
      /zurückgezogen|distanziert/i,
    )
    const positives = (data.domains ?? []).filter((d) => d.status === 'positive')
    expect(positives.some((d) => d.domainKey === 'suicidality')).toBe(false)
    expect(positives.every((d) => !/^(Suizidale|Suizidalität)$/i.test(d.detail ?? ''))).toBe(true)
  })

  it('rejects malformed requests with 400', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    const res = await postExtract({ language: 'de', deidentifiedText: 'short' })
    expect(res.status).toBe(400)
  })

  it('falls back to heuristic extraction when the LLM call fails', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    process.env.DEEPSEEK_API_KEY = 'test-key'
    mockedCallLlm.mockRejectedValue(new Error('LLM request failed (401) for deepseek-v4-flash'))

    const res = await postExtract({
      language: 'de',
      deidentifiedText: SAMPLE_PPB,
      sourceTextHash: 'abc123',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      mock?: boolean
      warning?: string
      domains?: Array<{ domainKey: string; status: string; detail?: string | null }>
    }
    expect(data.mock).toBe(true)
    expect(data.warning).toMatch(/heuristische Extraktion/i)
    expect(data.domains?.find((d) => d.domainKey === 'affect')?.detail).toMatch(/gedrückt/i)
    expect(mockedCallLlm).toHaveBeenCalledOnce()
  })

  it('returns structured domains from a successful LLM response', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({
        domains: [
          { domainKey: 'consciousness', status: 'positive', detail: 'wach' },
          { domainKey: 'orientation', status: 'positive', detail: 'allseits orientiert' },
          { domainKey: 'affect', status: 'positive', detail: 'gedrückt' },
          { domainKey: 'drive', status: 'positive', detail: 'reduziert' },
          { domainKey: 'suicidality', status: 'negative', detail: null },
        ],
        courseDirection: 'stable',
        confidence: 'high',
      }),
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: {
        inputTokens: 100,
        cachedInputTokens: 0,
        cacheMissInputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        audioMinutes: null,
        usageSource: 'provider_reported',
        rawUsageJson: null,
      },
      requestId: 'req-test',
      latencyMs: 120,
      truncated: false,
    })

    const res = await postExtract({
      language: 'de',
      deidentifiedText: SAMPLE_PPB,
      sourceTextHash: 'abc123',
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      mock?: boolean
      warning?: string
      domains?: Array<{ domainKey: string; status: string; detail?: string | null }>
      confidence?: string
    }
    expect(data.mock).toBeUndefined()
    expect(data.warning).toBeUndefined()
    expect(data.confidence).toBe('high')
    expect(data.domains?.find((d) => d.domainKey === 'affect')?.detail).toBe('gedrückt')
    expect(data.domains?.find((d) => d.domainKey === 'suicidality')?.status).toBe('negative')
    expect(mockedCallLlm).toHaveBeenCalledOnce()
  })
})

/**
 * P1-1 (round 2) — server-side re-scrub of client-asserted deidentifiedText.
 *
 * The client claims the text is scrubbed. We never trust that. The server
 * re-runs the authoritative PHI scrubber and the central egress guard before
 * any LLM call. The provider call is mocked so we directly inspect the
 * sanitized payload.
 */
describe('POST /api/psychopath/extract — server re-scrubs client deidentifiedText', () => {
  it('redacts patient name / DOB / email / phone from forwarded prompt', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ domains: [], courseDirection: null, confidence: 'low' }),
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

    const dirtyText =
      'Patient: Erika Musterfrau, geb. 12.04.1978, Tel 030-123 4567, ' +
      'Mail patient@example.com. ' +
      SAMPLE_PPB
    const res = await postExtract({
      language: 'de',
      deidentifiedText: dirtyText,
      sourceTextHash: 'dirty1',
      patientHints: { patientName: 'Erika Musterfrau', patientDob: '12.04.1978' },
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
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ domains: [], courseDirection: null, confidence: 'low' }),
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

    const dirtyText =
      'DOB 12.04.1978, Tel 030-123 4567, Mail patient@example.com. ' + SAMPLE_PPB
    const res = await postExtract({
      language: 'de',
      deidentifiedText: dirtyText,
      sourceTextHash: 'unconditional1',
    })
    expect(res.status).toBe(200)
    const args = mockedCallLlm.mock.calls[0]![0]!
    expect(args.userPrompt).not.toContain('12.04.1978')
    expect(args.userPrompt).not.toContain('030-123 4567')
    expect(args.userPrompt).not.toContain('patient@example.com')
    expect(args.userPrompt).toContain('[REDACTED]')
  })

  it('redacts ISO and slash DOB formats unconditionally', async () => {
    process.env.ENABLE_PSYCHOPATH_EXTRACT_AI = 'true'
    process.env.OPENAI_API_KEY = 'test-key'
    mockedCallLlm.mockResolvedValue({
      text: JSON.stringify({ domains: [], courseDirection: null, confidence: 'low' }),
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

    const res = await postExtract({
      language: 'de',
      deidentifiedText: `DOB 1978-04-12 / 12/04/1978 / 12-04-1978 / 12.04.1978. ${SAMPLE_PPB}`,
      sourceTextHash: 'iso1',
    })
    expect(res.status).toBe(200)
    const args = mockedCallLlm.mock.calls[0]![0]!
    expect(args.userPrompt).not.toContain('1978-04-12')
    expect(args.userPrompt).not.toContain('12/04/1978')
    expect(args.userPrompt).not.toContain('12-04-1978')
    expect(args.userPrompt).not.toContain('12.04.1978')
  })
})

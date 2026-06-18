import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { icdTitleRouter } from './icdTitle'
import { clearIcdTitleCache } from '../services/icdTitleCache'

vi.mock('../services/whoIcdClient', () => ({
  fetchWhoIcdTitle: vi.fn(),
}))

vi.mock('../db', () => ({
  prisma: {
    diagnosisCode: {
      findFirst: vi.fn(),
    },
  },
}))

import { fetchWhoIcdTitle } from '../services/whoIcdClient'
import { prisma } from '../db'

let server: Server
let baseUrl: string

beforeAll(() => {
  const app = express()
  app.use(express.json())
  app.use('/api/icd', icdTitleRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  clearIcdTitleCache()
  vi.mocked(fetchWhoIcdTitle).mockReset()
  vi.mocked(prisma.diagnosisCode.findFirst).mockReset()
})

describe('GET /api/icd/title', () => {
  it('returns WHO title when lookup succeeds', async () => {
    vi.mocked(fetchWhoIcdTitle).mockResolvedValue(
      'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom',
    )

    const res = await fetch(`${baseUrl}/api/icd/title?code=F12.2&version=icd10&language=de`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string; source: string; code: string }
    expect(body.code).toBe('F12.2')
    expect(body.title).toContain('Abhängigkeitssyndrom')
    expect(body.source).toBe('who')
  })

  it('falls back to crosswalk title when WHO lookup is empty', async () => {
    vi.mocked(fetchWhoIcdTitle).mockResolvedValue(null)
    vi.mocked(prisma.diagnosisCode.findFirst).mockResolvedValue({
      system: 'icd10',
      code: 'F12.2',
      labelDe: 'Abhängigkeitssyndrom bei Cannabinoiden',
      icd10Code: 'F12.2',
      icd10Label: 'Abhängigkeitssyndrom bei Cannabinoiden',
      icd11Code: '6C41.2',
      icd11Label: 'Cannabisabhängigkeit',
      dsmCode: '304.30',
      dsmLabel: 'Cannabisgebrauchsstörung, schwer',
      searchText: 'f12.2',
    })

    const res = await fetch(`${baseUrl}/api/icd/title?code=F12.2&version=icd10&language=de`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string; source: string }
    expect(body.title).toBe('Abhängigkeitssyndrom bei Cannabinoiden')
    expect(body.source).toBe('crosswalk')
  })

  it('validates required query params', async () => {
    const res = await fetch(`${baseUrl}/api/icd/title?version=icd10`)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/icd/titles', () => {
  it('returns batch titles', async () => {
    vi.mocked(fetchWhoIcdTitle).mockResolvedValue('Official WHO title')

    const res = await fetch(`${baseUrl}/api/icd/titles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: 'de',
        items: [{ code: 'F20.0', version: 'icd10' }],
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { titles: Array<{ code: string; title: string }> }
    expect(body.titles).toHaveLength(1)
    expect(body.titles[0]?.code).toBe('F20.0')
    expect(body.titles[0]?.title).toBe('Official WHO title')
  })
})

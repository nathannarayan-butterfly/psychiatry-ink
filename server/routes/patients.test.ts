import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const getCaseByCaseId = vi.fn()
const deleteCaseWithSnapshots = vi.fn()

vi.mock('../data/patientCases', () => ({
  getCaseByCaseId: (...args: unknown[]) => getCaseByCaseId(...args),
  deleteCaseWithSnapshots: (...args: unknown[]) => deleteCaseWithSnapshots(...args),
  insertCase: vi.fn(),
  updateCase: vi.fn(),
  listCasesByAccount: vi.fn(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const { patientsRouter } = await import('./patients')
  const app = express()
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user']
    if (typeof header === 'string' && header) req.authUserId = header
    next()
  })
  app.use(express.json())
  app.use('/api/patients', patientsRouter)
  server = app.listen(0)
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  getCaseByCaseId.mockReset()
  deleteCaseWithSnapshots.mockReset()
  process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
})

describe('DELETE /api/patients/:caseId', () => {
  it('removes workspace snapshots and the patient case row atomically via the RPC', async () => {
    getCaseByCaseId.mockResolvedValue({
      caseId: 'case-abc',
      accountId: 'user-1',
    })
    deleteCaseWithSnapshots.mockResolvedValue(undefined)

    const response = await fetch(`${baseUrl}/api/patients/case-abc`, {
      method: 'DELETE',
      headers: { 'x-test-user': 'user-1' },
    })

    expect(response.status).toBe(204)
    // A single atomic RPC call replaces the former Prisma $transaction (snapshot
    // deleteMany + case delete), preserving all-or-nothing semantics.
    expect(deleteCaseWithSnapshots).toHaveBeenCalledTimes(1)
    expect(deleteCaseWithSnapshots).toHaveBeenCalledWith('case-abc')
  })

  it('returns 403 without deleting when the case belongs to another account', async () => {
    getCaseByCaseId.mockResolvedValue({ caseId: 'case-abc', accountId: 'other-user' })

    const response = await fetch(`${baseUrl}/api/patients/case-abc`, {
      method: 'DELETE',
      headers: { 'x-test-user': 'user-1' },
    })

    expect(response.status).toBe(403)
    expect(deleteCaseWithSnapshots).not.toHaveBeenCalled()
  })
})

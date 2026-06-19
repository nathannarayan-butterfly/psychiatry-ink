import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const patientCaseFindUnique = vi.fn()
const patientCaseDelete = vi.fn()
const workspaceSnapshotDeleteMany = vi.fn()
const transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops))

vi.mock('../db', () => ({
  prisma: {
    patientCase: {
      findUnique: (...args: unknown[]) => patientCaseFindUnique(...args),
      delete: (...args: unknown[]) => patientCaseDelete(...args),
    },
    encryptedWorkspaceSnapshot: {
      deleteMany: (...args: unknown[]) => workspaceSnapshotDeleteMany(...args),
    },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
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
  patientCaseFindUnique.mockReset()
  patientCaseDelete.mockReset()
  workspaceSnapshotDeleteMany.mockReset()
  transaction.mockReset()
  transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]))
  process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
})

describe('DELETE /api/patients/:caseId', () => {
  it('removes workspace snapshots and the patient case row together', async () => {
    patientCaseFindUnique.mockResolvedValue({
      caseId: 'case-abc',
      accountId: 'user-1',
    })
    transaction.mockResolvedValue([])

    const response = await fetch(`${baseUrl}/api/patients/case-abc`, {
      method: 'DELETE',
      headers: { 'x-test-user': 'user-1' },
    })

    expect(response.status).toBe(204)
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(workspaceSnapshotDeleteMany).toHaveBeenCalledWith({ where: { caseId: 'case-abc' } })
    expect(patientCaseDelete).toHaveBeenCalledWith({ where: { caseId: 'case-abc' } })
  })
})

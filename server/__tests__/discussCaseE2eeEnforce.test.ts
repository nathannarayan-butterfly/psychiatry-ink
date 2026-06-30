/**
 * Design D — the DiscussCase create-discussion route MUST reject identified
 * packages that are not E2EE ciphertext envelopes. The client already
 * encrypts before upload, but a forged direct API call (or a future client
 * bug) must not be able to slip plaintext past the server.
 *
 * The check is implemented inline in `server/routes/discussCase.ts`; this
 * test exercises the POST `/` handler with both a plaintext payload and a
 * valid `EncryptedEnvelope` payload, asserting the former is rejected with
 * `400 discuss_case_identified_must_be_e2ee` and the latter passes the
 * E2EE gate (it may still hit other validation or `createDiscussion`
 * errors downstream — the test stops measuring once the E2EE gate has
 * been cleared).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Stub createDiscussion so the route does not actually hit Supabase. The
// E2EE check happens BEFORE this call, so for plaintext-rejection tests
// the mock is never invoked — and for the valid-envelope path we let the
// stub return a minimal shape so the route can emit `201`.
const createDiscussionMock = vi.fn<(input: unknown) => Promise<unknown>>(
  async () => ({
    discussionId: 'd-test',
    packageId: 'p-test',
  }),
)

vi.mock('../services/discussCaseStore', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    createDiscussion: (input: unknown) => createDiscussionMock(input),
  }
})

import { discussCaseRouter } from '../routes/discussCase'
import { E2EE_VERSION, type EncryptedEnvelope } from '../../src/utils/e2ee'
import { isEncryptedEnvelope } from '../../src/utils/e2ee'

interface FakeRes {
  statusCode: number
  body: unknown
  status(code: number): FakeRes
  json(body: unknown): FakeRes
}

function createFakeRes(): FakeRes {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

interface FakeReq {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
  query: Record<string, unknown>
  params: Record<string, string>
  authUserId?: string
}

function findRoute(method: string, path: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (discussCaseRouter as unknown as { stack: any[] }).stack
  for (const layer of stack) {
    if (!layer.route) continue
    const route = layer.route
    if (route.path !== path) continue
    const methods = route.methods as Record<string, boolean>
    if (!methods[method.toLowerCase()]) continue
    return layer.route.stack[0].handle
  }
  return null
}

async function callCreate(body: unknown) {
  const handler = findRoute('post', '/')
  if (!handler) throw new Error('POST / not found on discussCaseRouter')
  const req: FakeReq = {
    method: 'POST',
    url: '/',
    headers: { 'x-user-id': 'user-1' },
    body,
    query: {},
    params: {},
    authUserId: 'user-1',
  }
  const res = createFakeRes()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (handler as any)(req as any, res as any, () => {})
  return res
}

const validIdentifiedEnvelope: EncryptedEnvelope = {
  enc: E2EE_VERSION,
  ciphertext: 'Y2lwaGVydGV4dA',
  iv: 'aXZibG9i',
}

const deidentifiedContent = {
  caseId: 'case-1',
  caseTitle: 'Case',
  caseFirstName: '',
  caseLastName: '',
  caseDob: '',
  caseGender: '',
  caseAge: 42,
  caseCreatedAt: '2026-06-01',
  sections: [],
}

describe('DiscussCase — identified package must be E2EE (Design D)', () => {
  const prevUrl = process.env.SUPABASE_URL
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeAll(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-for-tests'
  })

  afterAll(() => {
    if (prevUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = prevUrl
    if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey
    createDiscussionMock.mockReset()
  })

  it('isEncryptedEnvelope is the discriminator used by the SQL CHECK constraint', () => {
    // Defence-in-depth assertion: the migration's CHECK looks for
    // `content->>'enc' = 'aes-gcm-256-v1'`. If E2EE_VERSION ever changes
    // we must update the migration in lockstep.
    expect(E2EE_VERSION).toBe('aes-gcm-256-v1')
    expect(isEncryptedEnvelope(validIdentifiedEnvelope)).toBe(true)
    expect(
      isEncryptedEnvelope({
        caseId: 'case-1',
        caseTitle: 'Plain',
        sections: [],
      }),
    ).toBe(false)
  })

  it('rejects a plaintext DiscussPackageContent as identified package', async () => {
    createDiscussionMock.mockClear()
    const plaintextIdentified = {
      caseId: 'case-1',
      caseTitle: 'Plain identified',
      caseFirstName: 'Erika',
      caseLastName: 'Mustermann',
      caseDob: '1980-01-01',
      caseGender: 'female',
      caseAge: 46,
      caseCreatedAt: '2026-06-01',
      sections: [],
    }
    const res = await callCreate({
      caseId: 'case-1',
      title: 'New consult',
      packageContent: plaintextIdentified,
      deidentifiedPackageContent: deidentifiedContent,
    })

    expect(res.statusCode).toBe(400)
    const body = res.body as { error?: string; code?: string }
    expect(body.code).toBe('discuss_case_identified_must_be_e2ee')
    expect(typeof body.error).toBe('string')
    expect(createDiscussionMock).not.toHaveBeenCalled()
  })

  it('passes the E2EE gate when the identified package is a valid envelope', async () => {
    createDiscussionMock.mockClear()
    const res = await callCreate({
      caseId: 'case-1',
      title: 'New consult',
      packageContent: validIdentifiedEnvelope,
      deidentifiedPackageContent: deidentifiedContent,
    })

    // Past the gate: createDiscussion was reached with the envelope
    // verbatim, and the route emitted 201 with the stub result.
    expect(createDiscussionMock).toHaveBeenCalledTimes(1)
    const callArg = createDiscussionMock.mock.calls[0]?.[0] as
      | { identifiedContent: unknown }
      | undefined
    expect(callArg?.identifiedContent).toEqual(validIdentifiedEnvelope)
    expect(res.statusCode).toBe(201)
  })
})

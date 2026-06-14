import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isDevAuthBypassEnabled,
  requireAuthenticatedUserOrDevBypass,
} from '../requireAuthenticatedUserOrDevBypass'

function makeReq(authUserId?: string): Request {
  return {
    method: 'POST',
    baseUrl: '/api/generate',
    path: '/',
    authUserId,
    headers: {},
  } as unknown as Request
}

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  const res = { status, json } as unknown as Response
  return { res, status, json }
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_BYPASS = process.env.ENABLE_DEV_AUTH_BYPASS

describe('isDevAuthBypassEnabled', () => {
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    process.env.ENABLE_DEV_AUTH_BYPASS = ORIGINAL_BYPASS
  })

  it('is enabled only in development with the explicit flag', () => {
    process.env.NODE_ENV = 'development'
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
    expect(isDevAuthBypassEnabled()).toBe(true)
  })

  it('is disabled in development without the flag', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_DEV_AUTH_BYPASS
    expect(isDevAuthBypassEnabled()).toBe(false)
  })

  it('is disabled in production even with the flag set', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
    expect(isDevAuthBypassEnabled()).toBe(false)
  })

  it('is disabled in preview/staging/unknown envs even with the flag set', () => {
    for (const env of ['preview', 'staging', 'test', '']) {
      process.env.NODE_ENV = env
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
      expect(isDevAuthBypassEnabled()).toBe(false)
    }
  })
})

describe('requireAuthenticatedUserOrDevBypass', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    process.env.ENABLE_DEV_AUTH_BYPASS = ORIGINAL_BYPASS
    vi.restoreAllMocks()
  })

  it('allows an authenticated user in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.ENABLE_DEV_AUTH_BYPASS
    const { res, status } = makeRes()
    const result = requireAuthenticatedUserOrDevBypass(makeReq('user-123'), res)
    expect(result).toBe('user-123')
    expect(status).not.toHaveBeenCalled()
  })

  it('returns 401 for an unauthenticated request in production (criterion 1)', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
    const { res, status, json } = makeRes()
    const result = requireAuthenticatedUserOrDevBypass(makeReq(), res)
    expect(result).toBeNull()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Anmeldung erforderlich' })
  })

  it('returns 401 in development without the bypass flag (criterion 2)', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_DEV_AUTH_BYPASS
    const { res, status } = makeRes()
    const result = requireAuthenticatedUserOrDevBypass(makeReq(), res)
    expect(result).toBeNull()
    expect(status).toHaveBeenCalledWith(401)
  })

  it('allows the dev bypass in development with the flag (criterion 3)', () => {
    process.env.NODE_ENV = 'development'
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true'
    const { res, status } = makeRes()
    const result = requireAuthenticatedUserOrDevBypass(makeReq(), res)
    expect(result).toBe('default')
    expect(status).not.toHaveBeenCalled()
  })

  it('does not log prompt content or PHI when denying access', () => {
    process.env.NODE_ENV = 'production'
    const warn = vi.spyOn(console, 'warn')
    const { res } = makeRes()
    requireAuthenticatedUserOrDevBypass(makeReq(), res)
    expect(warn).toHaveBeenCalledTimes(1)
    const logged = String(warn.mock.calls[0]?.[0] ?? '')
    expect(logged).toContain('/api/generate')
    expect(logged).toContain('reason=unauthenticated')
    expect(logged).not.toContain('Bearer')
  })
})

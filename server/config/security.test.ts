import type { CorsOptions, CorsRequest } from 'cors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCorsDelegate, isOriginAllowed, isSameOriginRequest, parseAllowedOrigins } from './security'

function makeRequest(headers: Record<string, string | string[]>): CorsRequest {
  return { method: 'POST', headers } as unknown as CorsRequest
}

function resolveCors(req: CorsRequest): Promise<{ error: Error | null; options: CorsOptions | null }> {
  return new Promise((resolve) => {
    buildCorsDelegate()(req, (error, options) =>
      resolve({ error: (error as Error) ?? null, options: options ?? null }),
    )
  })
}

describe('parseAllowedOrigins', () => {
  it('splits on commas, semicolons, and whitespace and strips trailing slashes', () => {
    expect(parseAllowedOrigins('https://a.com/, https://b.com ; https://c.com/')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ])
  })

  it('returns an empty list for blank input', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
    expect(parseAllowedOrigins('   ')).toEqual([])
  })
})

describe('isSameOriginRequest', () => {
  it('matches when the Origin host equals the request host', () => {
    expect(isSameOriginRequest('https://psychiatry.ink', 'psychiatry.ink')).toBe(true)
  })

  it('handles a proxy-chained, comma-separated host header', () => {
    expect(isSameOriginRequest('https://psychiatry.ink', 'psychiatry.ink, internal-lb')).toBe(true)
  })

  it('rejects a different host and malformed origins', () => {
    expect(isSameOriginRequest('https://evil.example', 'psychiatry.ink')).toBe(false)
    expect(isSameOriginRequest('not-a-url', 'psychiatry.ink')).toBe(false)
    expect(isSameOriginRequest('https://psychiatry.ink', undefined)).toBe(false)
  })
})

describe('buildCorsDelegate', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV
  const ORIGINAL_ALLOWLIST = process.env.CORS_ALLOWED_ORIGINS

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    delete process.env.CORS_ALLOWED_ORIGINS
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    if (ORIGINAL_ALLOWLIST === undefined) delete process.env.CORS_ALLOWED_ORIGINS
    else process.env.CORS_ALLOWED_ORIGINS = ORIGINAL_ALLOWLIST
    vi.restoreAllMocks()
  })

  it('allows requests with no Origin header (server-to-server, curl, health checks)', async () => {
    const { error, options } = await resolveCors(makeRequest({ host: 'psychiatry.ink' }))
    expect(error).toBeNull()
    expect(options?.origin).toBe(true)
  })

  it('allows same-origin POSTs even when the allowlist is empty (single-service topology)', async () => {
    const { error, options } = await resolveCors(
      makeRequest({ host: 'psychiatry.ink', origin: 'https://psychiatry.ink' }),
    )
    expect(error).toBeNull()
    expect(options?.origin).toBe(true)
  })

  it('honours the X-Forwarded-Host header for same-origin detection behind a proxy', async () => {
    const { error, options } = await resolveCors(
      makeRequest({
        host: 'psychiatry-ink-beta.run.app',
        'x-forwarded-host': 'psychiatry.ink',
        origin: 'https://psychiatry.ink',
      }),
    )
    expect(error).toBeNull()
    expect(options?.origin).toBe(true)
  })

  it('rejects genuine cross-origin requests not on the allowlist', async () => {
    const { error } = await resolveCors(
      makeRequest({ host: 'psychiatry.ink', origin: 'https://evil.example' }),
    )
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('Origin not allowed by CORS')
  })

  it('allows allowlisted cross-origin requests (split deploys)', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.psychiatry.ink'
    const { error, options } = await resolveCors(
      makeRequest({ host: 'api.psychiatry.ink', origin: 'https://app.psychiatry.ink' }),
    )
    expect(error).toBeNull()
    expect(options?.origin).toBe(true)
  })
})

describe('isOriginAllowed', () => {
  it('matches allowlisted origins regardless of trailing slash', () => {
    expect(isOriginAllowed('https://app.psychiatry.ink/', ['https://app.psychiatry.ink'])).toBe(true)
    expect(isOriginAllowed('https://other.example', ['https://app.psychiatry.ink'])).toBe(false)
  })
})

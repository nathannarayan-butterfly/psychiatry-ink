import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthEmailRedirectUrl } from '../authEmailRedirect'

const originalLocation = window.location

function setOrigin(origin: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, origin, href: `${origin}/` },
  })
}

describe('getAuthEmailRedirectUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('prefers VITE_PUBLIC_APP_URL (canonical production origin)', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://app.psychiatry.ink')
    setOrigin('http://localhost:5173')
    expect(getAuthEmailRedirectUrl()).toBe('https://app.psychiatry.ink')
  })

  it('strips any trailing path/slash to the bare origin', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://app.psychiatry.ink/dashboard/')
    expect(getAuthEmailRedirectUrl()).toBe('https://app.psychiatry.ink')
  })

  it('accepts VITE_SITE_URL as an alias when VITE_PUBLIC_APP_URL is unset', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://app.psychiatry.ink')
    expect(getAuthEmailRedirectUrl()).toBe('https://app.psychiatry.ink')
  })

  it('ignores a malformed env value and falls back to the current origin', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'not-a-url')
    setOrigin('https://app.psychiatry.ink')
    expect(getAuthEmailRedirectUrl()).toBe('https://app.psychiatry.ink')
  })

  it('falls back to window.location.origin in dev when no env is set', () => {
    setOrigin('http://localhost:5173')
    expect(getAuthEmailRedirectUrl()).toBe('http://localhost:5173')
  })

  it('falls back to window.location.origin in prod (app domain) when no env is set', () => {
    setOrigin('https://app.psychiatry.ink')
    expect(getAuthEmailRedirectUrl()).toBe('https://app.psychiatry.ink')
  })
})

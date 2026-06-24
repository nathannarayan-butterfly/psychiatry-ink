import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCanonicalAppUrl, redirectToCanonicalAppIfNeeded } from '../canonicalAppRedirect'

describe('canonicalAppRedirect', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.stubEnv('VITE_CANONICAL_APP_DOMAIN', 'app.psychiatry.ink')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('builds redirect URL from marketing domain to canonical app', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatry.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard')).toBe('https://app.psychiatry.ink/dashboard')
  })

  it('skips redirect when already on canonical app domain', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'app.psychiatry.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard')).toBeNull()
  })

  it('skips redirect when canonical env is unset', () => {
    vi.stubEnv('VITE_CANONICAL_APP_DOMAIN', '')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatry.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard')).toBeNull()
  })

  it('redirectToCanonicalAppIfNeeded assigns location when configured', () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatrie.ink', assign },
    })

    expect(redirectToCanonicalAppIfNeeded('/dashboard')).toBe(true)
    expect(assign).toHaveBeenCalledWith('https://app.psychiatry.ink/dashboard')
  })
})

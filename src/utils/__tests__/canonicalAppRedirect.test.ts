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

  it('carries the English marketing locale across the hop to the app shell', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatry.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard')).toBe('https://app.psychiatry.ink/dashboard?lang=en')
  })

  it('carries the German marketing locale across the hop to the app shell', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatrie.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard')).toBe('https://app.psychiatry.ink/dashboard?lang=de')
  })

  it('merges the lang hint with an embedded destination query string', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatry.ink' },
    })

    expect(buildCanonicalAppUrl('/case/abc?view=overview')).toBe(
      'https://app.psychiatry.ink/case/abc?view=overview&lang=en',
    )
  })

  it('does not clobber an explicit lang already present on the destination', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'psychiatrie.ink' },
    })

    expect(buildCanonicalAppUrl('/dashboard?lang=en')).toBe(
      'https://app.psychiatry.ink/dashboard?lang=en',
    )
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
    expect(assign).toHaveBeenCalledWith('https://app.psychiatry.ink/dashboard?lang=de')
  })
})

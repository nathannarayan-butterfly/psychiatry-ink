import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUTHENTICATED_PATH,
  getPostLoginDestination,
  shouldRedirectAuthenticatedToApp,
} from '../postAuthRedirect'

describe('postAuthRedirect — getPostLoginDestination', () => {
  it('defaults to the dashboard when no redirect is present', () => {
    expect(getPostLoginDestination('')).toBe(DEFAULT_AUTHENTICATED_PATH)
    expect(getPostLoginDestination('?foo=bar')).toBe('/dashboard')
  })

  it('honours a same-origin deep-link return target', () => {
    expect(getPostLoginDestination('?redirect=/case/abc?view=overview')).toBe(
      '/case/abc?view=overview',
    )
    expect(getPostLoginDestination('?redirect=/dashboard/patients')).toBe('/dashboard/patients')
  })

  it('rejects off-site / protocol-relative redirects (open-redirect guard)', () => {
    expect(getPostLoginDestination('?redirect=//evil.example.com')).toBe('/dashboard')
    expect(getPostLoginDestination('?redirect=https://evil.example.com')).toBe('/dashboard')
    expect(getPostLoginDestination('?redirect=javascript:alert(1)')).toBe('/dashboard')
  })
})

describe('postAuthRedirect — shouldRedirectAuthenticatedToApp', () => {
  it('redirects an authenticated user off the bare landing page', () => {
    expect(shouldRedirectAuthenticatedToApp('landing')).toBe(true)
  })

  it('leaves marketing/legal sub-pages and app routes alone', () => {
    for (const view of ['features', 'pricing', 'privacy', 'dashboard', 'login', 'signup', 'case']) {
      expect(shouldRedirectAuthenticatedToApp(view)).toBe(false)
    }
  })
})

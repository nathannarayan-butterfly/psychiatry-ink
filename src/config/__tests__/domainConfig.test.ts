import { describe, expect, it } from 'vitest'
import {
  DOMAIN_CONFIG,
  DOMAIN_CONFIG_FALLBACK,
  isAppShellDomain,
  isMarketingDomain,
  normalizeHostname,
  resolveDomainConfig,
  resolveLocaleFromHost,
} from '../domainConfig'

describe('domainConfig', () => {
  it('maps psychiatry.ink to English marketing', () => {
    const config = resolveDomainConfig('psychiatry.ink')
    expect(config.domain).toBe('psychiatry.ink')
    expect(config.defaultLocale).toBe('en')
    expect(config.homepageVariant).toBe('en')
    expect(config.pricingCopyVariant).toBe('en')
    expect(config.marketingLocales).toEqual(['en'])
    expect(config.siteKind).toBe('marketing')
  })

  it('maps psychiatrie.ink to German marketing with FR support', () => {
    const config = resolveDomainConfig('psychiatrie.ink')
    expect(config.domain).toBe('psychiatrie.ink')
    expect(config.defaultLocale).toBe('de')
    expect(config.homepageVariant).toBe('de')
    expect(config.marketingLocales).toEqual(['de', 'fr'])
    expect(config.siteKind).toBe('marketing')
  })

  it('maps fr.psychiatrie.ink to French marketing', () => {
    const config = resolveDomainConfig('fr.psychiatrie.ink')
    expect(config.domain).toBe('fr.psychiatrie.ink')
    expect(config.defaultLocale).toBe('fr')
    expect(config.homepageVariant).toBe('fr')
    expect(config.marketingLocales).toEqual(['de', 'fr'])
  })

  it('maps psiquiatria.ink to Spanish marketing', () => {
    const config = resolveDomainConfig('psiquiatria.ink')
    expect(config.domain).toBe('psiquiatria.ink')
    expect(config.defaultLocale).toBe('es')
    expect(config.homepageVariant).toBe('es')
    expect(config.marketingLocales).toEqual(['es'])
  })

  it('maps app.psychiatry.ink to app shell config', () => {
    const config = resolveDomainConfig('app.psychiatry.ink')
    expect(config.domain).toBe('app.psychiatry.ink')
    expect(config.siteKind).toBe('app')
    expect(config.marketingLocales).toEqual([])
    expect(isAppShellDomain('app.psychiatry.ink')).toBe(true)
    expect(isMarketingDomain('app.psychiatry.ink')).toBe(false)
  })

  it('falls back unknown hostnames to English psychiatry.ink', () => {
    expect(resolveDomainConfig('unknown.example.com')).toEqual(DOMAIN_CONFIG_FALLBACK)
    expect(resolveDomainConfig('unknown.example.com').defaultLocale).toBe('en')
  })

  it('falls back localhost to English psychiatry.ink', () => {
    expect(resolveDomainConfig('localhost').defaultLocale).toBe('en')
    expect(resolveDomainConfig('127.0.0.1').defaultLocale).toBe('en')
  })

  it('strips www prefix before lookup', () => {
    expect(resolveDomainConfig('www.psychiatry.ink').defaultLocale).toBe('en')
    expect(resolveDomainConfig('www.psychiatrie.ink').defaultLocale).toBe('de')
  })

  it('normalizes hostname casing', () => {
    expect(normalizeHostname('  WWW.Psychiatry.INK ')).toBe('psychiatry.ink')
  })

  it('strips an explicit port before lookup', () => {
    expect(normalizeHostname('psychiatry.ink:8080')).toBe('psychiatry.ink')
    expect(normalizeHostname('localhost:5173')).toBe('localhost')
    expect(resolveDomainConfig('psychiatrie.ink:443').defaultLocale).toBe('de')
  })

  describe('resolveLocaleFromHost', () => {
    it('maps the English and German spelling domains to distinct locales', () => {
      expect(resolveLocaleFromHost('psychiatry.ink')).toBe('en')
      expect(resolveLocaleFromHost('psychiatrie.ink')).toBe('de')
    })

    it('matches on exact hostname, never a loose substring', () => {
      // `psychiatrie.ink` must not be caught by an `psychiatry` rule (or vice-versa).
      expect(resolveLocaleFromHost('psychiatry.ink')).not.toBe(
        resolveLocaleFromHost('psychiatrie.ink'),
      )
    })

    it('strips www. and ports before resolving', () => {
      expect(resolveLocaleFromHost('www.psychiatry.ink')).toBe('en')
      expect(resolveLocaleFromHost('www.psychiatrie.ink')).toBe('de')
      expect(resolveLocaleFromHost('psychiatry.ink:8080')).toBe('en')
    })

    it('keeps the regional subdomain and Spanish domain locales intact', () => {
      expect(resolveLocaleFromHost('fr.psychiatrie.ink')).toBe('fr')
      expect(resolveLocaleFromHost('psiquiatria.ink')).toBe('es')
    })

    it('falls back to the English default for localhost and unknown hosts', () => {
      expect(resolveLocaleFromHost('localhost')).toBe('en')
      expect(resolveLocaleFromHost('127.0.0.1')).toBe('en')
      expect(resolveLocaleFromHost('unknown.example.com')).toBe('en')
      expect(resolveLocaleFromHost('localhost')).toBe(DOMAIN_CONFIG_FALLBACK.defaultLocale)
    })
  })

  it('registers all configured marketing and app domains', () => {
    const domains = DOMAIN_CONFIG.map((entry) => entry.domain)
    expect(domains).toContain('psychiatry.ink')
    expect(domains).toContain('psychiatrie.ink')
    expect(domains).toContain('fr.psychiatrie.ink')
    expect(domains).toContain('psiquiatria.ink')
    expect(domains).toContain('app.psychiatry.ink')
  })

  it('includes SEO metadata derived from homepage content', () => {
    const config = resolveDomainConfig('psychiatry.ink')
    expect(config.seo.title).toBeTruthy()
    expect(config.seo.description).toBeTruthy()
    expect(config.seo.ogTitle).toBe(config.seo.title)
    expect(config.seo.ogSiteName).toBe('Psychiatry.Ink')
  })
})

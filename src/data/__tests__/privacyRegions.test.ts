// @vitest-environment node
//
// Region → privacy-tier resolution. Guards the data-residency messaging that the
// "Current tier" settings section is built from: non-DACH countries (e.g. India)
// must NOT be mislabelled as the DACH "DE/AT/CH" tier, and unmapped countries
// default to `full` while DACH explicit overrides stay `local_only`.
import { describe, expect, it } from 'vitest'
import {
  COUNTRY_TIER_OVERRIDES,
  DEFAULT_PRIVACY_TIER,
  resolvePrivacyTier,
} from '../privacyRegions'
import { translateUi } from '../uiTranslations'

describe('resolvePrivacyTier', () => {
  it('keeps DACH countries on the local_only tier', () => {
    expect(resolvePrivacyTier('DE')).toBe('local_only')
    expect(resolvePrivacyTier('AT')).toBe('local_only')
    expect(resolvePrivacyTier('CH')).toBe('local_only')
  })

  it('resolves India to full via the unmapped-country default (not a DACH-specific tier)', () => {
    expect(COUNTRY_TIER_OVERRIDES).not.toHaveProperty('IN')
    expect(resolvePrivacyTier('IN')).toBe(DEFAULT_PRIVACY_TIER)
    expect(resolvePrivacyTier('IN')).toBe('full')
  })

  it('grants the full tier to explicitly listed jurisdictions and the default fallback', () => {
    expect(resolvePrivacyTier('US')).toBe('full')
    expect(resolvePrivacyTier('GB')).toBe('full')
    expect(resolvePrivacyTier('AU')).toBe('full')
    expect(resolvePrivacyTier('CA')).toBe('full')
    expect(resolvePrivacyTier('FR')).toBe('full')
  })

  it('falls back to full for unknown / missing countries', () => {
    expect(resolvePrivacyTier(null)).toBe('full')
    expect(resolvePrivacyTier(undefined)).toBe('full')
    expect(resolvePrivacyTier('')).toBe('full')
    expect(resolvePrivacyTier('ZZ')).toBe('full')
  })

  it('normalises casing / whitespace', () => {
    expect(resolvePrivacyTier(' de ')).toBe('local_only')
    expect(resolvePrivacyTier('us')).toBe('full')
  })
})

describe('local_only tier label copy', () => {
  // The label is shown to EVERY local_only user, including DACH regions,
  // so it must not hardcode a "DE/AT/CH" claim.
  it('is region-neutral in all shipped languages', () => {
    for (const lang of ['en', 'de', 'fr', 'es'] as const) {
      const label = translateUi(lang, 'privacyTierLocalOnly')
      expect(label).not.toMatch(/DE\/AT\/CH/)
    }
  })
})

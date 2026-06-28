// @vitest-environment node
//
// Region → privacy-tier resolution. Guards the data-residency messaging that the
// "Current tier" settings section is built from: non-DACH countries (e.g. India)
// must NOT be mislabelled as the DACH "DE/AT/CH" tier, and the EU-safe default
// (local_only) must hold for any unmapped country while US/GB/AU/CA stay `full`.
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

  it('resolves India to local_only via the EU-safe default (not a DACH-specific tier)', () => {
    // India is intentionally not in the override map — it must fall back to the
    // safe default rather than being treated as a configured DACH region.
    expect(COUNTRY_TIER_OVERRIDES).not.toHaveProperty('IN')
    expect(resolvePrivacyTier('IN')).toBe(DEFAULT_PRIVACY_TIER)
    expect(resolvePrivacyTier('IN')).toBe('local_only')
  })

  it('grants the full tier only to explicitly listed non-EU jurisdictions', () => {
    expect(resolvePrivacyTier('US')).toBe('full')
    expect(resolvePrivacyTier('GB')).toBe('full')
    expect(resolvePrivacyTier('AU')).toBe('full')
    expect(resolvePrivacyTier('CA')).toBe('full')
  })

  it('falls back to the safe default for unknown / missing countries', () => {
    expect(resolvePrivacyTier(null)).toBe('local_only')
    expect(resolvePrivacyTier(undefined)).toBe('local_only')
    expect(resolvePrivacyTier('')).toBe('local_only')
    expect(resolvePrivacyTier('ZZ')).toBe('local_only')
  })

  it('normalises casing / whitespace', () => {
    expect(resolvePrivacyTier(' de ')).toBe('local_only')
    expect(resolvePrivacyTier('us')).toBe('full')
  })
})

describe('local_only tier label copy', () => {
  // The label is shown to EVERY local_only user, including non-DACH regions such
  // as India, so it must not hardcode a "DE/AT/CH" claim.
  it('is region-neutral in all shipped languages', () => {
    for (const lang of ['en', 'de', 'fr', 'es'] as const) {
      const label = translateUi(lang, 'privacyTierLocalOnly')
      expect(label).not.toMatch(/DE\/AT\/CH/)
    }
  })
})

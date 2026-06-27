import { describe, expect, it, beforeEach, vi } from 'vitest'
import { DEMO_SEED_VERSION } from '../constants'
import {
  compareDemoSeedVersions,
  getEffectiveDemoSeedVersion,
  isDemoSeedVersionOutdated,
  nextDemoSeedVersion,
} from '../demoVersion'
import {
  clearCanonicalDemoFixture,
  resetDemoFixtureCache,
  setCanonicalDemoFixture,
} from '../loadDemoFixture'
import { buildDemoPatientFixture } from '../buildDemoFixture'

describe('demo version helpers', () => {
  beforeEach(() => {
    clearCanonicalDemoFixture()
    resetDemoFixtureCache()
  })

  it('compares v-prefixed versions numerically', () => {
    expect(compareDemoSeedVersions('v2', 'v3')).toBeLessThan(0)
    expect(compareDemoSeedVersions('v10', 'v3')).toBeGreaterThan(0)
    expect(compareDemoSeedVersions('v2', 'v2')).toBe(0)
  })

  it('bumps seed versions', () => {
    expect(nextDemoSeedVersion('v2')).toBe('v3')
    // `nextDemoSeedVersion(null)` bumps the bundled DEMO_SEED_VERSION; assert
    // against the current constant so this test does not go stale every time
    // we publish a new fixture.
    expect(nextDemoSeedVersion(null)).toBe(nextDemoSeedVersion(DEMO_SEED_VERSION))
  })

  it('uses canonical version when set for locale', () => {
    const fixture = buildDemoPatientFixture('en')
    setCanonicalDemoFixture({ ...fixture, demoSeedVersion: 'v5' }, 'v5', 'en')
    expect(getEffectiveDemoSeedVersion('en')).toBe('v5')
    expect(getEffectiveDemoSeedVersion('de')).toBe(DEMO_SEED_VERSION)
  })

  it('falls back to bundled version without canonical', () => {
    expect(getEffectiveDemoSeedVersion()).toBe(DEMO_SEED_VERSION)
  })

  it('detects outdated local versions per locale', () => {
    setCanonicalDemoFixture(buildDemoPatientFixture('en'), 'v5', 'en')
    expect(isDemoSeedVersionOutdated('v4', 'en')).toBe(true)
    expect(isDemoSeedVersionOutdated('v5', 'en')).toBe(false)
    expect(isDemoSeedVersionOutdated(undefined, 'en')).toBe(true)
  })
})

describe('sync canonical demo fixture', () => {
  beforeEach(() => {
    clearCanonicalDemoFixture()
    resetDemoFixtureCache()
    vi.resetModules()
  })

  it('applies server canonical fixture to loader cache', async () => {
    const fixture = buildDemoPatientFixture('en')
    vi.doMock('../../services/demoPatientApi', () => ({
      fetchCanonicalDemoPatient: vi.fn().mockResolvedValue({
        seedVersion: 'v9',
        fixture: { ...fixture, demoSeedVersion: 'v9' },
        publishedBy: 'user-1',
        publishedByEmail: 'nathan.narayan@butterflyproject.eu',
        publishedAt: new Date().toISOString(),
      }),
    }))

    const { fetchAndApplyCanonicalDemoFixture } = await import('../syncCanonicalDemoFixture')
    const { loadDemoFixture, getCanonicalDemoVersion } = await import('../loadDemoFixture')

    const result = await fetchAndApplyCanonicalDemoFixture({ force: true, locale: 'en' })
    expect(result.applied).toBe(true)
    expect(result.seedVersion).toBe('v9')
    expect(getCanonicalDemoVersion('en')).toBe('v9')
    expect(loadDemoFixture('en').demoSeedVersion).toBe('v9')
  })
})

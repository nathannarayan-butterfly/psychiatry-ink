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
    expect(nextDemoSeedVersion(null)).toBe('v3')
  })

  it('uses canonical version when set', () => {
    const fixture = buildDemoPatientFixture()
    setCanonicalDemoFixture({ ...fixture, demoSeedVersion: 'v5' }, 'v5')
    expect(getEffectiveDemoSeedVersion()).toBe('v5')
  })

  it('falls back to bundled version without canonical', () => {
    expect(getEffectiveDemoSeedVersion()).toBe(DEMO_SEED_VERSION)
  })

  it('detects outdated local versions', () => {
    setCanonicalDemoFixture(buildDemoPatientFixture(), 'v4')
    expect(isDemoSeedVersionOutdated('v3')).toBe(true)
    expect(isDemoSeedVersionOutdated('v4')).toBe(false)
    expect(isDemoSeedVersionOutdated(undefined)).toBe(true)
  })
})

describe('sync canonical demo fixture', () => {
  beforeEach(() => {
    clearCanonicalDemoFixture()
    resetDemoFixtureCache()
    vi.resetModules()
  })

  it('applies server canonical fixture to loader cache', async () => {
    const fixture = buildDemoPatientFixture()
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

    const result = await fetchAndApplyCanonicalDemoFixture({ force: true })
    expect(result.applied).toBe(true)
    expect(result.seedVersion).toBe('v9')
    expect(getCanonicalDemoVersion()).toBe('v9')
    expect(loadDemoFixture().demoSeedVersion).toBe('v9')
  })
})

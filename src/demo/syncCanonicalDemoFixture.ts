import { fetchCanonicalDemoPatient } from '../services/demoPatientApi'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'
import { DEMO_SEED_VERSION } from './constants'
import { compareDemoSeedVersions } from './demoVersion'
import { isLocaleSplitDemoFixture, resolveFixtureDemoLocale } from './demoFixtureLocale'
import { uiLanguageToDemoLocale, type DemoLocale } from './demoLocale'
import { resetDemoFixtureCache, setCanonicalDemoFixture, clearCanonicalDemoFixture } from './loadDemoFixture'

let lastFetchedAt = 0
const FETCH_TTL_MS = 30_000

/** Pull locale-specific canonical demo fixture from server; fall back to bundled JSON on failure. */
export async function fetchAndApplyCanonicalDemoFixture(options?: {
  force?: boolean
  locale?: DemoLocale
}): Promise<{ applied: boolean; seedVersion: string | null }> {
  const targetLocale = options?.locale ?? uiLanguageToDemoLocale(loadStoredUiLanguage())
  const now = Date.now()
  if (!options?.force && now - lastFetchedAt < FETCH_TTL_MS) {
    return { applied: false, seedVersion: null }
  }

  try {
    const canonical = await fetchCanonicalDemoPatient(targetLocale)
    lastFetchedAt = now
    if (!canonical || !isLocaleSplitDemoFixture(canonical.fixture)) {
      clearCanonicalDemoFixture(targetLocale)
      resetDemoFixtureCache()
      return { applied: false, seedVersion: null }
    }

    const fixtureLocale = resolveFixtureDemoLocale(canonical.fixture)
    if (!fixtureLocale || fixtureLocale !== targetLocale) {
      clearCanonicalDemoFixture(targetLocale)
      resetDemoFixtureCache()
      return { applied: false, seedVersion: null }
    }

    // Never let a STALE canonical (published before a bundled fix) override the
    // newer bundled fixture. A canonical older than the bundled seed version is
    // ignored so shipped corrections (e.g. removing German leaks from the EN
    // demo) take effect immediately without waiting for a republish.
    if (compareDemoSeedVersions(canonical.seedVersion, DEMO_SEED_VERSION) < 0) {
      clearCanonicalDemoFixture(targetLocale)
      resetDemoFixtureCache()
      return { applied: false, seedVersion: null }
    }

    setCanonicalDemoFixture(canonical.fixture, canonical.seedVersion, fixtureLocale)
    return { applied: true, seedVersion: canonical.seedVersion }
  } catch {
    clearCanonicalDemoFixture(targetLocale)
    resetDemoFixtureCache()
    return { applied: false, seedVersion: null }
  }
}

export function resetCanonicalDemoFetchCache(): void {
  lastFetchedAt = 0
}

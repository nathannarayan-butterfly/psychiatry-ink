import { fetchCanonicalDemoPatient } from '../services/demoPatientApi'
import { resetDemoFixtureCache, setCanonicalDemoFixture, clearCanonicalDemoFixture } from './loadDemoFixture'

let lastFetchedAt = 0
const FETCH_TTL_MS = 30_000

/** Pull canonical demo fixture from server; fall back to bundled JSON on failure. */
export async function fetchAndApplyCanonicalDemoFixture(options?: {
  force?: boolean
}): Promise<{ applied: boolean; seedVersion: string | null }> {
  const now = Date.now()
  if (!options?.force && now - lastFetchedAt < FETCH_TTL_MS) {
    return { applied: false, seedVersion: null }
  }

  try {
    const canonical = await fetchCanonicalDemoPatient()
    lastFetchedAt = now
    if (canonical) {
      setCanonicalDemoFixture(canonical.fixture, canonical.seedVersion)
      return { applied: true, seedVersion: canonical.seedVersion }
    }
    clearCanonicalDemoFixture()
    resetDemoFixtureCache()
    return { applied: false, seedVersion: null }
  } catch {
    clearCanonicalDemoFixture()
    resetDemoFixtureCache()
    return { applied: false, seedVersion: null }
  }
}

export function resetCanonicalDemoFetchCache(): void {
  lastFetchedAt = 0
}

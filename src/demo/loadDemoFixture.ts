import fixtureJson from './demoPatient.fixture.json'
import { buildDemoPatientFixture } from './buildDemoFixture'
import type { DemoPatientFixture } from './types'

let cachedFixture: DemoPatientFixture | null = null
let canonicalFixture: DemoPatientFixture | null = null
let canonicalVersion: string | null = null

function isDemoFixture(value: unknown): value is DemoPatientFixture {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.isDemoPatient === true &&
    typeof record.demoCaseId === 'string' &&
    typeof record.demoPatientId === 'string'
  )
}

export function setCanonicalDemoFixture(fixture: DemoPatientFixture, seedVersion: string): void {
  canonicalFixture = fixture
  canonicalVersion = seedVersion
  cachedFixture = null
}

export function clearCanonicalDemoFixture(): void {
  canonicalFixture = null
  canonicalVersion = null
  cachedFixture = null
}

export function getCanonicalDemoVersion(): string | null {
  return canonicalVersion
}

/** Load the deterministic demo fixture (server canonical → bundled JSON → builder). */
export function loadDemoFixture(): DemoPatientFixture {
  if (cachedFixture) return cachedFixture
  if (canonicalFixture) {
    cachedFixture = canonicalFixture
    return canonicalFixture
  }
  if (isDemoFixture(fixtureJson)) {
    cachedFixture = fixtureJson
    return fixtureJson
  }
  cachedFixture = buildDemoPatientFixture()
  return cachedFixture
}

/** Test/dev helper — bypass JSON cache. */
export function loadDemoFixtureFresh(): DemoPatientFixture {
  return buildDemoPatientFixture()
}

export function resetDemoFixtureCache(): void {
  cachedFixture = null
}

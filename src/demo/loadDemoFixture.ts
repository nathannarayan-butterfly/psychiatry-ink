import fixtureJson from './demoPatient.fixture.json'
import { buildDemoPatientFixture } from './buildDemoFixture'
import type { DemoLocale } from './demoLocale'
import type { DemoPatientFixture } from './types'

let cachedFixture: DemoPatientFixture | null = null
let cachedLocale: DemoLocale | null = null
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
  cachedLocale = null
}

export function clearCanonicalDemoFixture(): void {
  canonicalFixture = null
  canonicalVersion = null
  cachedFixture = null
  cachedLocale = null
}

export function getCanonicalDemoVersion(): string | null {
  return canonicalVersion
}

/** Load the deterministic demo fixture (server canonical → bundled JSON → builder). */
export function loadDemoFixture(locale: DemoLocale = 'en'): DemoPatientFixture {
  if (cachedFixture && cachedLocale === locale) return cachedFixture
  if (canonicalFixture) {
    cachedFixture = canonicalFixture
    cachedLocale = locale
    return canonicalFixture
  }
  if (locale === 'en' && isDemoFixture(fixtureJson)) {
    cachedFixture = fixtureJson
    cachedLocale = locale
    return fixtureJson
  }
  cachedFixture = buildDemoPatientFixture(locale)
  cachedLocale = locale
  return cachedFixture
}

/** Test/dev helper — bypass JSON cache. */
export function loadDemoFixtureFresh(locale: DemoLocale = 'en'): DemoPatientFixture {
  return buildDemoPatientFixture(locale)
}

export function resetDemoFixtureCache(): void {
  cachedFixture = null
  cachedLocale = null
}

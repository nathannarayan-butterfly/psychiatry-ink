import fixtureDeJson from './demoPatient.de.fixture.json'
import fixtureEnJson from './demoPatient.en.fixture.json'
import { buildDemoPatientFixture } from './buildDemoFixture'
import type { DemoLocale } from './demoLocale'
import type { DemoPatientFixture } from './types'

let cachedFixture: DemoPatientFixture | null = null
let cachedLocale: DemoLocale | null = null
const canonicalFixtures: Partial<Record<DemoLocale, DemoPatientFixture>> = {}
const canonicalVersions: Partial<Record<DemoLocale, string>> = {}

function isDemoFixture(value: unknown): value is DemoPatientFixture {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.isDemoPatient === true &&
    typeof record.demoCaseId === 'string' &&
    typeof record.demoPatientId === 'string'
  )
}

const bundledFixtures: Partial<Record<DemoLocale, DemoPatientFixture>> = {}
if (isDemoFixture(fixtureEnJson)) bundledFixtures.en = fixtureEnJson
if (isDemoFixture(fixtureDeJson)) bundledFixtures.de = fixtureDeJson

export function setCanonicalDemoFixture(
  fixture: DemoPatientFixture,
  seedVersion: string,
  locale: DemoLocale,
): void {
  canonicalFixtures[locale] = fixture
  canonicalVersions[locale] = seedVersion
  cachedFixture = null
  cachedLocale = null
}

export function clearCanonicalDemoFixture(locale?: DemoLocale): void {
  if (locale) {
    delete canonicalFixtures[locale]
    delete canonicalVersions[locale]
  } else {
    for (const key of Object.keys(canonicalFixtures) as DemoLocale[]) {
      delete canonicalFixtures[key]
      delete canonicalVersions[key]
    }
  }
  cachedFixture = null
  cachedLocale = null
}

export function getCanonicalDemoVersion(locale?: DemoLocale): string | null {
  if (locale) return canonicalVersions[locale] ?? null
  const versions = Object.values(canonicalVersions).filter(Boolean) as string[]
  return versions[0] ?? null
}

/** Load the deterministic demo fixture (server canonical → bundled JSON → builder). */
export function loadDemoFixture(locale: DemoLocale = 'en'): DemoPatientFixture {
  if (cachedFixture && cachedLocale === locale) return cachedFixture
  const canonicalFixture = canonicalFixtures[locale]
  if (canonicalFixture) {
    cachedFixture = canonicalFixture
    cachedLocale = locale
    return canonicalFixture
  }
  const bundled = bundledFixtures[locale]
  if (bundled) {
    cachedFixture = bundled
    cachedLocale = locale
    return bundled
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

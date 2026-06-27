import {
  DEMO_CASE_ID_DE,
  DEMO_CASE_ID_EN,
  LEGACY_DEMO_CASE_ID,
  demoLocaleForCaseId,
} from './constants'
import type { DemoLocale } from './demoLocale'
import type { DemoPatientFixture } from './types'

/** v8 locale-split fixtures only — rejects retired single-case canonical rows. */
export function isLocaleSplitDemoFixture(fixture: DemoPatientFixture): boolean {
  if (fixture.demoCaseId === LEGACY_DEMO_CASE_ID) return false
  return (
    (fixture.demoCaseId === DEMO_CASE_ID_EN || fixture.demoCaseId === DEMO_CASE_ID_DE) &&
    (fixture.demoLocale === 'en' || fixture.demoLocale === 'de')
  )
}

export function resolveFixtureDemoLocale(fixture: DemoPatientFixture): DemoLocale | null {
  if (fixture.demoLocale === 'en' || fixture.demoLocale === 'de') return fixture.demoLocale
  return demoLocaleForCaseId(fixture.demoCaseId)
}

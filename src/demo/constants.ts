/** Deterministic identifiers for synthetic demo patients — never real PHI. */

import type { DemoLocale } from './demoLocale'

export const DEMO_CASE_ID_EN = 'DEMO-CASE-EN-0001'
export const DEMO_CASE_ID_DE = 'DEMO-CASE-DE-0001'
export const DEMO_PATIENT_ID_EN = 'DEMO-EN-0001'
export const DEMO_PATIENT_ID_DE = 'DEMO-DE-0001'

/** Retired single-locale demo id — hidden from dashboard after v8 split. */
export const LEGACY_DEMO_CASE_ID = 'DEMO-CASE-0001'
export const LEGACY_DEMO_PATIENT_ID = 'DEMO-0001'

/** @deprecated Use demoCaseIdForLocale(locale) */
export const DEMO_CASE_ID = DEMO_CASE_ID_EN
/** @deprecated Use demoPatientIdForLocale(locale) */
export const DEMO_PATIENT_ID = DEMO_PATIENT_ID_EN

export const DEMO_CASE_IDS = [DEMO_CASE_ID_EN, DEMO_CASE_ID_DE] as const
export const DEMO_PATIENT_IDS = [DEMO_PATIENT_ID_EN, DEMO_PATIENT_ID_DE] as const

// v9: English demo ISDM/Butterfly analysis is now localized (no German criteria,
// differentials, exclusions, risk flags or side-effect labels leak into the EN
// fixture). Bump forces installed English users to re-seed the corrected case.
export const DEMO_SEED_VERSION = 'v9'

export const DEMO_FIXTURE_VERSION = '1'

export const DEMO_USER_STATE_KEY_PREFIX = 'psychiatry-ink:demo-patient-state'

export interface DemoPatientIdentity {
  vorname: string
  nachname: string
  geburtsdatum: string
  geschlecht: 'maennlich' | 'weiblich' | 'divers'
  age: string
}

const DEMO_IDENTITIES: Record<DemoLocale, DemoPatientIdentity> = {
  en: {
    vorname: 'Marcus',
    nachname: 'Demo',
    geburtsdatum: '1985-07-14',
    geschlecht: 'maennlich',
    age: '40',
  },
  de: {
    vorname: 'Thomas',
    nachname: 'Demo',
    geburtsdatum: '1985-03-22',
    geschlecht: 'maennlich',
    age: '41',
  },
}

export function demoCaseIdForLocale(locale: DemoLocale): string {
  return locale === 'de' ? DEMO_CASE_ID_DE : DEMO_CASE_ID_EN
}

export function demoPatientIdForLocale(locale: DemoLocale): string {
  return locale === 'de' ? DEMO_PATIENT_ID_DE : DEMO_PATIENT_ID_EN
}

export function demoPatientIdentityForLocale(locale: DemoLocale): DemoPatientIdentity {
  return DEMO_IDENTITIES[locale]
}

export function demoLocaleForCaseId(caseId: string | null | undefined): DemoLocale | null {
  if (caseId === DEMO_CASE_ID_DE) return 'de'
  if (caseId === DEMO_CASE_ID_EN) return 'en'
  return null
}

export function isDemoCaseId(caseId: string | null | undefined): boolean {
  if (!caseId) return false
  if (caseId === LEGACY_DEMO_CASE_ID) return true
  return (DEMO_CASE_IDS as readonly string[]).includes(caseId)
}

export function allDemoCaseIds(): readonly string[] {
  return DEMO_CASE_IDS
}

export function demoUserStateKey(userId: string): string {
  return `${DEMO_USER_STATE_KEY_PREFIX}:${userId.trim() || 'anonymous'}`
}

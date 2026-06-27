import { isDemoPublisherEmail } from '../../shared/demoPublisher'
import { getCaseMeta } from '../hooks/useCaseRegistry'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'
import {
  allDemoCaseIds,
  demoCaseIdForLocale,
  demoPatientIdentityForLocale,
  isDemoCaseId,
  LEGACY_DEMO_CASE_ID,
} from './constants'
import { uiLanguageToDemoLocale, type DemoLocale } from './demoLocale'

export function isDemoCase(caseId: string | undefined | null): boolean {
  if (!caseId) return false
  if (isDemoCaseId(caseId)) return true
  const meta = getCaseMeta(caseId)
  return Boolean(meta?.isDemoPatient)
}

export function isDemoPublisherUserEmail(email: string | undefined | null): boolean {
  const envValue = import.meta.env.VITE_DEMO_PUBLISHER_EMAIL
    ? String(import.meta.env.VITE_DEMO_PUBLISHER_EMAIL)
    : undefined
  return isDemoPublisherEmail(email, envValue)
}

export function isDemoCaseReadOnly(
  caseId: string | undefined | null,
  userEmail?: string | null,
): boolean {
  if (!isDemoCase(caseId)) return false
  if (isDemoPublisherUserEmail(userEmail)) return false
  return true
}

export function demoCaseLabel(): string {
  return loadStoredUiLanguage() === 'de' ? 'Synthetischer Demo-Fall' : 'Synthetic demo case'
}

export function demoPatientDisplayName(locale?: DemoLocale): string {
  const resolved = locale ?? uiLanguageToDemoLocale(loadStoredUiLanguage())
  const identity = demoPatientIdentityForLocale(resolved)
  return `${identity.vorname} ${identity.nachname}`
}

export function demoCaseIdForCurrentUi(): string {
  return demoCaseIdForLocale(uiLanguageToDemoLocale(loadStoredUiLanguage()))
}

export function isLegacyDemoCaseId(caseId: string): boolean {
  return caseId === LEGACY_DEMO_CASE_ID
}

export function allKnownDemoCaseIds(): readonly string[] {
  return [...allDemoCaseIds(), LEGACY_DEMO_CASE_ID]
}

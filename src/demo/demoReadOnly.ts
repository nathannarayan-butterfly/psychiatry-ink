import { isDemoPublisherEmail } from '../../shared/demoPublisher'
import { getCaseMeta } from '../hooks/useCaseRegistry'
import { DEMO_CASE_ID } from './constants'

export function isDemoCase(caseId: string | undefined | null): boolean {
  if (!caseId) return false
  if (caseId === DEMO_CASE_ID) return true
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
  return 'Synthetischer Demo-Fall'
}

export function demoPatientDisplayName(): string {
  return 'Max Demo'
}

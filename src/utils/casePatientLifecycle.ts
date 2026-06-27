import { archiveDemoPatient, isDemoCase, removeDemoPatient } from '../demo'
import { isDemoArchivedForUser } from '../demo/demoUserState'
import {
  getCaseMeta,
  replaceRegistryMap,
  upsertCaseMeta,
  type LocalCaseMeta,
} from '../hooks/useCaseRegistry'
import { deletePatientOnApi } from '../services/patientRegistryApi'
import { scheduleAccountRegistryUpload } from './accountBackup'
import { loadRegistryMapFromStorage, saveRegistryMapToStorage } from './caseRegistryStorage'
import { clearCaseStorage } from './clearCaseStorage'
import { DEMO_CASE_ID } from '../demo/constants'
import { deleteImportedFilesForCase } from './documentImport/importedFileStore'

/** Stale test fall — short id prefix only; never matches DEMO-CASE-0001. */
export const STALE_CASE_ID_PREFIX = '219918e0'

/** Previously retired demo IDs — kept empty so the canonical demo case can seed again. */
export const RETIRED_DEMO_CASE_IDS = [] as const

export function isStaleCaseId(caseId: string): boolean {
  if (caseId.startsWith(STALE_CASE_ID_PREFIX) && caseId !== DEMO_CASE_ID) return true
  return (RETIRED_DEMO_CASE_IDS as readonly string[]).includes(caseId)
}

export function isPatientCaseArchived(caseId: string, userId: string): boolean {
  if (isDemoCase(caseId)) return isDemoArchivedForUser(userId)
  return Boolean(getCaseMeta(caseId)?.archivedAt)
}

export function archivePatientCase(caseId: string, userId: string): void {
  if (isDemoCase(caseId)) {
    archiveDemoPatient(userId)
    return
  }
  upsertCaseMeta(caseId, { archivedAt: new Date().toISOString() })
}

/**
 * Reverse of {@link archivePatientCase}: clears the `archivedAt` marker so the
 * case returns to the active patient list. Only registry metadata is touched —
 * clinical vault data and the server case record are left intact.
 */
export function reactivatePatientCase(caseId: string, _userId: string): void {
  upsertCaseMeta(caseId, { archivedAt: undefined })
}

export async function deletePatientCasePermanently(caseId: string, userId: string): Promise<void> {
  if (isDemoCase(caseId)) {
    await removeDemoPatient(userId)
    return
  }

  await clearCaseStorage(caseId)
  await deleteImportedFilesForCase(caseId)
  const map = loadRegistryMapFromStorage()
  delete map[caseId]
  saveRegistryMapToStorage(map)
  replaceRegistryMap(map)
  scheduleAccountRegistryUpload()

  try {
    await deletePatientOnApi(caseId)
  } catch {
    // offline — local removal is enough for dashboard until the next successful sync
  }
}

/** True when a case should survive a non-demo purge (synthetic demo only). */
export function isProtectedDemoCaseId(caseId: string): boolean {
  return caseId === DEMO_CASE_ID || isDemoCase(caseId)
}

/**
 * Remove every local patient case except the synthetic demo case (DEMO-CASE-0001).
 */
export async function purgeNonDemoPatientCases(userId: string): Promise<string[]> {
  const removed: string[] = []
  const map = loadRegistryMapFromStorage()

  for (const caseId of Object.keys(map)) {
    if (isProtectedDemoCaseId(caseId)) continue
    await deletePatientCasePermanently(caseId, userId)
    removed.push(caseId)
  }

  return removed
}

/**
 * Remove every local patient case. Clears registry metadata, case-scoped
 * localStorage, IndexedDB vault keys, and attempts server-side PatientCase
 * deletion via API.
 */
export async function purgeLocalPatientCases(userId: string): Promise<string[]> {
  const removed: string[] = []
  const map = loadRegistryMapFromStorage()

  for (const caseId of Object.keys(map)) {
    await deletePatientCasePermanently(caseId, userId)
    removed.push(caseId)
  }

  return removed
}

/** One-time-safe removal of stale test cases from the local registry + storage. */
export async function removeStaleCasesFromRegistry(): Promise<string[]> {
  const removed: string[] = []
  const map = loadRegistryMapFromStorage()

  for (const caseId of Object.keys(map)) {
    if (!isStaleCaseId(caseId)) continue
    delete map[caseId]
    removed.push(caseId)
    await clearCaseStorage(caseId)
  }

  if (removed.length > 0) {
    saveRegistryMapToStorage(map)
    replaceRegistryMap(map)
    for (const caseId of removed) {
      try {
        await deletePatientOnApi(caseId)
      } catch {
        // ignore — may not exist on server
      }
    }
  }

  return removed
}

export function patientCaseMetaToEditData(meta: LocalCaseMeta | null) {
  return {
    vorname: meta?.localVorname ?? '',
    nachname: meta?.localNachname ?? '',
    name: meta?.localName ?? '',
    geburtsdatum: meta?.localGeburtsdatum ?? '',
    geschlecht: meta?.localGeschlecht ?? ('' as const),
  }
}

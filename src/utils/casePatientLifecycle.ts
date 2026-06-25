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
import { deleteImportedFilesForCase } from './documentImport/importedFileStore'

/** Stale test fall — short id prefix only. */
export const STALE_CASE_ID_PREFIX = '219918e0'

/**
 * Retired demo patient ("Anna Demo"). The demo seeding code was removed, but the
 * case can still linger in a device's local registry (and, for org members, in the
 * encrypted org case vault) from before removal. Treating it as stale auto-purges it
 * on next load so it never reappears in the dashboard.
 */
export const RETIRED_DEMO_CASE_IDS = ['DEMO-CASE-0001'] as const

export function isStaleCaseId(caseId: string): boolean {
  if (caseId.startsWith(STALE_CASE_ID_PREFIX)) return true
  return (RETIRED_DEMO_CASE_IDS as readonly string[]).includes(caseId)
}

export function isPatientCaseArchived(caseId: string, _userId: string): boolean {
  return Boolean(getCaseMeta(caseId)?.archivedAt)
}

export function archivePatientCase(caseId: string, _userId: string): void {
  upsertCaseMeta(caseId, { archivedAt: new Date().toISOString() })
}

export async function deletePatientCasePermanently(caseId: string, _userId: string): Promise<void> {
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

/**
 * One-time-safe removal of retired cases (the 219918e0 test fall and the retired
 * "Anna Demo" demo patient) from the local registry + case-scoped storage.
 */
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

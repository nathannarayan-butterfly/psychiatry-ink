import type { DiagnosisSearchHit } from '../services/diagnosisReferenceApi'
import { fetchCrosswalkByIcd10 } from '../services/diagnosisReferenceApi'
import { scheduleDiagnosisImprints } from './clinicalImprint'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from './encryptedLocalStore'

export type CodingSystem = 'icd10' | 'icd11' | 'dsm'

export interface CodingValue {
  code: string
  label: string
  /** When true, auto-sync from ICD-10 will not overwrite this value. */
  overridden: boolean
}

export interface DiagnoseEntry {
  id: string
  icd10: CodingValue
  icd11: CodingValue
  dsm: CodingValue
  createdAt: string
  updatedAt: string
}

function storageKey(caseId: string): string {
  return `diagnosen:${caseId}`
}

/**
 * Synchronous decrypted mirror of the encrypted-at-rest localStorage durability copy.
 * Because Web Crypto is async, `loadDiagnosen`/`saveDiagnosen` operate on this shadow
 * (keeping their synchronous contract intact) while the on-disk bytes are ciphertext.
 * Filled by `hydrateDiagnosenFromEncryptedLocal` (vault mount) and by `saveDiagnosen`.
 */
const localShadow = new Map<string, DiagnoseEntry[]>()

function emptyCoding(): CodingValue {
  return { code: '', label: '', overridden: false }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a diagnosis from a database search hit (full crosswalk). */
export function createDiagnoseFromHit(hit: DiagnosisSearchHit): DiagnoseEntry {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    icd10: { code: hit.icd10Code, label: hit.icd10Label, overridden: false },
    icd11: { code: hit.icd11Code, label: hit.icd11Label, overridden: false },
    dsm: { code: hit.dsmCode, label: hit.dsmLabel, overridden: false },
    createdAt: now,
    updatedAt: now,
  }
}

/** Free-text diagnosis — ICD-10 label only; clinician fills or maps later. */
export async function createDiagnoseFreeText(text: string, code = ''): Promise<DiagnoseEntry> {
  const now = new Date().toISOString()
  const trimmed = text.trim()
  const catalog = code ? await fetchCrosswalkByIcd10(code) : null

  if (catalog) return createDiagnoseFromHit(catalog)

  return {
    id: generateId(),
    icd10: { code: code.trim(), label: trimmed, overridden: true },
    icd11: emptyCoding(),
    dsm: emptyCoding(),
    createdAt: now,
    updatedAt: now,
  }
}

/** Re-sync ICD-11 and DSM from database crosswalk when not overridden. */
export async function syncDerivedCodingsAsync(entry: DiagnoseEntry): Promise<DiagnoseEntry> {
  const crosswalk = await fetchCrosswalkByIcd10(entry.icd10.code)
  if (!crosswalk) return entry

  const now = new Date().toISOString()
  return {
    ...entry,
    updatedAt: now,
    icd11: entry.icd11.overridden
      ? entry.icd11
      : { code: crosswalk.icd11Code, label: crosswalk.icd11Label, overridden: false },
    dsm: entry.dsm.overridden
      ? entry.dsm
      : { code: crosswalk.dsmCode, label: crosswalk.dsmLabel, overridden: false },
  }
}

/** @deprecated Use syncDerivedCodingsAsync — sync lookup without API. */
export function syncDerivedCodings(entry: DiagnoseEntry): DiagnoseEntry {
  return entry
}

export function getActiveCoding(entry: DiagnoseEntry, system: CodingSystem): CodingValue {
  return entry[system]
}

function migrateLegacyEntry(raw: Record<string, unknown>): DiagnoseEntry | null {
  if (raw.icd10 && raw.icd11 && raw.dsm) {
    return raw as unknown as DiagnoseEntry
  }

  const icdCode = typeof raw.icdCode === 'string' ? raw.icdCode : ''
  const description = typeof raw.description === 'string' ? raw.description : ''
  if (!icdCode && !description) return null

  const now =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
  return {
    id: typeof raw.id === 'string' ? raw.id : generateId(),
    icd10: { code: icdCode, label: description || icdCode, overridden: true },
    icd11: emptyCoding(),
    dsm: emptyCoding(),
    createdAt: now,
    updatedAt: now,
  }
}

/** Normalize a parsed array, migrating any legacy diagnosis shapes. */
function normalizeEntries(parsed: unknown): DiagnoseEntry[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => migrateLegacyEntry(item as Record<string, unknown>))
    .filter((e): e is DiagnoseEntry => e !== null)
}

export function loadDiagnosen(caseId: string): DiagnoseEntry[] {
  return localShadow.get(caseId) ?? []
}

export function saveDiagnosen(caseId: string, entries: DiagnoseEntry[]): void {
  localShadow.set(caseId, entries)
  // Persist the durability copy encrypted-at-rest (async, best-effort).
  void writeEncryptedJson(storageKey(caseId), entries)
  scheduleDiagnosisImprints(caseId, entries)
  void import('./isdm').then(({ scheduleIsdmRebuild }) => {
    scheduleIsdmRebuild(caseId, 'diagnosis')
  })
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) the durability copy into the
 * synchronous shadow. Wired into `hydrateLocalClinicalCaches` so it runs before the vault
 * applies its snapshot; does not clobber a shadow already populated by a newer write.
 */
export async function hydrateDiagnosenFromEncryptedLocal(caseId: string): Promise<void> {
  try {
    const persisted = await readOrMigrateEncryptedJson<unknown[]>(storageKey(caseId))
    if (persisted === null) return
    if (!localShadow.has(caseId)) localShadow.set(caseId, normalizeEntries(persisted))
  } catch {
    // Hydration is best-effort; the vault remains the authoritative source.
  }
}

/**
 * Load diagnoses from device-local storage only (never synced to server). Ensures the
 * encrypted durability copy is decrypted into the shadow first, so consumers that mount
 * before the workspace-vault hydration (e.g. the diagnosis widget) still get persisted data.
 */
export async function loadDiagnosenAsync(caseId: string): Promise<DiagnoseEntry[]> {
  await hydrateDiagnosenFromEncryptedLocal(caseId)
  return loadDiagnosen(caseId)
}

import { bundledDiagnosisTitle } from '../data/bundledDiagnosisTitles'
import { lookupCatalogLabel } from '../data/diagnosisCatalog'
import type { DiagnosisSearchHit } from '../services/diagnosisReferenceApi'
import type { CatalogueSystem, DiagnosisRole, DiagnosisStatus } from '../types/diagnosisCatalogue'
import type { IcdTitleVersion } from '../../shared/icdTitle'
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
  /** Catalogue entry id when selected from diagnosis catalogue. */
  diagnosisEntryId?: string
  /** Primary coding system for this case diagnosis. */
  codingSystem?: CatalogueSystem
  catalogueVersion?: string
  displayLabel?: string
  diagnosisStatus?: DiagnosisStatus
  diagnosisRole?: DiagnosisRole
  clinicianId?: string
  /** Whether an authored criteria tree is linked (catalogue metadata). */
  criteriaAvailable?: boolean
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
const diagnosenRevisions = new Map<string, number>()
const diagnosenListeners = new Map<string, Set<() => void>>()

function bumpDiagnosenRevision(caseId: string): void {
  diagnosenRevisions.set(caseId, (diagnosenRevisions.get(caseId) ?? 0) + 1)
  diagnosenListeners.get(caseId)?.forEach((listener) => listener())
}

/** Subscribe to diagnosis list changes for a case (save, hydrate, vault apply). */
export function subscribeDiagnosenChange(caseId: string, listener: () => void): () => void {
  if (!diagnosenListeners.has(caseId)) diagnosenListeners.set(caseId, new Set())
  diagnosenListeners.get(caseId)!.add(listener)
  return () => {
    diagnosenListeners.get(caseId)?.delete(listener)
  }
}

export function getDiagnosenRevision(caseId: string): number {
  return diagnosenRevisions.get(caseId) ?? 0
}

function bundledLabel(code: string, version: IcdTitleVersion): string | null {
  return lookupCatalogLabel(code, version) || bundledDiagnosisTitle(code, version)
}

/** Demote legacy/migration `overridden` flags that only cached stale shorthand labels. */
function demoteStaleOverride(coding: CodingValue, version: IcdTitleVersion): CodingValue {
  if (!coding.overridden) return coding

  const code = coding.code.trim()
  const stored = coding.label.trim()
  if (!code) return coding

  const official = bundledLabel(code, version)
  if (!official) return coding

  if (!stored || stored === code || stored === official) {
    return { ...coding, overridden: false }
  }

  if (official.length > stored.length * 1.5) {
    return { ...coding, overridden: false }
  }

  return coding
}

export function sanitizeDiagnoseEntry(entry: DiagnoseEntry): DiagnoseEntry {
  return {
    ...entry,
    icd10: demoteStaleOverride(entry.icd10, 'icd10'),
    icd11: demoteStaleOverride(entry.icd11, 'icd11'),
    dsm: demoteStaleOverride(entry.dsm, 'dsm'),
  }
}

function emptyCoding(): CodingValue {
  return { code: '', label: '', overridden: false }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Map catalogue system to legacy coding slot. */
export function catalogueSystemToCodingSlot(system: CatalogueSystem): CodingSystem {
  if (system === 'ICD11MMS') return 'icd11'
  if (system === 'DSM5TR') return 'dsm'
  return 'icd10'
}

/** Create a diagnosis from a catalogue search hit — independent coding, no crosswalk sync. */
export function createDiagnoseFromHit(
  hit: DiagnosisSearchHit,
  activeSystem?: CodingSystem,
): DiagnoseEntry {
  const now = new Date().toISOString()
  const slot = activeSystem ?? catalogueSystemToCodingSlot(hit.system)

  const entry: DiagnoseEntry = {
    id: generateId(),
    diagnosisEntryId: hit.diagnosisEntryId,
    codingSystem: hit.system,
    catalogueVersion: hit.catalogueVersion,
    displayLabel: hit.title,
    diagnosisStatus: 'confirmed',
    diagnosisRole: 'main',
    criteriaAvailable: hit.criteriaAvailable,
    icd10: emptyCoding(),
    icd11: emptyCoding(),
    dsm: emptyCoding(),
    createdAt: now,
    updatedAt: now,
  }

  entry[slot] = { code: hit.code, label: hit.title, overridden: false }
  return sanitizeDiagnoseEntry(entry)
}

/** Free-text diagnosis — label only; no forced crosswalk mapping. */
export async function createDiagnoseFreeText(
  text: string,
  code = '',
  system: CodingSystem = 'icd10',
): Promise<DiagnoseEntry> {
  const now = new Date().toISOString()
  const trimmed = text.trim()
  const coding: CodingValue = { code: code.trim(), label: trimmed, overridden: true }

  const entry: DiagnoseEntry = {
    id: generateId(),
    codingSystem: system === 'icd11' ? 'ICD11MMS' : system === 'dsm' ? 'DSM5TR' : 'ICD10GM',
    displayLabel: trimmed,
    diagnosisStatus: 'confirmed',
    diagnosisRole: 'main',
    icd10: emptyCoding(),
    icd11: emptyCoding(),
    dsm: emptyCoding(),
    createdAt: now,
    updatedAt: now,
  }
  entry[system] = coding
  return sanitizeDiagnoseEntry(entry)
}

/** Re-sync ICD-11 and DSM from crosswalk only for legacy entries without independent coding. */
export async function syncDerivedCodingsAsync(entry: DiagnoseEntry): Promise<DiagnoseEntry> {
  if (entry.codingSystem === 'ICD11MMS' || entry.codingSystem === 'DSM5TR') return entry
  if (!entry.icd10.code.trim()) return entry

  const { fetchCrosswalkByIcd10 } = await import('../services/diagnosisReferenceApi')
  const crosswalk = await fetchCrosswalkByIcd10(entry.icd10.code)
  if (!crosswalk) return entry

  const now = new Date().toISOString()
  return {
    ...entry,
    updatedAt: now,
    icd11: entry.icd11.overridden
      ? entry.icd11
      : { code: '', label: '', overridden: false },
    dsm: entry.dsm.overridden ? entry.dsm : { code: '', label: '', overridden: false },
  }
}

/** @deprecated Use syncDerivedCodingsAsync — sync lookup without API. */
export function syncDerivedCodings(entry: DiagnoseEntry): DiagnoseEntry {
  return entry
}

export function getActiveCoding(entry: DiagnoseEntry, system: CodingSystem): CodingValue {
  if (entry.codingSystem) {
    const primary = catalogueSystemToCodingSlot(entry.codingSystem)
    if (system === primary) return entry[system]
  }
  return entry[system]
}

/** Whether this entry was coded independently (no forced ICD-10↔ICD-11 mapping). */
export function isIndependentCatalogueEntry(entry: DiagnoseEntry): boolean {
  return Boolean(entry.codingSystem && entry.codingSystem !== 'LOCAL')
}

/** True when a coding carries any clinician-entered content (code or label). */
export function codingHasContent(coding: CodingValue): boolean {
  return Boolean(coding.code.trim() || coding.label.trim())
}

/** True when any of an entry's codings (ICD-10/ICD-11/DSM) carries content. */
export function hasAnyCodingContent(entry: DiagnoseEntry): boolean {
  return codingHasContent(entry.icd10) || codingHasContent(entry.icd11) || codingHasContent(entry.dsm)
}

/**
 * Pick the primary coding to display for an entry and the version it belongs to.
 * Prefers ICD-10, then ICD-11, then DSM by content presence. Centralizing this
 * here keeps display surfaces from reaching into raw `entry.*.label` fields.
 */
export function selectPrimaryCoding(
  entry: DiagnoseEntry,
): { coding: CodingValue; version: CodingSystem } {
  if (entry.codingSystem) {
    const slot = catalogueSystemToCodingSlot(entry.codingSystem)
    if (codingHasContent(entry[slot])) return { coding: entry[slot], version: slot }
  }
  if (codingHasContent(entry.icd10)) return { coding: entry.icd10, version: 'icd10' }
  if (codingHasContent(entry.icd11)) return { coding: entry.icd11, version: 'icd11' }
  return { coding: entry.dsm, version: 'dsm' }
}

function migrateLegacyEntry(raw: Record<string, unknown>): DiagnoseEntry | null {
  if (raw.icd10 && raw.icd11 && raw.dsm) {
    return sanitizeDiagnoseEntry(raw as unknown as DiagnoseEntry)
  }

  const icdCode = typeof raw.icdCode === 'string' ? raw.icdCode : ''
  const description = typeof raw.description === 'string' ? raw.description : ''
  if (!icdCode && !description) return null

  const now =
    typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
  const hasCode = Boolean(icdCode.trim())
  const hasDescription = Boolean(description.trim())

  return sanitizeDiagnoseEntry({
    id: typeof raw.id === 'string' ? raw.id : generateId(),
    icd10: {
      code: icdCode,
      label: description || icdCode,
      // Only free-text-without-code is a true clinician override; coded legacy rows
      // kept shorthand in `description` and must not block WHO/bundled resolution.
      overridden: !hasCode && hasDescription,
    },
    icd11: emptyCoding(),
    dsm: emptyCoding(),
    createdAt: now,
    updatedAt: now,
  })
}

/** Normalize a parsed array, migrating any legacy diagnosis shapes. */
export function normalizeDiagnoseEntries(parsed: unknown): DiagnoseEntry[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => migrateLegacyEntry(item as Record<string, unknown>))
    .filter((e): e is DiagnoseEntry => e !== null)
}

function normalizeEntries(parsed: unknown): DiagnoseEntry[] {
  return normalizeDiagnoseEntries(parsed)
}

export function loadDiagnosen(caseId: string): DiagnoseEntry[] {
  return localShadow.get(caseId) ?? []
}

export function saveDiagnosen(caseId: string, entries: DiagnoseEntry[]): void {
  const normalized = normalizeEntries(entries)
  localShadow.set(caseId, normalized)
  bumpDiagnosenRevision(caseId)
  // Persist the durability copy encrypted-at-rest (async, best-effort).
  void writeEncryptedJson(storageKey(caseId), normalized)
  scheduleDiagnosisImprints(caseId, normalized)
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
    if (!localShadow.has(caseId)) {
      localShadow.set(caseId, normalizeEntries(persisted))
      bumpDiagnosenRevision(caseId)
    }
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

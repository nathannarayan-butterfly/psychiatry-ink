import type { ClinicalImprintIndex, ClinicalImprintRecord } from '../../types/clinicalImprint'
import { getActiveCaseId } from '../caseContext'

export const CLINICAL_IMPRINT_INDEX_VERSION = 1

/** In-memory session cache — persisted only via encrypted workspace vault. */
const imprintCache = new Map<string, ClinicalImprintIndex>()

export type ClinicalImprintPersistHook = (caseId: string) => void

let persistHook: ClinicalImprintPersistHook | null = null

export function registerClinicalImprintPersistHook(hook: ClinicalImprintPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

export function imprintKeyFor(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`
}

export function emptyClinicalImprintIndex(): ClinicalImprintIndex {
  return {
    version: CLINICAL_IMPRINT_INDEX_VERSION,
    updatedAt: new Date().toISOString(),
    imprints: [],
  }
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadClinicalImprintIndex(caseId?: string): ClinicalImprintIndex {
  const resolved = resolveCaseId(caseId)
  const cached = imprintCache.get(resolved)
  if (!cached) return emptyClinicalImprintIndex()

  return {
    version: cached.version ?? CLINICAL_IMPRINT_INDEX_VERSION,
    updatedAt: cached.updatedAt ?? new Date().toISOString(),
    imprints: cached.imprints.filter(
      (item) =>
        typeof item.imprintKey === 'string' &&
        typeof item.readableClinicalSentence === 'string' &&
        typeof item.caseId === 'string',
    ),
  }
}

export function saveClinicalImprintIndex(index: ClinicalImprintIndex, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const payload: ClinicalImprintIndex = {
    version: CLINICAL_IMPRINT_INDEX_VERSION,
    updatedAt: new Date().toISOString(),
    imprints: index.imprints,
  }
  imprintCache.set(resolved, payload)
  notifyPersist(resolved)
}

export function upsertClinicalImprint(
  record: Omit<ClinicalImprintRecord, 'imprintKey'> & { imprintKey?: string },
  caseId?: string,
): ClinicalImprintRecord {
  const resolvedCaseId = resolveCaseId(caseId ?? record.caseId)
  const imprintKey = record.imprintKey ?? imprintKeyFor(record.sourceType, record.sourceId)
  const nextRecord: ClinicalImprintRecord = { ...record, caseId: resolvedCaseId, imprintKey }

  const index = loadClinicalImprintIndex(resolvedCaseId)
  const existingIdx = index.imprints.findIndex((item) => item.imprintKey === imprintKey)
  if (existingIdx >= 0) {
    const previous = index.imprints[existingIdx]
    index.imprints[existingIdx] = {
      ...nextRecord,
      createdAt: previous.createdAt,
    }
  } else {
    index.imprints.push(nextRecord)
  }

  saveClinicalImprintIndex(index, resolvedCaseId)
  return nextRecord
}

export function applyClinicalImprintIndex(index: ClinicalImprintIndex, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  imprintCache.set(resolved, {
    version: index.version ?? CLINICAL_IMPRINT_INDEX_VERSION,
    updatedAt: index.updatedAt ?? new Date().toISOString(),
    imprints: index.imprints,
  })
}

export function removeImprintsForSourcePrefix(
  caseId: string,
  sourceType: string,
  sourceIdPrefix: string,
): void {
  const index = loadClinicalImprintIndex(caseId)
  const prefix = imprintKeyFor(sourceType, sourceIdPrefix)
  index.imprints = index.imprints.filter((item) => !item.imprintKey.startsWith(prefix))
  saveClinicalImprintIndex(index, caseId)
}

export function clearClinicalImprintCache(caseId?: string): void {
  if (caseId) {
    imprintCache.delete(caseId)
    return
  }
  imprintCache.clear()
}

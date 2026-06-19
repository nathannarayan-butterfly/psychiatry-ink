import { safeGetItem, safeSetItem } from './safeStorage'
import type { CodingSystem } from './diagnosenArchive'

export const DEFAULT_DIAGNOSEN_CODING_SYSTEM: CodingSystem = 'icd10'

export type VisibleCodingSystem = 'icd10' | 'icd11'

/** Coding systems exposed in Diagnosen UI (DSM-5-TR deferred). */
export const VISIBLE_CODING_SYSTEMS: readonly VisibleCodingSystem[] = ['icd10', 'icd11']

const VISIBLE_SYSTEM_SET = new Set<CodingSystem>(VISIBLE_CODING_SYSTEMS)

export function isVisibleCodingSystem(system: CodingSystem): system is VisibleCodingSystem {
  return VISIBLE_SYSTEM_SET.has(system)
}

/** Map stored/legacy values to a user-selectable coding system. */
export function normalizeVisibleCodingSystem(system: CodingSystem): VisibleCodingSystem {
  return system === 'icd11' ? 'icd11' : 'icd10'
}

function storageKey(caseId: string): string {
  return `diagnosen-system:${caseId}`
}

export function loadDiagnosenCodingSystem(caseId: string): CodingSystem {
  const raw = safeGetItem(storageKey(caseId)) as CodingSystem | null
  if (raw && isVisibleCodingSystem(raw)) return raw
  return DEFAULT_DIAGNOSEN_CODING_SYSTEM
}

export function saveDiagnosenCodingSystem(caseId: string, system: CodingSystem): void {
  safeSetItem(storageKey(caseId), normalizeVisibleCodingSystem(system))
}

export const DIAGNOSEN_CODING_SYSTEM_EVENT = 'psychiatry-ink:diagnosen-coding-system'

export function dispatchDiagnosenCodingSystemChange(caseId: string, system: CodingSystem): void {
  window.dispatchEvent(
    new CustomEvent(DIAGNOSEN_CODING_SYSTEM_EVENT, { detail: { caseId, system } }),
  )
}

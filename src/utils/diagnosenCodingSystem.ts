import { safeGetItem, safeSetItem } from './safeStorage'
import type { CodingSystem } from './diagnosenArchive'

export const DEFAULT_DIAGNOSEN_CODING_SYSTEM: CodingSystem = 'icd10'

const VALID_SYSTEMS: CodingSystem[] = ['icd10', 'icd11', 'dsm']

function storageKey(caseId: string): string {
  return `diagnosen-system:${caseId}`
}

export function loadDiagnosenCodingSystem(caseId: string): CodingSystem {
  const raw = safeGetItem(storageKey(caseId))
  if (raw && VALID_SYSTEMS.includes(raw as CodingSystem)) {
    return raw as CodingSystem
  }
  return DEFAULT_DIAGNOSEN_CODING_SYSTEM
}

export function saveDiagnosenCodingSystem(caseId: string, system: CodingSystem): void {
  safeSetItem(storageKey(caseId), system)
}

export const DIAGNOSEN_CODING_SYSTEM_EVENT = 'psychiatry-ink:diagnosen-coding-system'

export function dispatchDiagnosenCodingSystemChange(caseId: string, system: CodingSystem): void {
  window.dispatchEvent(
    new CustomEvent(DIAGNOSEN_CODING_SYSTEM_EVENT, { detail: { caseId, system } }),
  )
}

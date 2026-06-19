import { useSyncExternalStore } from 'react'
import { getDiagnosenRevision, subscribeDiagnosenChange } from '../utils/diagnosenArchive'

/** Re-render when diagnoses for a case are hydrated, saved, or applied from vault. */
export function useDiagnosenRevision(caseId: string): number {
  return useSyncExternalStore(
    (onStoreChange) => subscribeDiagnosenChange(caseId, onStoreChange),
    () => getDiagnosenRevision(caseId),
    () => 0,
  )
}

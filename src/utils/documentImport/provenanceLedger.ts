/**
 * Import provenance ledger.
 *
 * Every clinical item created by accepting an import candidate gets a provenance
 * record here, keyed by case. This guarantees the acceptance criterion that
 * "all accepted items retain source provenance" even for module types whose own
 * data model has no provenance field (diagnoses, medication, lab, verlauf).
 *
 * Records are looked up by the created entity's id (`targetEntityId`) so any UI
 * can show "imported from <file>, section <x>, accepted by <y> at <t>".
 *
 * Stored in plaintext localStorage (provenance metadata is non-PHI: filenames
 * and structural locations, never clinical content).
 */
import type { ImportProvenance } from '../../schemas/documentImport/envelope'
import { caseStorageKey } from '../caseContext'

const LEDGER_KEY = 'psychiatry-ink:importProvenance'

export interface ProvenanceLedgerEntry extends ImportProvenance {
  /** Id of the clinical entity that was created (DokumentEntry id, DiagnoseEntry id, …). */
  targetEntityId: string
}

export const IMPORT_PROVENANCE_CHANGED_EVENT = 'psychiatry-ink:import-provenance:changed'

function ledgerKey(caseId: string): string {
  return caseStorageKey(LEDGER_KEY, caseId)
}

export function loadProvenanceLedger(caseId: string): ProvenanceLedgerEntry[] {
  try {
    const raw = localStorage.getItem(ledgerKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProvenanceLedgerEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLedger(caseId: string, entries: ProvenanceLedgerEntry[]): void {
  try {
    localStorage.setItem(ledgerKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore quota errors
  }
  try {
    window.dispatchEvent(new CustomEvent(IMPORT_PROVENANCE_CHANGED_EVENT, { detail: { caseId } }))
  } catch {
    // not in a browser context
  }
}

export function appendProvenance(caseId: string, entry: ProvenanceLedgerEntry): void {
  saveLedger(caseId, [entry, ...loadProvenanceLedger(caseId)])
}

export function findProvenanceForEntity(
  caseId: string,
  targetEntityId: string,
): ProvenanceLedgerEntry | null {
  return loadProvenanceLedger(caseId).find((e) => e.targetEntityId === targetEntityId) ?? null
}

export function listProvenanceForDocument(
  caseId: string,
  sourceDocumentId: string,
): ProvenanceLedgerEntry[] {
  return loadProvenanceLedger(caseId).filter((e) => e.sourceDocumentId === sourceDocumentId)
}

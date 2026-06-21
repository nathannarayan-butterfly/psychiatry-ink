/**
 * Snapshot + rollback model for the live JSONB KB tables
 * (`knowledge_base_drugs`, `knowledge_base_preparations`).
 *
 * A snapshot is a verbatim capture of every row we are about to touch, written
 * to a timestamped JSON file BEFORE any write. The rollback restores those rows
 * exactly (full `data` JSONB + denormalized columns), which removes any `*En`
 * fields and provenance markers added by the translation pass.
 *
 * All DB access is injected so this module is pure and unit-testable.
 */

import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
} from '../../src/types/knowledgeBase'

export interface DrugSnapshotRow {
  id: string
  data: KnowledgeBaseDrug
  collection_id: string | null
  generic_name: string | null
}

export interface PreparationSnapshotRow {
  id: string
  data: MedicationMarketAvailability
  substance_id: string | null
  country_code: string | null
  verification_status: string | null
  generic_name: string | null
  trade_name: string | null
}

export interface KbSnapshot {
  createdAt: string
  source: string
  drugs: DrugSnapshotRow[]
  preparations: PreparationSnapshotRow[]
}

export function buildSnapshot(params: {
  drugs: DrugSnapshotRow[]
  preparations: PreparationSnapshotRow[]
  createdAt?: string
  source?: string
}): KbSnapshot {
  return {
    createdAt: params.createdAt ?? new Date().toISOString(),
    source: params.source ?? 'knowledge_base_drugs+knowledge_base_preparations',
    drugs: params.drugs,
    preparations: params.preparations,
  }
}

export class SnapshotValidationError extends Error {}

/**
 * Hard gate run BEFORE any write: the snapshot must be non-empty and its row
 * counts must match what we just read from the live tables. Throws otherwise.
 */
export function assertSnapshotComplete(
  snapshot: KbSnapshot,
  expected: { drugs: number; preparations: number },
): void {
  if (snapshot.drugs.length === 0 && snapshot.preparations.length === 0) {
    throw new SnapshotValidationError('Snapshot is empty — refusing to proceed.')
  }
  if (snapshot.drugs.length !== expected.drugs) {
    throw new SnapshotValidationError(
      `Snapshot drug count ${snapshot.drugs.length} != expected ${expected.drugs}.`,
    )
  }
  if (snapshot.preparations.length !== expected.preparations) {
    throw new SnapshotValidationError(
      `Snapshot preparation count ${snapshot.preparations.length} != expected ${expected.preparations}.`,
    )
  }
  for (const row of snapshot.drugs) {
    if (!row.id || row.data == null) {
      throw new SnapshotValidationError(`Snapshot drug row missing id/data (id=${row.id}).`)
    }
  }
  for (const row of snapshot.preparations) {
    if (!row.id || row.data == null) {
      throw new SnapshotValidationError(`Snapshot preparation row missing id/data (id=${row.id}).`)
    }
  }
}

export interface SnapshotRestorePort {
  upsertDrugs: (rows: DrugSnapshotRow[]) => Promise<void>
  upsertPreparations: (rows: PreparationSnapshotRow[]) => Promise<void>
}

export interface RestoreResult {
  drugsRestored: number
  preparationsRestored: number
}

/**
 * Restore every row in the snapshot through the injected port. Rows are written
 * in chunks to keep payloads bounded.
 */
export async function restoreSnapshot(
  snapshot: KbSnapshot,
  port: SnapshotRestorePort,
  opts: { chunkSize?: number } = {},
): Promise<RestoreResult> {
  const chunkSize = opts.chunkSize ?? 50

  for (let i = 0; i < snapshot.drugs.length; i += chunkSize) {
    await port.upsertDrugs(snapshot.drugs.slice(i, i + chunkSize))
  }
  for (let i = 0; i < snapshot.preparations.length; i += chunkSize) {
    await port.upsertPreparations(snapshot.preparations.slice(i, i + chunkSize))
  }

  return {
    drugsRestored: snapshot.drugs.length,
    preparationsRestored: snapshot.preparations.length,
  }
}

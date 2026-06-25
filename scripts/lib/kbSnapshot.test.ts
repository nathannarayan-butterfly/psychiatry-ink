import { describe, expect, it } from 'vitest'
import {
  assertSnapshotComplete,
  buildSnapshot,
  restoreSnapshot,
  SnapshotValidationError,
  type DrugSnapshotRow,
  type PreparationSnapshotRow,
  type SnapshotRestorePort,
} from './kbSnapshot'
import { translateKbItem, type TranslateBatchFn } from './kbEnglishTranslation'

const passthrough: TranslateBatchFn = async (inputs) => {
  const out: Record<string, string> = {}
  for (const [id, text] of Object.entries(inputs)) out[id] = `EN:${text}`
  return out
}

function drugRow(): DrugSnapshotRow {
  return {
    id: 'd1',
    collection_id: 'c1',
    generic_name: 'Risperidon',
    data: { id: 'd1', genericName: 'Risperidon', drugClass: 'Atypisch', verificationStatus: 'verified' } as never,
  }
}

function prepRow(): PreparationSnapshotRow {
  return {
    id: 'p1',
    substance_id: 's1',
    country_code: 'DE',
    verification_status: 'imported_verified',
    generic_name: 'Risperidon',
    trade_name: '',
    data: { id: 'p1', genericName: 'Risperidon', dosageForm: 'Tabletten' } as never,
  }
}

describe('assertSnapshotComplete', () => {
  it('passes when counts match', () => {
    const snap = buildSnapshot({ drugs: [drugRow()], preparations: [prepRow()] })
    expect(() => assertSnapshotComplete(snap, { drugs: 1, preparations: 1 })).not.toThrow()
  })

  it('throws on empty snapshot', () => {
    const snap = buildSnapshot({ drugs: [], preparations: [] })
    expect(() => assertSnapshotComplete(snap, { drugs: 0, preparations: 0 })).toThrow(SnapshotValidationError)
  })

  it('throws on count mismatch', () => {
    const snap = buildSnapshot({ drugs: [drugRow()], preparations: [] })
    expect(() => assertSnapshotComplete(snap, { drugs: 2, preparations: 0 })).toThrow(SnapshotValidationError)
  })
})

describe('restoreSnapshot round-trip', () => {
  it('restores original data after a translation mutated it', async () => {
    const original = drugRow()
    const snapshot = buildSnapshot({
      drugs: [JSON.parse(JSON.stringify(original)) as DrugSnapshotRow],
      preparations: [],
    })

    // Mutate the live copy as the translation pass would.
    const live = original.data as unknown as Record<string, unknown>
    await translateKbItem(live, passthrough, { timestamp: '2026-06-21T00:00:00.000Z' })
    expect(live.drugClassEn).toBe('EN:Atypisch')
    expect(live.enContentSource).toBe('machine')

    // In-memory "database" keyed by id.
    const db = new Map<string, DrugSnapshotRow>()
    db.set(original.id, original)

    const port: SnapshotRestorePort = {
      upsertDrugs: async (rows) => {
        for (const r of rows) {
          // emulate full-row overwrite (data JSONB replaced verbatim)
          db.set(r.id, JSON.parse(JSON.stringify(r)) as DrugSnapshotRow)
        }
      },
      upsertPreparations: async () => {},
    }

    const result = await restoreSnapshot(snapshot, port)
    expect(result.drugsRestored).toBe(1)

    const restored = db.get('d1')!.data as unknown as Record<string, unknown>
    expect(restored.drugClassEn).toBeUndefined()
    expect(restored.enContentSource).toBeUndefined()
    expect(restored.drugClass).toBe('Atypisch')
    expect(restored.verificationStatus).toBe('verified')
  })

  it('chunks large restores', async () => {
    const drugs = Array.from({ length: 7 }, (_, i) => ({ ...drugRow(), id: `d${i}` }))
    const snapshot = buildSnapshot({ drugs, preparations: [] })
    const batches: number[] = []
    const port: SnapshotRestorePort = {
      upsertDrugs: async (rows) => {
        batches.push(rows.length)
      },
      upsertPreparations: async () => {},
    }
    await restoreSnapshot(snapshot, port, { chunkSize: 3 })
    expect(batches).toEqual([3, 3, 1])
  })
})

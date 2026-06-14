/**
 * Bridge between Diagnostik Befunde archive and the Dokumente clinical archive.
 */

import type { BefundRecord } from '../types/befund'
import { loadDiagnostikBefunde } from './befundArchive'
import { buildBefundTitle, renderBefundContent } from './befundRender'
import {
  DOKUMENTE_ARCHIVE_CHANGED_EVENT,
  loadDokumente,
  type DokumentEntry,
} from './dokumenteArchive'
import { caseStorageKey } from './caseContext'

const DOKUMENTE_ARCHIVE_KEY = 'psychiatry-ink:dokumenteArchive'

function archiveKey(caseId: string): string {
  return caseStorageKey(DOKUMENTE_ARCHIVE_KEY, caseId)
}

function loadRawArchive(caseId: string): DokumentEntry[] {
  try {
    const raw = localStorage.getItem(archiveKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as DokumentEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRawArchive(caseId: string, entries: DokumentEntry[]): void {
  try {
    localStorage.setItem(archiveKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(
      new CustomEvent(DOKUMENTE_ARCHIVE_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // not in browser
  }
}

function toDokumentEntry(record: BefundRecord): Omit<DokumentEntry, 'id'> {
  return {
    caseId: record.caseId,
    category: 'untersuchungsbefunde',
    title: buildBefundTitle(record),
    content: renderBefundContent(record),
    date: record.updatedAt,
    source: record.status === 'vidert' ? 'manual' : 'draft',
    pageType: `befund-${record.type}`,
    sourceRefId: record.id,
    sectionLabel: record.status === 'vidert' ? 'Vidert' : 'Entwurf',
  }
}

/** Upsert a single befund into Dokumente by sourceRefId. */
export function syncBefundDokument(record: BefundRecord): DokumentEntry {
  const caseId = record.caseId
  const existing = loadRawArchive(caseId)
  const idx = existing.findIndex((e) => e.sourceRefId === record.id)
  const payload = toDokumentEntry(record)

  if (idx >= 0) {
    const updated: DokumentEntry = {
      ...existing[idx],
      ...payload,
      id: existing[idx].id,
    }
    const next = [...existing]
    next[idx] = updated
    next.sort((a, b) => b.date.localeCompare(a.date))
    saveRawArchive(caseId, next)
    return updated
  }

  const newEntry: DokumentEntry = {
    id: crypto.randomUUID(),
    ...payload,
  }
  saveRawArchive(caseId, [newEntry, ...existing])
  return newEntry
}

/** Backfill all diagnostik befunde into Dokumente (idempotent). */
export function syncAllBefundDokumente(caseId: string): number {
  const records = loadDiagnostikBefunde(caseId)
  let created = 0
  for (const record of records) {
    const existing = loadRawArchive(caseId)
    if (!existing.some((e) => e.sourceRefId === record.id)) {
      syncBefundDokument(record)
      created += 1
    }
  }
  return created
}

/** Remove mirrored dokument when befund is deleted. */
export function removeBefundDokument(caseId: string, sourceRefId: string): void {
  const existing = loadRawArchive(caseId)
  const next = existing.map((e) =>
    e.sourceRefId === sourceRefId ? { ...e, deleted: true } : e,
  )
  saveRawArchive(caseId, next)
}

export function findBefundDokument(caseId: string, sourceRefId: string): DokumentEntry | null {
  return loadDokumente(caseId).find((e) => e.sourceRefId === sourceRefId) ?? null
}

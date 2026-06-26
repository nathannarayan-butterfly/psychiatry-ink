/**
 * Bridge between the Diagnostik free-text Befunde archive (EEG / CCT / MRT)
 * and the Dokumente clinical archive, mirroring {@link befundDokumente} for the
 * structured EKG/EEG findings.
 */

import type { FreeTextBefundRecord } from '../types/freeTextBefund'
import { freeTextBefundTitle } from '../types/freeTextBefund'
import type { UiLanguage } from '../types/settings'
import { caseStorageKey } from './caseContext'
import { formatBefundDate } from './befundRender'
import {
  DOKUMENTE_ARCHIVE_CHANGED_EVENT,
  type DokumentEntry,
} from './dokumenteArchive'

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

function buildTitle(record: FreeTextBefundRecord, language?: UiLanguage): string {
  const base = freeTextBefundTitle(record.modality, language ?? 'de')
  const date = formatBefundDate(record.examDate)
  const draftSuffix =
    record.status === 'draft' ? (language === 'en' ? ' (draft)' : ' (Entwurf)') : ''
  return `${base} — ${date}${draftSuffix}`
}

function toDokumentEntry(
  record: FreeTextBefundRecord,
  language?: UiLanguage,
): Omit<DokumentEntry, 'id'> {
  const draftLabel = language === 'en' ? 'Draft' : 'Entwurf'
  const verifiedLabel = language === 'en' ? 'Verified' : 'Vidert'
  return {
    caseId: record.caseId,
    category: 'untersuchungsbefunde',
    title: buildTitle(record, language),
    content: record.text,
    date: record.updatedAt,
    source: record.status === 'vidert' ? 'manual' : 'draft',
    pageType: `befund-${record.modality}`,
    sourceRefId: record.id,
    sectionLabel: record.status === 'vidert' ? verifiedLabel : draftLabel,
  }
}

/** Upsert a single free-text befund into Dokumente by sourceRefId. */
export function syncFreeTextBefundDokument(
  record: FreeTextBefundRecord,
  language?: UiLanguage,
): DokumentEntry {
  const caseId = record.caseId
  const existing = loadRawArchive(caseId)
  const idx = existing.findIndex((e) => e.sourceRefId === record.id)
  const payload = toDokumentEntry(record, language)

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

/** Soft-remove the mirrored dokument when a free-text befund is deleted. */
export function removeFreeTextBefundDokument(
  caseId: string,
  sourceRefId: string,
): void {
  const existing = loadRawArchive(caseId)
  const next = existing.map((e) =>
    e.sourceRefId === sourceRefId ? { ...e, deleted: true } : e,
  )
  saveRawArchive(caseId, next)
}

/**
 * Verlauf Feed — append-only chronological feed of saved Verlaufsdokumentation entries.
 * Stored in localStorage under `verlaufFeed:{caseId}`.
 *
 * Separate from the encrypted vault on purpose: the feed is a lightweight read-only
 * audit trail derived from user saves. It does NOT contain patient-identifying data.
 */

import { caseStorageKey } from './caseContext'
import { scheduleVerlaufFeedImprint } from './clinicalImprint'

const VERLAUF_FEED_KEY = 'psychiatry-ink:verlaufFeed'
const VERLAUF_ANNOTATIONS_KEY = 'psychiatry-ink:verlaufAnnotations'
const VERLAUF_SORT_ORDER_KEY = 'psychiatry-ink:verlaufSortOrder'

/** Feed ordering preference. `newest` (default) matches the historical behavior. */
export type VerlaufSortOrder = 'newest' | 'oldest'

export function loadVerlaufSortOrder(): VerlaufSortOrder {
  try {
    return localStorage.getItem(VERLAUF_SORT_ORDER_KEY) === 'oldest' ? 'oldest' : 'newest'
  } catch {
    return 'newest'
  }
}

export function saveVerlaufSortOrder(order: VerlaufSortOrder): void {
  try {
    localStorage.setItem(VERLAUF_SORT_ORDER_KEY, order)
  } catch {
    // ignore storage quota errors
  }
}

import type { TherapyEntryAttribution } from '../types/therapy'

export interface VerlaufFeedEntry {
  id: string
  date: string       // ISO 8601
  content: string
  pageType: string   // documentTypeId, e.g. 'verlauf', 'therapie-verlauf'
  sectionLabel?: string
  /** Provenance: 'manual' = physician-typed, 'ai-accepted' = physician explicitly accepted AI output */
  source?: 'manual' | 'ai-accepted'
  /** Therapist attribution when created by allied therapist role. */
  attribution?: TherapyEntryAttribution
}

export type AnnotationType = 'bold' | 'italic' | 'underline' | 'highlight' | 'comment'

export interface VerlaufAnnotation {
  entryId: string
  startOffset: number
  endOffset: number
  type: AnnotationType
  color?: string     // for highlight
  comment?: string   // for comment annotations
  rangeText: string
}

function feedKey(caseId?: string): string {
  return caseStorageKey(VERLAUF_FEED_KEY, caseId)
}

function annotationsKey(caseId?: string): string {
  return caseStorageKey(VERLAUF_ANNOTATIONS_KEY, caseId)
}

export function loadVerlaufFeed(caseId?: string): VerlaufFeedEntry[] {
  try {
    const raw = localStorage.getItem(feedKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as VerlaufFeedEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e) => typeof e.id === 'string' && typeof e.date === 'string' && typeof e.content === 'string',
    )
  } catch {
    return []
  }
}

export function saveVerlaufFeed(entries: VerlaufFeedEntry[], caseId?: string): void {
  try {
    localStorage.setItem(feedKey(caseId), JSON.stringify(entries))
  } catch {
    // ignore storage quota errors
  }
}

export function appendVerlaufEntry(
  caseId: string,
  entry: Omit<VerlaufFeedEntry, 'id'>,
): VerlaufFeedEntry {
  const newEntry: VerlaufFeedEntry = {
    id: crypto.randomUUID(),
    ...entry,
  }
  const existing = loadVerlaufFeed(caseId)
  // Newest at start (index 0), oldest at end
  const next = [newEntry, ...existing]
  saveVerlaufFeed(next, caseId)
  scheduleVerlaufFeedImprint(caseId, newEntry)
  return newEntry
}

export function loadVerlaufAnnotations(caseId?: string): VerlaufAnnotation[] {
  try {
    const raw = localStorage.getItem(annotationsKey(caseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as VerlaufAnnotation[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveVerlaufAnnotations(annotations: VerlaufAnnotation[], caseId?: string): void {
  try {
    localStorage.setItem(annotationsKey(caseId), JSON.stringify(annotations))
  } catch {
    // ignore
  }
}

export function addVerlaufAnnotation(
  annotation: VerlaufAnnotation,
  caseId?: string,
): VerlaufAnnotation[] {
  const existing = loadVerlaufAnnotations(caseId)
  const next = [...existing, annotation]
  saveVerlaufAnnotations(next, caseId)
  return next
}

export function updateVerlaufEntry(
  id: string,
  content: string,
  caseId?: string,
): VerlaufFeedEntry[] {
  const existing = loadVerlaufFeed(caseId)
  const next = existing.map((e) => (e.id === id ? { ...e, content } : e))
  saveVerlaufFeed(next, caseId)
  return next
}

export function deleteVerlaufEntry(
  id: string,
  caseId?: string,
): VerlaufFeedEntry[] {
  const existing = loadVerlaufFeed(caseId)
  const next = existing.filter((e) => e.id !== id)
  saveVerlaufFeed(next, caseId)
  // Also purge annotations for this entry
  const annotations = loadVerlaufAnnotations(caseId)
  saveVerlaufAnnotations(annotations.filter((a) => a.entryId !== id), caseId)
  return next
}

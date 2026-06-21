/**
 * Verlauf Feed — append-only chronological feed of saved Verlaufsdokumentation entries.
 * Stored in localStorage under `verlaufFeed:{caseId}`.
 *
 * Separate from the encrypted vault on purpose: the feed is a lightweight read-only
 * audit trail derived from user saves. It does NOT contain patient-identifying data.
 */

import { caseStorageKey } from './caseContext'
import { scheduleVerlaufFeedImprint } from './clinicalImprint'
import {
  normalizeVerlaufAnnotation,
  type VerlaufCommentVisibility,
} from './verlaufAnnotationHelpers'

export type { VerlaufCommentVisibility }

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
import type { TodoPriority } from '../types/todo'

export type { TodoPriority }

export interface VerlaufFeedEntry {
  id: string
  date: string       // ISO 8601
  content: string
  pageType: string   // documentTypeId, e.g. 'verlauf', 'therapie-verlauf'
  sectionLabel?: string
  /** Visit context such as doctor name from "Visite mit …". */
  subheading?: string
  /** Provenance: 'manual' = physician-typed, 'ai-accepted' = physician explicitly accepted AI output */
  source?: 'manual' | 'ai-accepted'
  /** Therapist attribution when created by allied therapist role. */
  attribution?: TherapyEntryAttribution
}

export type AnnotationType = 'bold' | 'italic' | 'underline' | 'highlight' | 'comment' | 'todo'

export interface VerlaufAnnotation {
  id: string
  entryId: string
  startOffset: number
  endOffset: number
  type: AnnotationType
  color?: string     // for highlight
  comment?: string   // for comment annotations
  rangeText: string
  /** Who may see a comment annotation. Defaults to private when omitted. */
  visibility?: VerlaufCommentVisibility
  /** Required when visibility is `person`. */
  sharedWithUserId?: string
  authorUserId?: string
  createdAt?: string
  // --- todo annotations -----------------------------------------------------
  /** Task description for `todo` annotations (parallel to `comment`). */
  todoText?: string
  /** Priority for `todo` annotations. Defaults to `normal` when omitted. */
  priority?: TodoPriority
  /** Optional due date (YYYY-MM-DD). When set, the todo is mirrored into the central to-do list. */
  dueDate?: string | null
  /** Completion state for `todo` annotations. */
  done?: boolean
  /**
   * Id of the mirrored entry in the central to-do store (set only when a due
   * date is present). Used to keep both copies in sync on edit/delete.
   */
  linkedTodoId?: string | null
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
    return parsed.map(normalizeVerlaufAnnotation)
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
  annotation: Omit<VerlaufAnnotation, 'id'> & { id?: string },
  caseId?: string,
): VerlaufAnnotation[] {
  const existing = loadVerlaufAnnotations(caseId)
  const next = [...existing, normalizeVerlaufAnnotation(annotation as VerlaufAnnotation)]
  saveVerlaufAnnotations(next, caseId)
  return next
}

export function removeVerlaufAnnotation(id: string, caseId?: string): VerlaufAnnotation[] {
  const existing = loadVerlaufAnnotations(caseId)
  const next = existing.filter((ann) => ann.id !== id)
  saveVerlaufAnnotations(next, caseId)
  return next
}

export function removeVerlaufAnnotations(
  ids: string[],
  caseId?: string,
): VerlaufAnnotation[] {
  if (ids.length === 0) return loadVerlaufAnnotations(caseId)
  const idSet = new Set(ids)
  const existing = loadVerlaufAnnotations(caseId)
  const next = existing.filter((ann) => !idSet.has(ann.id))
  saveVerlaufAnnotations(next, caseId)
  return next
}

export function updateVerlaufAnnotationComment(
  id: string,
  comment: string,
  caseId?: string,
): VerlaufAnnotation[] {
  const existing = loadVerlaufAnnotations(caseId)
  const next = existing.map((ann) =>
    ann.id === id && ann.type === 'comment' ? { ...ann, comment } : ann,
  )
  saveVerlaufAnnotations(next, caseId)
  return next
}

/** Fields of a `todo` annotation that can be edited after creation. */
export interface VerlaufTodoPatch {
  todoText?: string
  priority?: TodoPriority
  dueDate?: string | null
  done?: boolean
  linkedTodoId?: string | null
}

export function updateVerlaufTodo(
  id: string,
  patch: VerlaufTodoPatch,
  caseId?: string,
): VerlaufAnnotation[] {
  const existing = loadVerlaufAnnotations(caseId)
  const next = existing.map((ann) =>
    ann.id === id && ann.type === 'todo'
      ? {
          ...ann,
          ...(patch.todoText !== undefined ? { todoText: patch.todoText } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
          ...(patch.done !== undefined ? { done: patch.done } : {}),
          ...(patch.linkedTodoId !== undefined ? { linkedTodoId: patch.linkedTodoId } : {}),
        }
      : ann,
  )
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

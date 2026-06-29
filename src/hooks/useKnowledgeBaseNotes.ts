import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KnowledgeBaseNotesStore, UserNote } from '../types/knowledgeBaseAnnotations'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseNotes'

/**
 * Same-window event broadcast when a KB note changes, so multiple mounted
 * surfaces (the inline reading-rail notepad and the global Notizen bubble, which
 * both bind to the same per-entry store) stay live without clobbering each
 * other. The payload carries the new HTML directly to sidestep a debounced-save
 * race on localStorage.
 */
const KB_NOTES_CHANGED_EVENT = 'psychiatry-ink:kb-notes-changed'

interface KbNotesChangedDetail {
  source: number
  userId: string
  medicationId: string
  html: string
}

/** Monotonic per-instance id so a writer ignores the echo of its own change. */
let kbNotesInstanceSeq = 0

/** Debounce window for persisting note edits to localStorage. */
const SAVE_DEBOUNCE_MS = 500

function loadStore(): KnowledgeBaseNotesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { notes: [] }
    const parsed = JSON.parse(raw) as Partial<KnowledgeBaseNotesStore>
    return { notes: Array.isArray(parsed.notes) ? parsed.notes : [] }
  } catch {
    return { notes: [] }
  }
}

function saveStore(store: KnowledgeBaseNotesStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore storage errors (quota / disabled storage)
  }
}

/**
 * Best-effort sanitization for locally-stored, single-user notes HTML.
 *
 * This is intentionally lightweight: notes never leave the user's browser and
 * are never rendered in another user's context, so we only guard against the
 * obvious foot-guns (script/style/iframe/event-handler injection) rather than
 * implementing a full allowlist sanitizer. The contentEditable surface itself
 * produces tame markup (b/i/u/span/font/div/br).
 */
export function sanitizeNotesHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2')
}

/**
 * Per-user, per-medication rich-text notes store, mirroring the localStorage
 * approach used by {@link useKnowledgeBaseAnnotations}. Absent notes resolve to
 * an empty string for backward compatibility. Writes are debounced so that
 * fast typing doesn't hammer localStorage.
 */
/** Replace (or drop, when empty) the note for one user+medication in a store. */
function mergeNote(
  store: KnowledgeBaseNotesStore,
  userId: string,
  medicationId: string,
  html: string,
): KnowledgeBaseNotesStore {
  const others = store.notes.filter(
    (n) => !(n.userId === userId && n.medicationId === medicationId),
  )
  if (!html.trim()) return { notes: others }
  const note: UserNote = { userId, medicationId, html, updatedAt: new Date().toISOString() }
  return { notes: [...others, note] }
}

export function useKnowledgeBaseNotes(medicationId: string | null) {
  const userId = useKnowledgeBaseUserId()
  const [store, setStore] = useState<KnowledgeBaseNotesStore>(loadStore)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const instanceIdRef = useRef<number>(0)
  if (instanceIdRef.current === 0) instanceIdRef.current = ++kbNotesInstanceSeq

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveStore(store), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [store])

  // Live-sync notes written by another mounted instance (e.g. the inline rail
  // notepad ↔ the global Notizen bubble bound to the same entry). The change
  // event carries the new HTML so we never read a not-yet-flushed localStorage.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<KbNotesChangedDetail>).detail
      if (!detail || detail.source === instanceIdRef.current) return
      if (detail.userId !== userId) return
      setStore((prev) => {
        const current =
          prev.notes.find((n) => n.userId === userId && n.medicationId === detail.medicationId)
            ?.html ?? ''
        if (current === detail.html) return prev
        return mergeNote(prev, userId, detail.medicationId, detail.html)
      })
    }
    window.addEventListener(KB_NOTES_CHANGED_EVENT, handler)
    return () => window.removeEventListener(KB_NOTES_CHANGED_EVENT, handler)
  }, [userId])

  const html = useMemo(() => {
    if (!medicationId) return ''
    return (
      store.notes.find((n) => n.userId === userId && n.medicationId === medicationId)?.html ?? ''
    )
  }, [store, userId, medicationId])

  const setHtml = useCallback(
    (nextHtml: string) => {
      if (!medicationId) return
      const sanitized = sanitizeNotesHtml(nextHtml)
      setStore((prev) => mergeNote(prev, userId, medicationId, sanitized))
      // Broadcast so sibling surfaces bound to the same entry update live.
      try {
        window.dispatchEvent(
          new CustomEvent<KbNotesChangedDetail>(KB_NOTES_CHANGED_EVENT, {
            detail: { source: instanceIdRef.current, userId, medicationId, html: sanitized },
          }),
        )
      } catch {
        // ignore environments without CustomEvent
      }
    },
    [medicationId, userId],
  )

  return { html, setHtml }
}

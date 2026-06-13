import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KnowledgeBaseNotesStore, UserNote } from '../types/knowledgeBaseAnnotations'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseNotes'

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
export function useKnowledgeBaseNotes(medicationId: string | null) {
  const userId = useKnowledgeBaseUserId()
  const [store, setStore] = useState<KnowledgeBaseNotesStore>(loadStore)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveStore(store), SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [store])

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
      setStore((prev) => {
        const others = prev.notes.filter(
          (n) => !(n.userId === userId && n.medicationId === medicationId),
        )
        if (!sanitized.trim()) {
          // Drop empty notes so we don't accumulate blank entries.
          return { notes: others }
        }
        const note: UserNote = {
          userId,
          medicationId,
          html: sanitized,
          updatedAt: new Date().toISOString(),
        }
        return { notes: [...others, note] }
      })
    },
    [medicationId, userId],
  )

  return { html, setHtml }
}

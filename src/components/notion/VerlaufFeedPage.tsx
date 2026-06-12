import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { showNotionToast } from './NotionToast'
import {
  addVerlaufAnnotation,
  appendVerlaufEntry,
  deleteVerlaufEntry,
  loadVerlaufAnnotations,
  loadVerlaufFeed,
  updateVerlaufEntry,
  type AnnotationType,
  type VerlaufAnnotation,
  type VerlaufFeedEntry,
} from '../../utils/verlaufFeed'
import {
  getActiveTimelineId,
  loadTimelinesList,
  saveTimelinesList,
} from '../../utils/timelinePersistence'
import type { TimelineEntry } from '../../types/timeline'
import { useClinicalFeedEvents } from '../../hooks/useClinicalFeedEvents'
import {
  clinicalEventTime,
  translateClinicalEventSource,
  type ClinicalEventSource,
  type ClinicalFeedEvent,
} from '../../utils/verlauf/clinicalEvents'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BubbleState {
  visible: boolean
  x: number
  y: number
  selectedText: string
  startOffset: number
  endOffset: number
  entryId: string
}

interface TimelinePopoverState {
  visible: boolean
  x: number
  y: number
  entryId: string
  entryDate: string
  selectedText: string
}

interface CommentPopoverState {
  visible: boolean
  x: number
  y: number
  entryId: string
  startOffset: number
  endOffset: number
  rangeText: string
}

interface CommentViewState {
  visible: boolean
  x: number
  y: number
  text: string
}

import {
  formatIsoTimestampDate,
  formatIsoTimestampTime,
  getSiteZonedParts,
} from '../../utils/siteTimezone'

const HIGHLIGHT_COLORS: { label: string; value: string; bg: string }[] = [
  { label: 'Gelb', value: 'yellow', bg: '#ffe066' },
  { label: 'Grün', value: 'green', bg: '#a8e6cf' },
  { label: 'Blau', value: 'blue', bg: '#aad4f5' },
  { label: 'Rosa', value: 'pink', bg: '#f5a0c4' },
]

// ---------------------------------------------------------------------------
// Annotation rendering — simplified: apply spans on top of plain text
// ---------------------------------------------------------------------------

function applyAnnotations(content: string, annotations: VerlaufAnnotation[]): string {
  if (annotations.length === 0) return escapeHtml(content)

  // Clamp offsets to the current content and drop stale ranges, then sort by
  // start offset so we can walk the content once.
  const sorted = annotations
    .map((a) => ({
      ...a,
      startOffset: Math.max(0, Math.min(a.startOffset, content.length)),
      endOffset: Math.max(0, Math.min(a.endOffset, content.length)),
    }))
    .filter((a) => a.endOffset > a.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset)

  let result = ''
  let cursor = 0

  for (const ann of sorted) {
    // Skip ranges fully consumed by an earlier (overlapping) annotation.
    if (ann.endOffset <= cursor) continue
    const start = Math.max(ann.startOffset, cursor)
    if (start > cursor) {
      result += escapeHtml(content.slice(cursor, start))
    }
    const snippet = escapeHtml(content.slice(start, ann.endOffset))
    result += wrapAnnotation(snippet, ann)
    cursor = ann.endOffset
  }

  if (cursor < content.length) {
    result += escapeHtml(content.slice(cursor))
  }

  return result
}

// Newlines are preserved as-is; `.verlauf-entry__body` uses `white-space:
// pre-wrap` so they render as line breaks. Keeping real "\n" characters means
// DOM text offsets map 1:1 onto `entry.content` for reliable annotation ranges.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapAnnotation(snippet: string, ann: VerlaufAnnotation): string {
  const styles: string[] = []
  const attrs: string[] = []

  if (ann.type === 'bold') styles.push('font-weight: 700')
  if (ann.type === 'italic') styles.push('font-style: italic')
  if (ann.type === 'underline') styles.push('text-decoration: underline')
  if (ann.type === 'highlight') {
    const color = HIGHLIGHT_COLORS.find((c) => c.value === ann.color)?.bg ?? '#ffe066'
    styles.push(`background: ${color}; border-radius: 2px; padding: 0 2px`)
  }
  if (ann.type === 'comment' && ann.comment) {
    styles.push(
      'border-bottom: 2px dotted #c57900; background: rgba(197,121,0,0.08); cursor: pointer',
    )
    attrs.push(`title="${escapeHtml(ann.comment)}"`)
    attrs.push(`data-comment="${escapeHtml(ann.comment)}"`)
  }

  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : ''
  return `<span style="${styles.join('; ')}"${attrStr}>${snippet}</span>`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BubbleToolbarProps {
  state: BubbleState
  onFormat: (type: AnnotationType, color?: string) => void
  onComment: () => void
  onCopy: () => void
  onCreateTimeline: () => void
  onClose: () => void
}

function BubbleToolbar({ state, onFormat, onComment, onCopy, onCreateTimeline, onClose }: BubbleToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-bubble"
      style={{ top: state.y, left: state.x }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--bold"
        title={t('verlaufEntryEdit') + ' — Fett'}
        onClick={() => onFormat('bold')}
      >
        B
      </button>
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--italic"
        title="Kursiv"
        onClick={() => onFormat('italic')}
      >
        I
      </button>
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--underline"
        title="Unterstrichen"
        onClick={() => onFormat('underline')}
      >
        U
      </button>
      <span className="verlauf-bubble__divider" />
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          className="verlauf-bubble__swatch"
          style={{ background: c.bg }}
          title={`${t('verlaufHighlight')} — ${c.label}`}
          onClick={() => onFormat('highlight', c.value)}
        />
      ))}
      <span className="verlauf-bubble__divider" />
      <button
        type="button"
        className="verlauf-bubble__btn"
        title={t('verlaufAnnotationComment')}
        onClick={onComment}
      >
        💬
      </button>
      <button
        type="button"
        className="verlauf-bubble__btn"
        title={t('verlaufBubbleCopy')}
        onClick={onCopy}
      >
        ⎘
      </button>
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--timeline"
        title={t('verlaufTimelineCreate')}
        onClick={onCreateTimeline}
      >
        ＋ Timeline
      </button>
    </div>
  )
}

interface TimelinePopoverProps {
  state: TimelinePopoverState
  caseId: string
  onClose: () => void
  timelineAddedLabel: string
}

function TimelinePopover({ state, caseId, onClose, timelineAddedLabel }: TimelinePopoverProps) {
  const [title, setTitle] = useState(state.selectedText.slice(0, 120))
  const [date, setDate] = useState(state.entryDate.slice(0, 10))
  const [note, setNote] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitle(state.selectedText.slice(0, 120))
    setDate(state.entryDate.slice(0, 10))
    setNote('')
  }, [state.selectedText, state.entryDate])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handleAdd = useCallback(() => {
    if (!title.trim()) return

    const timelines = loadTimelinesList(caseId)
    const activeId = getActiveTimelineId(caseId) ?? timelines[0]?.id

    // Build a ddmmyy dateValue from ISO date in site timezone
    let dateValue = ''
    let displayDate = ''
    try {
      const d = new Date(date)
      const { day, month, year } = getSiteZonedParts(d)
      const dd = String(day).padStart(2, '0')
      const mm = String(month).padStart(2, '0')
      const yy = String(year).slice(-2)
      dateValue = `${dd}${mm}${yy}`
      displayDate = `${dd}.${mm}.${yy}`
    } catch {
      dateValue = date
    }

    const newEntry: TimelineEntry = {
      id: crypto.randomUUID(),
      heading: title.trim(),
      subheading: note.trim(),
      priority: 'medium',
      dateKind: 'ddmmyy',
      dateValue,
      sortKey: Date.now(),
      displayDate,
      visible: true,
    }

    if (activeId) {
      const next = timelines.map((t) =>
        t.id === activeId
          ? { ...t, entries: [...t.entries, newEntry], updatedAt: new Date().toISOString() }
          : t,
      )
      saveTimelinesList(next, caseId)
    } else {
      const created = {
        id: crypto.randomUUID(),
        title: 'Timeline 1',
        layout: 'horizontal' as const,
        entries: [newEntry],
        updatedAt: new Date().toISOString(),
      }
      saveTimelinesList([created], caseId)
    }

    showNotionToast(timelineAddedLabel)
    onClose()
  }, [caseId, date, note, onClose, timelineAddedLabel, title])

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-popover"
      style={{ top: state.y, left: state.x }}
    >
      <p className="verlauf-popover__title">Timeline-Eintrag erstellen</p>
      <label className="verlauf-popover__label">
        Titel
        <input
          className="verlauf-popover__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </label>
      <label className="verlauf-popover__label">
        Datum
        <input
          className="verlauf-popover__input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="verlauf-popover__label">
        Notiz
        <textarea
          className="verlauf-popover__textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </label>
      <div className="verlauf-popover__actions">
        <button type="button" className="verlauf-popover__cancel" onClick={onClose}>
          Abbrechen
        </button>
        <button
          type="button"
          className="verlauf-popover__add"
          onClick={handleAdd}
          disabled={!title.trim()}
        >
          Hinzufügen
        </button>
      </div>
    </div>
  )
}

interface CommentPopoverProps {
  state: CommentPopoverState
  onSave: (comment: string) => void
  onClose: () => void
}

function CommentPopover({ state, onSave, onClose }: CommentPopoverProps) {
  const [comment, setComment] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setComment('')
  }, [state.entryId, state.startOffset])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-popover"
      style={{ top: state.y, left: state.x }}
    >
      <p className="verlauf-popover__title">Kommentar</p>
      <textarea
        className="verlauf-popover__textarea"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Kommentar eingeben…"
        autoFocus
      />
      <div className="verlauf-popover__actions">
        <button type="button" className="verlauf-popover__cancel" onClick={onClose}>
          Abbrechen
        </button>
        <button
          type="button"
          className="verlauf-popover__add"
          onClick={() => { if (comment.trim()) onSave(comment.trim()) }}
          disabled={!comment.trim()}
        >
          Speichern
        </button>
      </div>
    </div>
  )
}

interface CommentViewPopoverProps {
  state: CommentViewState
  onClose: () => void
}

function CommentViewPopover({ state, onClose }: CommentViewPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-popover verlauf-popover--comment-view"
      style={{ top: state.y, left: state.x }}
    >
      <p className="verlauf-popover__title">Kommentar</p>
      <p className="verlauf-popover__comment-text">{state.text}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry card
// ---------------------------------------------------------------------------

interface EntryCardProps {
  entry: VerlaufFeedEntry
  annotations: VerlaufAnnotation[]
  onSelection: (
    text: string,
    startOffset: number,
    endOffset: number,
    entryId: string,
    rect: DOMRect,
  ) => void
  onCommentView: (text: string, rect: DOMRect) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}

const EntryCard = memo(function EntryCard({
  entry,
  annotations,
  onSelection,
  onCommentView,
  onEdit,
  onDelete,
}: EntryCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(entry.content)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const entryAnnotations = useMemo(
    () => annotations.filter((a) => a.entryId === entry.id),
    [annotations, entry.id],
  )
  const htmlContent = useMemo(
    () => applyAnnotations(entry.content, entryAnnotations),
    [entry.content, entryAnnotations],
  )

  function handleMouseUp() {
    if (editing) return
    // Read the selection on the next animation frame so the browser has fully
    // committed the native selection first. This keeps drag-selecting smooth
    // (no synchronous work mid-gesture) and avoids stale/collapsed reads.
    requestAnimationFrame(() => {
      const container = ref.current
      if (!container) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

      const range = sel.getRangeAt(0)
      // Selection must start AND end inside this entry's body.
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        return
      }

      const selStr = sel.toString()
      if (!selStr.trim()) return

      // Character offset of the selection start within the entry's text. Because
      // the body uses `white-space: pre-wrap` with real "\n" characters and no
      // injected text, these offsets map 1:1 onto `entry.content`.
      const preRange = document.createRange()
      preRange.selectNodeContents(container)
      preRange.setEnd(range.startContainer, range.startOffset)
      const startOffset = preRange.toString().length
      const endOffset = startOffset + selStr.length

      const rect = range.getBoundingClientRect()
      onSelection(selStr.trim(), startOffset, endOffset, entry.id, rect)
    })
  }

  function handleBodyClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-comment]')
    if (!target) return
    const text = target.getAttribute('data-comment') ?? ''
    if (!text) return
    onCommentView(text, target.getBoundingClientRect())
  }

  function handleCopyEntry(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(entry.content)
  }

  function handleEditStart(e: React.MouseEvent) {
    e.stopPropagation()
    setEditText(entry.content)
    setEditing(true)
    setConfirmDelete(false)
  }

  function handleEditSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (editText.trim()) {
      onEdit(entry.id, editText.trim())
    }
    setEditing(false)
  }

  function handleEditCancel(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(false)
    setEditText(entry.content)
  }

  function handleDeleteRequest(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(true)
    setEditing(false)
  }

  function handleDeleteConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(entry.id)
  }

  function handleDeleteCancel(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <article className="verlauf-entry">
      <header className="verlauf-entry__header">
        <time className="verlauf-entry__date" dateTime={entry.date}>
          {formatIsoTimestampDate(entry.date)}
        </time>
        <span className="verlauf-entry__time">{formatIsoTimestampTime(entry.date)}</span>
        {entry.sectionLabel && (
          <span className="verlauf-entry__section">{entry.sectionLabel}</span>
        )}
        {entry.source === 'ai-accepted' && (
          <span className="verlauf-entry__ai-badge" title="KI-generierter Text, vom Arzt akzeptiert">
            KI
          </span>
        )}
        <span className="verlauf-entry__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="verlauf-entry__action-btn"
            title={t('verlaufEntryEdit')}
            onClick={handleEditStart}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            type="button"
            className="verlauf-entry__action-btn"
            title={t('verlaufEntryCopy')}
            onClick={handleCopyEntry}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button
            type="button"
            className="verlauf-entry__action-btn verlauf-entry__action-btn--delete"
            title={t('verlaufEntryDelete')}
            onClick={handleDeleteRequest}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </span>
      </header>

      {confirmDelete && (
        <div className="verlauf-entry__confirm-delete" onClick={(e) => e.stopPropagation()}>
          <span className="verlauf-entry__confirm-text">{t('verlaufDeleteConfirm')}</span>
          <button
            type="button"
            className="verlauf-entry__confirm-yes"
            onClick={handleDeleteConfirm}
          >
            {t('verlaufDeleteYes')}
          </button>
          <button
            type="button"
            className="verlauf-entry__confirm-no"
            onClick={handleDeleteCancel}
          >
            {t('verlaufEntryCancel')}
          </button>
        </div>
      )}

      {editing ? (
        <div className="verlauf-inline-editor" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="verlauf-inline-editor__textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={Math.max(3, editText.split('\n').length)}
            // biome-ignore lint/a11y/noAutofocus
            autoFocus
          />
          <div className="verlauf-inline-editor__actions">
            <button
              type="button"
              className="verlauf-inline-editor__cancel"
              onClick={handleEditCancel}
            >
              {t('verlaufEntryCancel')}
            </button>
            <button
              type="button"
              className="verlauf-inline-editor__save"
              onClick={handleEditSave}
              disabled={!editText.trim()}
            >
              {t('verlaufEntrySave')}
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={ref}
          className="verlauf-entry__body"
          // biome-ignore lint/security/noDangerouslySetInnerHtml
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          onMouseUp={handleMouseUp}
          onClick={handleBodyClick}
        />
      )}
    </article>
  )
})

// ---------------------------------------------------------------------------
// Derived (read-only) entry card — sourced from a Therapie section
// ---------------------------------------------------------------------------

interface DerivedEntryCardProps {
  event: ClinicalFeedEvent
  readonlyLabel: string
  copyLabel: string
}

const DerivedEntryCard = memo(function DerivedEntryCard({
  event,
  readonlyLabel,
  copyLabel,
}: DerivedEntryCardProps) {
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(`${event.title}: ${event.body}`)
  }

  return (
    <article className="verlauf-entry verlauf-entry--derived">
      <header className="verlauf-entry__header">
        <time className="verlauf-entry__date" dateTime={event.date}>
          {formatIsoTimestampDate(event.date)}
        </time>
        <span
          className={`verlauf-entry__source-badge verlauf-entry__source-badge--${event.source}`}
          title={readonlyLabel}
        >
          {event.sourceLabel}
        </span>
        <span className="verlauf-entry__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="verlauf-entry__action-btn"
            title={copyLabel}
            onClick={handleCopy}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </span>
      </header>
      <div className="verlauf-entry__body verlauf-entry__body--derived">
        <span className="verlauf-derived__title">{event.title}: </span>
        {event.body}
      </div>
    </article>
  )
})

// ---------------------------------------------------------------------------
// Unified feed model
// ---------------------------------------------------------------------------

type FeedSource = 'manuell' | ClinicalEventSource

type UnifiedItem =
  | { kind: 'manual'; id: string; ts: number; source: FeedSource; entry: VerlaufFeedEntry }
  | { kind: 'derived'; id: string; ts: number; source: FeedSource; event: ClinicalFeedEvent }

const ALL_FEED_SOURCES: FeedSource[] = [
  'manuell',
  'medikation',
  'psychotherapie',
  'komplementaer',
  'sozialtherapie',
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface VerlaufFeedPageProps {
  caseId: string
}

export function VerlaufFeedPage({ caseId }: VerlaufFeedPageProps) {
  const { t, language } = useTranslation()

  const derivedEvents = useClinicalFeedEvents(caseId)
  const [activeSources, setActiveSources] = useState<Set<FeedSource>>(
    () => new Set(ALL_FEED_SOURCES),
  )

  const [entries, setEntries] = useState<VerlaufFeedEntry[]>(() => loadVerlaufFeed(caseId))
  const [annotations, setAnnotations] = useState<VerlaufAnnotation[]>(() =>
    loadVerlaufAnnotations(caseId),
  )

  const [bubble, setBubble] = useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    startOffset: 0,
    endOffset: 0,
    entryId: '',
  })

  const [timelinePopover, setTimelinePopover] = useState<TimelinePopoverState>({
    visible: false,
    x: 0,
    y: 0,
    entryId: '',
    entryDate: '',
    selectedText: '',
  })

  const [commentPopover, setCommentPopover] = useState<CommentPopoverState>({
    visible: false,
    x: 0,
    y: 0,
    entryId: '',
    startOffset: 0,
    endOffset: 0,
    rangeText: '',
  })

  const [commentView, setCommentView] = useState<CommentViewState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  })

  // Reload when caseId changes
  useEffect(() => {
    setEntries(loadVerlaufFeed(caseId))
    setAnnotations(loadVerlaufAnnotations(caseId))
  }, [caseId])

  const closeBubble = useCallback(() => {
    setBubble((b) => ({ ...b, visible: false }))
  }, [])

  const closeTimelinePopover = useCallback(() => {
    setTimelinePopover((p) => ({ ...p, visible: false }))
  }, [])

  const closeCommentPopover = useCallback(() => {
    setCommentPopover((p) => ({ ...p, visible: false }))
  }, [])

  const closeCommentView = useCallback(() => {
    setCommentView((p) => ({ ...p, visible: false }))
  }, [])

  const handleCommentView = useCallback((text: string, rect: DOMRect) => {
    setCommentView({
      visible: true,
      x: Math.min(Math.max(rect.left, 12), window.innerWidth - 280),
      y: rect.bottom + 8,
      text,
    })
  }, [])

  const handleSelection = useCallback(
    (
      selectedText: string,
      startOffset: number,
      endOffset: number,
      entryId: string,
      rect: DOMRect,
    ) => {
      // The toolbar is `position: fixed` and rendered in a portal, so use
      // viewport coordinates directly (no scroll offset). Place it above the
      // selection, flipping below it when there is no room at the top.
      const TOOLBAR_GAP = 48
      const topCandidate = rect.top - TOOLBAR_GAP
      const y = topCandidate < 8 ? rect.bottom + 8 : topCandidate
      const x = Math.min(
        Math.max(rect.left + rect.width / 2, 90),
        window.innerWidth - 90,
      )
      setBubble({
        visible: true,
        x,
        y,
        selectedText,
        startOffset,
        endOffset,
        entryId,
      })
      setTimelinePopover((p) => ({ ...p, visible: false }))
      setCommentPopover((p) => ({ ...p, visible: false }))
      setCommentView((p) => ({ ...p, visible: false }))
    },
    [],
  )

  const handleFormat = useCallback(
    (type: AnnotationType, color?: string) => {
      const { entryId, startOffset, endOffset, selectedText } = bubble
      if (!entryId) return

      const annotation: VerlaufAnnotation = {
        entryId,
        startOffset,
        endOffset,
        type,
        color,
        rangeText: selectedText,
      }
      const next = addVerlaufAnnotation(annotation, caseId)
      setAnnotations(next)
      closeBubble()
    },
    [bubble, caseId, closeBubble],
  )

  const handleComment = useCallback(() => {
    const { entryId, startOffset, endOffset, selectedText, x, y } = bubble
    if (!entryId) return
    setCommentPopover({
      visible: true,
      x,
      y: y + 60,
      entryId,
      startOffset,
      endOffset,
      rangeText: selectedText,
    })
    closeBubble()
  }, [bubble, closeBubble])

  const handleSaveComment = useCallback(
    (comment: string) => {
      const { entryId, startOffset, endOffset, rangeText } = commentPopover
      const annotation: VerlaufAnnotation = {
        entryId,
        startOffset,
        endOffset,
        type: 'comment',
        comment,
        rangeText,
      }
      const next = addVerlaufAnnotation(annotation, caseId)
      setAnnotations(next)
      closeCommentPopover()
    },
    [caseId, closeCommentPopover, commentPopover],
  )

  const handleBubbleCopy = useCallback(() => {
    if (bubble.selectedText) {
      void navigator.clipboard.writeText(bubble.selectedText)
    }
    closeBubble()
  }, [bubble.selectedText, closeBubble])

  const handleCreateTimeline = useCallback(() => {
    const { entryId, selectedText, x, y } = bubble
    if (!entryId) return
    const entry = entries.find((e) => e.id === entryId)
    setTimelinePopover({
      visible: true,
      x,
      y: y + 60,
      entryId,
      entryDate: entry?.date ?? new Date().toISOString(),
      selectedText,
    })
    closeBubble()
  }, [bubble, closeBubble, entries])

  const handleEntryEdit = useCallback(
    (id: string, content: string) => {
      const next = updateVerlaufEntry(id, content, caseId)
      setEntries(next)
    },
    [caseId],
  )

  const handleEntryDelete = useCallback(
    (id: string) => {
      const next = deleteVerlaufEntry(id, caseId)
      setEntries(next)
      setAnnotations((prev) => prev.filter((a) => a.entryId !== id))
    },
    [caseId],
  )

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerDate, setComposerDate] = useState(() => new Date().toISOString().slice(0, 10))

  const handleComposerSave = useCallback(() => {
    if (!composerText.trim()) return
    const newEntry = appendVerlaufEntry(caseId, {
      date: composerDate ? new Date(composerDate).toISOString() : new Date().toISOString(),
      content: composerText.trim(),
      pageType: 'verlauf',
      source: 'manual',
    })
    setEntries((prev) => [newEntry, ...prev])
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerOpen(false)
  }, [caseId, composerDate, composerText])

  const handleComposerCancel = useCallback(() => {
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerOpen(false)
  }, [])

  const allItems = useMemo<UnifiedItem[]>(() => {
    const manualItems: UnifiedItem[] = entries.map((entry) => ({
      kind: 'manual',
      id: entry.id,
      ts: clinicalEventTime(entry.date),
      source: 'manuell',
      entry,
    }))
    const derivedItems: UnifiedItem[] = derivedEvents.map((event) => ({
      kind: 'derived',
      id: event.id,
      ts: clinicalEventTime(event.date),
      source: event.source,
      event,
    }))
    return [...manualItems, ...derivedItems].sort((a, b) => b.ts - a.ts)
  }, [entries, derivedEvents])

  // Sources that actually have at least one entry — these become filter chips.
  const availableSources = useMemo<FeedSource[]>(() => {
    const present = new Set<FeedSource>()
    for (const item of allItems) present.add(item.source)
    return ALL_FEED_SOURCES.filter((src) => present.has(src))
  }, [allItems])

  const visibleItems = useMemo(
    () => allItems.filter((item) => activeSources.has(item.source)),
    [allItems, activeSources],
  )

  const toggleSource = useCallback((source: FeedSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }, [])

  const selectAllSources = useCallback(() => {
    setActiveSources(new Set(ALL_FEED_SOURCES))
  }, [])

  const allActive = availableSources.every((src) => activeSources.has(src))

  const sourceChipLabel = useCallback(
    (source: FeedSource): string =>
      source === 'manuell'
        ? t('verlaufSourceManuell')
        : translateClinicalEventSource(language, source),
    [language, t],
  )

  const isEmpty = allItems.length === 0
  const derivedReadonlyLabel = t('verlaufDerivedReadonly')
  const copyLabel = t('verlaufEntryCopy')

  return (
    <div className="verlauf-feed-page">
      <header className="verlauf-feed-page__header">
        <h2 className="verlauf-feed-page__title">{t('verlaufFeedTitle')}</h2>
        {!composerOpen && (
          <button
            type="button"
            className="verlauf-feed-page__new-btn"
            onClick={(e) => { e.stopPropagation(); setComposerOpen(true) }}
          >
            ＋ {t('verlaufNewEntry')}
          </button>
        )}
      </header>

      {composerOpen && (
        <div className="verlauf-composer" onClick={(e) => e.stopPropagation()}>
          <div className="verlauf-composer__date-row">
            <label className="verlauf-composer__date-label">
              Datum
              <input
                type="date"
                className="verlauf-composer__date-input"
                value={composerDate}
                onChange={(e) => setComposerDate(e.target.value)}
              />
            </label>
          </div>
          <textarea
            className="verlauf-composer__textarea"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder={t('verlaufNewEntry') + '…'}
            rows={5}
            autoFocus
          />
          <div className="verlauf-composer__actions">
            <button
              type="button"
              className="verlauf-composer__cancel-btn"
              onClick={handleComposerCancel}
            >
              {t('verlaufEntryCancel')}
            </button>
            <button
              type="button"
              className="verlauf-composer__save-btn"
              onClick={handleComposerSave}
              disabled={!composerText.trim()}
            >
              {t('verlaufEntrySave')}
            </button>
          </div>
        </div>
      )}

      {availableSources.length > 1 && (
        <div className="verlauf-filter" role="group" aria-label={t('verlaufFilterLabel')}>
          <button
            type="button"
            className={`verlauf-filter__chip${allActive ? ' verlauf-filter__chip--active' : ''}`}
            onClick={selectAllSources}
          >
            {t('verlaufFilterAll')}
          </button>
          {availableSources.map((source) => (
            <button
              key={source}
              type="button"
              className={`verlauf-filter__chip verlauf-filter__chip--${source}${
                activeSources.has(source) ? ' verlauf-filter__chip--active' : ''
              }`}
              aria-pressed={activeSources.has(source)}
              onClick={() => toggleSource(source)}
            >
              {sourceChipLabel(source)}
            </button>
          ))}
        </div>
      )}

      {isEmpty && !composerOpen ? (
        <p className="verlauf-feed-page__empty">{t('verlaufFeedEmpty')}</p>
      ) : isEmpty ? null : (
        <div className="verlauf-feed-page__list">
          {visibleItems.map((item, index) => (
            <div key={item.id}>
              {item.kind === 'manual' ? (
                <EntryCard
                  entry={item.entry}
                  annotations={annotations}
                  onSelection={handleSelection}
                  onCommentView={handleCommentView}
                  onEdit={handleEntryEdit}
                  onDelete={handleEntryDelete}
                />
              ) : (
                <DerivedEntryCard
                  event={item.event}
                  readonlyLabel={derivedReadonlyLabel}
                  copyLabel={copyLabel}
                />
              )}
              {index < visibleItems.length - 1 && <div className="verlauf-entry__divider" />}
            </div>
          ))}
        </div>
      )}

      {createPortal(
        <>
          <BubbleToolbar
            state={bubble}
            onFormat={handleFormat}
            onComment={handleComment}
            onCopy={handleBubbleCopy}
            onCreateTimeline={handleCreateTimeline}
            onClose={closeBubble}
          />

          <TimelinePopover
            state={timelinePopover}
            caseId={caseId}
            onClose={closeTimelinePopover}
            timelineAddedLabel={t('verlaufTimelineAdded')}
          />

          <CommentPopover
            state={commentPopover}
            onSave={handleSaveComment}
            onClose={closeCommentPopover}
          />

          <CommentViewPopover state={commentView} onClose={closeCommentView} />
        </>,
        document.body,
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Re-export for auto-save integration
// ---------------------------------------------------------------------------
export { appendVerlaufEntry }

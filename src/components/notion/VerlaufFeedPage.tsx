import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { showNotionToast } from './NotionToast'
import {
  addVerlaufAnnotation,
  appendVerlaufEntry,
  loadVerlaufAnnotations,
  loadVerlaufFeed,
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

  // Build a list of ranges sorted by start offset
  const sorted = [...annotations].sort((a, b) => a.startOffset - b.startOffset)

  let result = ''
  let cursor = 0

  for (const ann of sorted) {
    if (ann.startOffset > cursor) {
      result += escapeHtml(content.slice(cursor, ann.startOffset))
    }
    const snippet = escapeHtml(content.slice(ann.startOffset, ann.endOffset))
    result += wrapAnnotation(snippet, ann)
    cursor = ann.endOffset
  }

  if (cursor < content.length) {
    result += escapeHtml(content.slice(cursor))
  }

  return result
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>')
}

function wrapAnnotation(snippet: string, ann: VerlaufAnnotation): string {
  const styles: string[] = []
  let title = ''

  if (ann.type === 'bold') styles.push('font-weight: 700')
  if (ann.type === 'italic') styles.push('font-style: italic')
  if (ann.type === 'underline') styles.push('text-decoration: underline')
  if (ann.type === 'highlight') {
    const color = HIGHLIGHT_COLORS.find((c) => c.value === ann.color)?.bg ?? '#ffe066'
    styles.push(`background: ${color}; border-radius: 2px; padding: 0 2px`)
  }
  if (ann.type === 'comment' && ann.comment) {
    styles.push('border-bottom: 2px dotted #c57900; cursor: help')
    title = ` title="${ann.comment.replace(/"/g, '&quot;')}"`
  }

  return `<span style="${styles.join('; ')}"${title}>${snippet}</span>`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BubbleToolbarProps {
  state: BubbleState
  onFormat: (type: AnnotationType, color?: string) => void
  onComment: () => void
  onCreateTimeline: () => void
  onClose: () => void
}

function BubbleToolbar({ state, onFormat, onComment, onCreateTimeline, onClose }: BubbleToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)

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
      className="verlauf-bubble"
      style={{ top: state.y, left: state.x }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--bold"
        title="Fett"
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
          title={c.label}
          onClick={() => onFormat('highlight', c.value)}
        />
      ))}
      <span className="verlauf-bubble__divider" />
      <button
        type="button"
        className="verlauf-bubble__btn"
        title="Kommentar"
        onClick={onComment}
      >
        💬
      </button>
      <button
        type="button"
        className="verlauf-bubble__btn verlauf-bubble__btn--timeline"
        title="Timeline-Eintrag erstellen"
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
}

function EntryCard({ entry, annotations, onSelection }: EntryCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const entryAnnotations = annotations.filter((a) => a.entryId === entry.id)
  const htmlContent = applyAnnotations(entry.content, entryAnnotations)

  function handleMouseUp() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

    const selectedText = sel.toString().trim()
    if (!selectedText) return

    // Ensure selection is within this entry
    const range = sel.getRangeAt(0)
    if (!ref.current?.contains(range.commonAncestorContainer)) return

    // Calculate text offsets within the raw content
    const textContent = ref.current.textContent ?? ''
    const selStr = sel.toString()
    const startOffset = textContent.indexOf(selStr)
    if (startOffset < 0) return
    const endOffset = startOffset + selStr.length

    const rect = range.getBoundingClientRect()
    onSelection(selectedText, startOffset, endOffset, entry.id, rect)
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
      </header>
      <div
        ref={ref}
        className="verlauf-entry__body"
        // biome-ignore lint/security/noDangerouslySetInnerHtml
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onMouseUp={handleMouseUp}
      />
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface VerlaufFeedPageProps {
  caseId: string
}

export function VerlaufFeedPage({ caseId }: VerlaufFeedPageProps) {
  const { t } = useTranslation()

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

  const handleSelection = useCallback(
    (
      selectedText: string,
      startOffset: number,
      endOffset: number,
      entryId: string,
      rect: DOMRect,
    ) => {
      const scrollY = window.scrollY
      setBubble({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top + scrollY - 48,
        selectedText,
        startOffset,
        endOffset,
        entryId,
      })
      setTimelinePopover((p) => ({ ...p, visible: false }))
      setCommentPopover((p) => ({ ...p, visible: false }))
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

  const isEmpty = entries.length === 0

  return (
    <div className="verlauf-feed-page" onClick={closeBubble}>
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

      {isEmpty && !composerOpen ? (
        <p className="verlauf-feed-page__empty">{t('verlaufFeedEmpty')}</p>
      ) : isEmpty ? null : (
        <div className="verlauf-feed-page__list">
          {entries.map((entry, index) => (
            <div key={entry.id}>
              <EntryCard
                entry={entry}
                annotations={annotations}
                onSelection={handleSelection}
              />
              {index < entries.length - 1 && <div className="verlauf-entry__divider" />}
            </div>
          ))}
        </div>
      )}

      <BubbleToolbar
        state={bubble}
        onFormat={handleFormat}
        onComment={handleComment}
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Re-export for auto-save integration
// ---------------------------------------------------------------------------
export { appendVerlaufEntry }

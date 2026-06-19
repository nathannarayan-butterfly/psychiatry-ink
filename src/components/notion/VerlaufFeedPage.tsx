import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
import { useDemoPatient } from '../../hooks/useDemoPatient'
import {
  SelectionActionBubble,
  selectionBubblePosition,
  type SelectionAction,
} from '../ui/SelectionActionBubble'
import { TherapyAttributionBadge } from '../therapy/TherapyAttributionBadge'
import { buildTherapyAttribution } from '../../types/therapy'
import { showNotionToast } from './NotionToast'
import {
  addVerlaufAnnotation,
  appendVerlaufEntry,
  deleteVerlaufEntry,
  loadVerlaufAnnotations,
  loadVerlaufFeed,
  loadVerlaufSortOrder,
  removeVerlaufAnnotations,
  saveVerlaufSortOrder,
  updateVerlaufEntry,
  type AnnotationType,
  type VerlaufAnnotation,
  type VerlaufCommentVisibility,
  type VerlaufFeedEntry,
  type VerlaufSortOrder,
} from '../../utils/verlaufFeed'
import {
  canViewAnnotation,
  derivedFeedEntryText,
  findOverlappingAnnotations,
  isFormatAnnotation,
} from '../../utils/verlaufAnnotationHelpers'
import { fetchTeamSnapshot, type TeamMemberProfile } from '../../services/orgApi'
import { VerlaufAnnotationPanel } from './VerlaufAnnotationPanel'
import { VerlaufAnnotationConnector } from './VerlaufAnnotationConnector'
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
} from '../../utils/verlauf/clinicalEvents'
import {
  DOKUMENTE_ARCHIVE_CHANGED_EVENT,
  loadDokumente,
  type DokumentEntry,
} from '../../utils/dokumenteArchive'
import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import { componentTranslations } from '../../data/componentTranslations'
import {
  VERLAUF_ENTRY_TYPE_OPTIONS,
  type VerlaufDocumentType,
} from './notionPages'
import type { UiLanguage } from '../../types/settings'
import { isInlineAiEditEnabled } from '../../utils/featureFlags'
import {
  getInlineAiEditShortcutLabel,
  isInlineAiEditShortcut,
} from '../../utils/notionKeyboardShortcuts'
import { applyEdit } from '../../utils/inlineAiEdit/buildEditContext'
import { resolveVerlaufAiEditTarget } from '../../utils/inlineAiEdit/verlaufInlineEdit'
import { useInlineAiEdit } from './inlineAiEdit/useInlineAiEdit'

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
  readonly: boolean
  overlappingAnnotations: VerlaufAnnotation[]
}

interface ContainedSelection {
  text: string
  startOffset: number
  endOffset: number
  rect: DOMRect
}

function readContainedSelection(container: HTMLElement): ContainedSelection | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return null
  }

  const selStr = sel.toString()
  const trimmedText = selStr.trim()
  if (!trimmedText) return null

  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const rawStart = preRange.toString().length
  const leadingWhitespace = selStr.length - selStr.trimStart().length
  const startOffset = rawStart + leadingWhitespace
  const endOffset = startOffset + trimmedText.length

  return {
    text: trimmedText,
    startOffset,
    endOffset,
    rect: range.getBoundingClientRect(),
  }
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

interface CommentSavePayload {
  comment: string
  visibility: VerlaufCommentVisibility
  sharedWithUserId?: string
}

interface AufnahmeSection {
  id: string
  label: string
  content: string
}

interface DerivedFeedEvent {
  /** Deterministic, stable id derived from the source record. */
  id: string
  /** ISO 8601 (or YYYY-MM-DD) — used for display and non-pinned sorting. */
  date: string
  source: Exclude<FeedSource, 'manuell'>
  sourceLabel: string
  title: string
  body: string
}

interface AufnahmeFeedEvent extends DerivedFeedEvent {
  source: 'aufnahmebefund'
  sections: AufnahmeSection[]
}

function aufnahmeSectionEntryId(eventId: string, sectionId: string): string {
  return `${eventId}:${sectionId}`
}

function isAufnahmeFeedEvent(event: DerivedFeedEvent): event is AufnahmeFeedEvent {
  return event.source === 'aufnahmebefund' && 'sections' in event
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
  const attrs: string[] = [`data-verlauf-annotation-id="${escapeHtml(ann.id)}"`]

  if (ann.type === 'bold') styles.push('font-weight: 700')
  if (ann.type === 'italic') styles.push('font-style: italic')
  if (ann.type === 'underline') styles.push('text-decoration: underline')
  if (ann.type === 'highlight') {
    const color = HIGHLIGHT_COLORS.find((c) => c.value === ann.color)?.bg ?? '#ffe066'
    styles.push(`background: ${color}; border-radius: 2px; padding: 0 2px`)
    attrs.push('data-verlauf-annot-type="highlight"')
  }
  if (ann.type === 'comment' && ann.comment) {
    styles.push(
      'border-bottom: 2px dotted #c57900; background: rgba(197,121,0,0.08); cursor: pointer',
    )
    attrs.push(`title="${escapeHtml(ann.comment)}"`)
    attrs.push(`data-comment="${escapeHtml(ann.comment)}"`)
    attrs.push('data-verlauf-annot-type="comment"')
  }

  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : ''
  return `<span class="verlauf-annot" style="${styles.join('; ')}"${attrStr}>${snippet}</span>`
}

// ---------------------------------------------------------------------------
// Popover placement — keep floating compose boxes inside the viewport
// ---------------------------------------------------------------------------

interface PopoverPlacement {
  ref: React.RefObject<HTMLDivElement | null>
  top: number
  left: number
  ready: boolean
}

/**
 * Anchors a fixed-position popover near a selection point (`anchorX`/`anchorY`
 * are viewport coordinates) while guaranteeing it never renders off-screen.
 *
 * The popover is centered horizontally on the anchor and placed just below it;
 * if it would overflow the bottom/right/top edge it is shifted back inside the
 * viewport with a small margin. We measure the real element (via a layout
 * effect + ResizeObserver) so the clamp stays correct as the content grows
 * (e.g. the comment composer revealing the "share with person" select).
 */
function usePopoverPlacement(
  open: boolean,
  anchorX: number,
  anchorY: number,
): PopoverPlacement {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: anchorY, left: anchorX, ready: false })

  useLayoutEffect(() => {
    if (!open) {
      setPlacement((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }
    const el = ref.current
    if (!el) return

    const place = () => {
      const node = ref.current
      if (!node) return
      const margin = 12
      const { width, height } = node.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left = anchorX - width / 2
      left = Math.max(margin, Math.min(left, vw - width - margin))

      let top = anchorY
      if (top + height > vh - margin) top = vh - height - margin
      if (top < margin) top = margin

      setPlacement({ top, left, ready: true })
    }

    place()
    window.addEventListener('resize', place)
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    observer?.observe(el)
    return () => {
      window.removeEventListener('resize', place)
      observer?.disconnect()
    }
  }, [open, anchorX, anchorY])

  return { ref, top: placement.top, left: placement.left, ready: placement.ready }
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
  onRemoveMarkierung: () => void
  onClose: () => void
  /** When provided, renders the voice-driven "Ask AI to edit selection" trigger. */
  onAiEdit?: () => void
}

function BubbleToolbar({
  state,
  onFormat,
  onComment,
  onCopy,
  onCreateTimeline,
  onRemoveMarkierung,
  onClose,
  onAiEdit,
}: BubbleToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { t, language } = useTranslation()

  useEffect(() => {
    if (!state.visible) return
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
  }, [onClose, state.visible])

  if (!state.visible || state.readonly) return null

  const canRemoveMarkierung = state.overlappingAnnotations.some((ann) => isFormatAnnotation(ann.type))

  return (
    <div
      ref={ref}
      className="verlauf-bubble"
      style={{ top: state.y, left: state.x }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {canRemoveMarkierung ? (
        <>
          <button
            type="button"
            className="verlauf-bubble__btn verlauf-bubble__btn--remove"
            title={t('verlaufRemoveMarkierung')}
            onClick={onRemoveMarkierung}
          >
            ✕
          </button>
          <span className="verlauf-bubble__divider" />
        </>
      ) : null}
      {onAiEdit ? (
        <>
          <button
            type="button"
            className="verlauf-bubble__btn verlauf-bubble__btn--ai-edit"
            onClick={onAiEdit}
            title={`${t('inlineAiEditAria')} (${getInlineAiEditShortcutLabel(language)})`}
            aria-label={`${t('inlineAiEditAria')} (${getInlineAiEditShortcutLabel(language)})`}
          >
            <Sparkles className="verlauf-bubble__ai-icon" strokeWidth={1.75} aria-hidden />
          </button>
          <span className="verlauf-bubble__divider" />
        </>
      ) : null}
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
  const { ref, top, left, ready } = usePopoverPlacement(state.visible, state.x, state.y)

  useEffect(() => {
    setTitle(state.selectedText.slice(0, 120))
    setDate(state.entryDate.slice(0, 10))
    setNote('')
  }, [state.selectedText, state.entryDate])

  useEffect(() => {
    if (!state.visible) return
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
  }, [onClose, ref, state.visible])

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
      style={{ top, left, visibility: ready ? undefined : 'hidden' }}
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
  teamMembers: TeamMemberProfile[]
  currentUserId: string | undefined
  onSave: (payload: CommentSavePayload) => void
  onClose: () => void
}

function CommentPopover({ state, teamMembers, currentUserId, onSave, onClose }: CommentPopoverProps) {
  const { t } = useTranslation()
  const [comment, setComment] = useState('')
  const [visibility, setVisibility] = useState<VerlaufCommentVisibility>('private')
  const [sharedWithUserId, setSharedWithUserId] = useState('')
  const { ref, top, left, ready } = usePopoverPlacement(state.visible, state.x, state.y)

  const shareableMembers = useMemo(
    () => teamMembers.filter((m) => m.userId !== currentUserId && m.status === 'active'),
    [currentUserId, teamMembers],
  )

  useEffect(() => {
    setComment('')
    setVisibility('private')
    setSharedWithUserId('')
  }, [state.entryId, state.startOffset])

  useEffect(() => {
    if (!state.visible) return
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
  }, [onClose, ref, state.visible])

  const canSave =
    comment.trim().length > 0 &&
    (visibility !== 'person' || sharedWithUserId.trim().length > 0)

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-popover verlauf-popover--comment-compose"
      style={{ top, left, visibility: ready ? undefined : 'hidden' }}
    >
      <p className="verlauf-popover__title">{t('verlaufAnnotationComment')}</p>
      <textarea
        className="verlauf-popover__textarea"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t('verlaufCommentPlaceholder')}
        autoFocus
      />
      <fieldset className="verlauf-popover__visibility">
        <legend className="verlauf-popover__visibility-legend">{t('verlaufCommentVisibilityLabel')}</legend>
        <label className="verlauf-popover__visibility-option">
          <input
            type="radio"
            name="verlauf-comment-visibility"
            checked={visibility === 'private'}
            onChange={() => setVisibility('private')}
          />
          {t('verlaufCommentVisibilityPrivate')}
        </label>
        <label className="verlauf-popover__visibility-option">
          <input
            type="radio"
            name="verlauf-comment-visibility"
            checked={visibility === 'team'}
            onChange={() => setVisibility('team')}
          />
          {t('verlaufCommentVisibilityTeam')}
        </label>
        <label className="verlauf-popover__visibility-option">
          <input
            type="radio"
            name="verlauf-comment-visibility"
            checked={visibility === 'person'}
            onChange={() => setVisibility('person')}
          />
          {t('verlaufCommentVisibilityPerson')}
        </label>
      </fieldset>
      {visibility === 'person' ? (
        <label className="verlauf-popover__label">
          {t('verlaufCommentShareWith')}
          <select
            className="verlauf-popover__input"
            value={sharedWithUserId}
            onChange={(e) => setSharedWithUserId(e.target.value)}
          >
            <option value="">{t('verlaufCommentShareWithPlaceholder')}</option>
            {shareableMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName?.trim() || member.email?.trim() || member.userId}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="verlauf-popover__actions">
        <button type="button" className="verlauf-popover__cancel" onClick={onClose}>
          {t('verlaufEntryCancel')}
        </button>
        <button
          type="button"
          className="verlauf-popover__add"
          onClick={() => {
            if (!canSave) return
            onSave({
              comment: comment.trim(),
              visibility,
              sharedWithUserId: visibility === 'person' ? sharedWithUserId : undefined,
            })
          }}
          disabled={!canSave}
        >
          {t('verlaufEntrySave')}
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
    readonly: boolean,
  ) => void
  onCommentSelect: (annotationId: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}

const EntryCard = memo(function EntryCard({
  entry,
  annotations,
  onSelection,
  onCommentSelect,
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
      const selection = readContainedSelection(container)
      if (!selection) return
      onSelection(
        selection.text,
        selection.startOffset,
        selection.endOffset,
        entry.id,
        selection.rect,
        false,
      )
    })
  }

  function handleBodyClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-verlauf-annotation-id]')
    if (!target) return
    const annotationId = target.getAttribute('data-verlauf-annotation-id')
    if (!annotationId) return
    if (target.getAttribute('data-verlauf-annot-type') === 'comment') {
      onCommentSelect(annotationId)
    }
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
        {entry.attribution ? <TherapyAttributionBadge attribution={entry.attribution} /> : null}
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
          data-verlauf-entry-id={entry.id}
          data-verlauf-selection-mode="full"
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
// Derived (read-only) entry card — sourced from another clinical section/document
// ---------------------------------------------------------------------------

interface DerivedEntryCardProps {
  event: DerivedFeedEvent
  annotations: VerlaufAnnotation[]
  readonlyLabel: string
  copyLabel: string
  editLabel: string
  deleteLabel: string
  onSelection: (
    text: string,
    startOffset: number,
    endOffset: number,
    entryId: string,
    rect: DOMRect,
    readonly: boolean,
  ) => void
  onCommentSelect: (annotationId: string) => void
  /** Derived rows mirror another module — manage routes there, never in place. */
  onNavigateToSource?: (source: DerivedFeedEvent['source']) => void
  annotatable: boolean
}

const DerivedEntryCard = memo(function DerivedEntryCard({
  event,
  annotations,
  readonlyLabel,
  copyLabel,
  editLabel,
  deleteLabel,
  onSelection,
  onCommentSelect,
  onNavigateToSource,
  annotatable,
}: DerivedEntryCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  const entryText = useMemo(
    () => derivedFeedEntryText(event.title, event.body),
    [event.title, event.body],
  )
  const entryAnnotations = useMemo(
    () => annotations.filter((a) => a.entryId === event.id),
    [annotations, event.id],
  )
  const htmlContent = useMemo(
    () => applyAnnotations(entryText, entryAnnotations),
    [entryText, entryAnnotations],
  )

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(entryText)
  }

  function handleNavigateToSource(e: React.MouseEvent) {
    e.stopPropagation()
    onNavigateToSource?.(event.source)
  }

  function handleMouseUp() {
    requestAnimationFrame(() => {
      const container = bodyRef.current
      if (!container) return
      const selection = readContainedSelection(container)
      if (!selection) return
      onSelection(
        selection.text,
        selection.startOffset,
        selection.endOffset,
        event.id,
        selection.rect,
        !annotatable,
      )
    })
  }

  function handleBodyClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-verlauf-annotation-id]')
    if (!target) return
    const annotationId = target.getAttribute('data-verlauf-annotation-id')
    if (!annotationId) return
    if (target.getAttribute('data-verlauf-annot-type') === 'comment') {
      onCommentSelect(annotationId)
    }
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
          {onNavigateToSource ? (
            <>
              <button
                type="button"
                className="verlauf-entry__action-btn"
                title={editLabel}
                onClick={handleNavigateToSource}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                type="button"
                className="verlauf-entry__action-btn verlauf-entry__action-btn--delete"
                title={deleteLabel}
                onClick={handleNavigateToSource}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </>
          ) : null}
        </span>
      </header>
      <div
        ref={bodyRef}
        className="verlauf-entry__body verlauf-entry__body--derived"
        data-verlauf-entry-id={event.id}
        data-verlauf-selection-mode={annotatable ? 'full' : 'copy-only'}
        // biome-ignore lint/security/noDangerouslySetInnerHtml
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onMouseUp={handleMouseUp}
        onClick={handleBodyClick}
      />
    </article>
  )
})

// ---------------------------------------------------------------------------
// Aufnahmebefund (Anamnese) — single collapsible block with annotation support
// ---------------------------------------------------------------------------

interface AufnahmeEntryCardProps {
  event: AufnahmeFeedEvent
  annotations: VerlaufAnnotation[]
  readonlyLabel: string
  copyLabel: string
  onSelection: EntryCardProps['onSelection']
  onCommentSelect: EntryCardProps['onCommentSelect']
  onNavigateToSource?: (source: DerivedFeedEvent['source']) => void
}

const AufnahmeEntryCard = memo(function AufnahmeEntryCard({
  event,
  annotations,
  readonlyLabel,
  copyLabel,
  onSelection,
  onCommentSelect,
  onNavigateToSource,
}: AufnahmeEntryCardProps) {
  const { t } = useTranslation()
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(event.body)
  }

  function handleNavigateToSource(e: React.MouseEvent) {
    e.stopPropagation()
    onNavigateToSource?.(event.source)
  }

  function handleSectionMouseUp(sectionId: string) {
    requestAnimationFrame(() => {
      const container = sectionRefs.current.get(sectionId)
      if (!container) return
      const selection = readContainedSelection(container)
      if (!selection) return
      onSelection(
        selection.text,
        selection.startOffset,
        selection.endOffset,
        aufnahmeSectionEntryId(event.id, sectionId),
        selection.rect,
        false,
      )
    })
  }

  function handleBodyClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-verlauf-annotation-id]')
    if (!target) return
    const annotationId = target.getAttribute('data-verlauf-annotation-id')
    if (!annotationId) return
    if (target.getAttribute('data-verlauf-annot-type') === 'comment') {
      onCommentSelect(annotationId)
    }
  }

  return (
    <article className="verlauf-entry verlauf-entry--aufnahme">
      <header className="verlauf-entry__header">
        <time className="verlauf-entry__date" dateTime={event.date}>
          {formatIsoTimestampDate(event.date)}
        </time>
        <span
          className="verlauf-entry__source-badge verlauf-entry__source-badge--aufnahmebefund"
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
          {onNavigateToSource ? (
            <>
              <button
                type="button"
                className="verlauf-entry__action-btn"
                title={t('verlaufEditInSource')}
                onClick={handleNavigateToSource}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                type="button"
                className="verlauf-entry__action-btn verlauf-entry__action-btn--delete"
                title={t('verlaufDeleteInSource')}
                onClick={handleNavigateToSource}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </>
          ) : null}
        </span>
      </header>

      <details className="verlauf-anamnese">
        <summary className="verlauf-anamnese__summary">
          <span className="verlauf-anamnese__chevron" aria-hidden>
            ▸
          </span>
          <span className="verlauf-anamnese__title">{t('dokumenteCategoryAnamnese')}</span>
        </summary>
        <div className="verlauf-anamnese__content">
          {event.sections.map((section) => {
            const sectionEntryId = aufnahmeSectionEntryId(event.id, section.id)
            const sectionAnnotations = annotations.filter((a) => a.entryId === sectionEntryId)
            const htmlContent = applyAnnotations(section.content, sectionAnnotations)

            return (
              <div key={section.id} className="verlauf-anamnese__section-block">
                <h4 className="verlauf-anamnese__section-label">{section.label}</h4>
                <div
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.id, el)
                    else sectionRefs.current.delete(section.id)
                  }}
                  className="verlauf-entry__body verlauf-anamnese__body"
                  data-verlauf-entry-id={sectionEntryId}
                  data-verlauf-selection-mode="full"
                  // biome-ignore lint/security/noDangerouslySetInnerHTML
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  onMouseUp={() => handleSectionMouseUp(section.id)}
                  onClick={handleBodyClick}
                />
              </div>
            )
          })}
        </div>
      </details>
    </article>
  )
})

// ---------------------------------------------------------------------------
// Unified feed model
// ---------------------------------------------------------------------------

type FeedSource = 'manuell' | 'aufnahmebefund' | ClinicalEventSource

type UnifiedItem =
  | { kind: 'manual'; id: string; ts: number; source: FeedSource; entry: VerlaufFeedEntry }
  | { kind: 'derived'; id: string; ts: number; source: FeedSource; event: DerivedFeedEvent }

const ALL_FEED_SOURCES: FeedSource[] = [
  'manuell',
  'aufnahmebefund',
  'medikation',
  'psychotherapie',
  'komplementaer',
  'sozialtherapie',
]

function resolveAufnahmeSectionLabel(sectionId: string, language: UiLanguage): string {
  const translated = componentTranslations.aufnahme?.sections?.[sectionId]?.label?.[language]
  if (translated?.trim()) return translated
  const fallback = defaultAufnahmeSections.find((section) => section.id === sectionId)
  return fallback?.label ?? sectionId
}

function formatAufnahmeContent(entry: DokumentEntry, language: UiLanguage): string {
  const sectionContents = entry.sectionContents ?? {}
  const orderedSections = defaultAufnahmeSections
    .map((section) => ({
      id: section.id,
      label: resolveAufnahmeSectionLabel(section.id, language),
      content: sectionContents[section.id]?.trim() ?? '',
    }))
    .filter((section) => section.content)

  if (orderedSections.length > 0) {
    return orderedSections
      .map((section) => `${section.label}:\n${section.content}`)
      .join('\n\n')
  }

  return entry.content.trim()
}

function buildAufnahmeSections(
  entry: DokumentEntry,
  language: UiLanguage,
): AufnahmeSection[] {
  const sectionContents = entry.sectionContents ?? {}
  return defaultAufnahmeSections
    .map((section) => ({
      id: section.id,
      label: resolveAufnahmeSectionLabel(section.id, language),
      content: sectionContents[section.id]?.trim() ?? '',
    }))
    .filter((section) => section.content)
}

function buildAufnahmeFeedEvent(
  documents: DokumentEntry[],
  sourceLabel: string,
  language: UiLanguage,
): AufnahmeFeedEvent | null {
  const anamneseDocuments = documents.filter(
    (entry) => entry.category === 'anamnese' && entry.content.trim(),
  )
  const entry =
    anamneseDocuments.find((item) => item.pageType === 'aufnahme') ?? anamneseDocuments[0]

  if (!entry) return null

  const sections = buildAufnahmeSections(entry, language)

  return {
    id: `aufnahmebefund:${entry.id}`,
    date: entry.date,
    source: 'aufnahmebefund',
    sourceLabel,
    title: sourceLabel,
    body: formatAufnahmeContent(entry, language),
    sections,
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/** Source modules a derived feed item can be edited/managed in. */
export type VerlaufDerivedSource = Exclude<FeedSource, 'manuell'>

interface VerlaufFeedPageProps {
  caseId: string
  /**
   * Routes a derived (projected) entry's edit/delete to its source module.
   * Derived cards mirror data owned by another section, so they are never
   * mutated in place — the clinician manages the underlying record at source.
   */
  onNavigateToSource?: (source: VerlaufDerivedSource) => void
}

export function VerlaufFeedPage({ caseId, onNavigateToSource }: VerlaufFeedPageProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const { member, role, organisation } = usePermissionContext()
  const { readOnly: demoReadOnly } = useDemoPatient(caseId)

  const aiEditEnabled = isInlineAiEditEnabled()
  const inlineEdit = useInlineAiEdit({ caseId })

  const derivedEvents = useClinicalFeedEvents(caseId)
  const [dokumenteRevision, setDokumenteRevision] = useState(0)
  const [activeSources, setActiveSources] = useState<Set<FeedSource>>(
    () => new Set(ALL_FEED_SOURCES),
  )
  const [sortOrder, setSortOrder] = useState<VerlaufSortOrder>(() => loadVerlaufSortOrder())
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  const handleSortChange = useCallback((order: VerlaufSortOrder) => {
    setSortOrder(order)
    saveVerlaufSortOrder(order)
  }, [])

  const [entries, setEntries] = useState<VerlaufFeedEntry[]>(() => loadVerlaufFeed(caseId))
  const [annotations, setAnnotations] = useState<VerlaufAnnotation[]>(() =>
    loadVerlaufAnnotations(caseId),
  )
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([])

  // The connector + source-text highlight follow the pinned (clicked) comment,
  // falling back to whichever comment is currently hovered — mirroring how MS
  // Word draws a leader line to the active comment in the review margin.
  const connectorId = activeAnnotationId ?? hoveredCommentId
  const listRef = useRef<HTMLDivElement>(null)

  const [bubble, setBubble] = useState<BubbleState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    startOffset: 0,
    endOffset: 0,
    entryId: '',
    readonly: false,
    overlappingAnnotations: [],
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

  const currentUserId = user?.id ?? member?.userId

  // Reload when caseId changes
  useEffect(() => {
    setEntries(loadVerlaufFeed(caseId))
    setAnnotations(loadVerlaufAnnotations(caseId))
    setActiveAnnotationId(null)
  }, [caseId])

  useEffect(() => {
    let cancelled = false
    void fetchTeamSnapshot(organisation?.id)
      .then((team) => {
        if (!cancelled) setTeamMembers(team.members.filter((m) => m.status === 'active'))
      })
      .catch(() => {
        if (!cancelled) setTeamMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [organisation?.id])

  useEffect(() => {
    function handleArchiveChanged(e: Event) {
      const detail = (e as CustomEvent<{ caseId: string }>).detail
      if (detail?.caseId === caseId) {
        setDokumenteRevision((revision) => revision + 1)
      }
    }
    window.addEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    return () => {
      window.removeEventListener(DOKUMENTE_ARCHIVE_CHANGED_EVENT, handleArchiveChanged)
    }
  }, [caseId])

  useEffect(() => {
    if (!filterMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [filterMenuOpen])

  // Persistent Word-like link: tint the commented text span(s) of the pinned /
  // hovered comment so the relationship between margin card and source text is
  // obvious even before the leader line is noticed.
  useEffect(() => {
    const cls = 'verlauf-annot--linked'
    const previous = document.querySelectorAll<HTMLElement>(`.${cls}`)
    previous.forEach((el) => el.classList.remove(cls))
    if (!connectorId) return
    const linked = document.querySelectorAll<HTMLElement>(
      `[data-verlauf-annotation-id="${connectorId}"][data-verlauf-annot-type="comment"]`,
    )
    linked.forEach((el) => el.classList.add(cls))
    return () => {
      linked.forEach((el) => el.classList.remove(cls))
    }
  }, [connectorId, annotations, entries, derivedEvents])

  // Hovering commented text in the feed previews its margin card link (the
  // connector + highlight), matching the reverse direction of panel hovers.
  useEffect(() => {
    const container = listRef.current
    if (!container) return
    function resolveCommentId(target: EventTarget | null): string | null {
      const el = (target as HTMLElement | null)?.closest?.(
        '[data-verlauf-annot-type="comment"]',
      )
      return el?.getAttribute('data-verlauf-annotation-id') ?? null
    }
    function handleOver(e: Event) {
      const id = resolveCommentId(e.target)
      if (id) setHoveredCommentId(id)
    }
    function handleOut(e: Event) {
      const id = resolveCommentId(e.target)
      if (id) setHoveredCommentId((current) => (current === id ? null : current))
    }
    container.addEventListener('mouseover', handleOver)
    container.addEventListener('mouseout', handleOut)
    return () => {
      container.removeEventListener('mouseover', handleOver)
      container.removeEventListener('mouseout', handleOut)
    }
  }, [])

  const closeBubble = useCallback(() => {
    setBubble((b) => ({ ...b, visible: false }))
  }, [])

  const closeTimelinePopover = useCallback(() => {
    setTimelinePopover((p) => ({ ...p, visible: false }))
  }, [])

  const closeCommentPopover = useCallback(() => {
    setCommentPopover((p) => ({ ...p, visible: false }))
  }, [])

  const visibleComments = useMemo(
    () =>
      annotations.filter(
        (ann): ann is VerlaufAnnotation & { type: 'comment'; comment: string } =>
          ann.type === 'comment' &&
          Boolean(ann.comment) &&
          canViewAnnotation(ann, currentUserId),
      ),
    [annotations, currentUserId],
  )

  const handleCommentSelect = useCallback((annotationId: string) => {
    setActiveAnnotationId(annotationId)
    setCommentPopover((p) => ({ ...p, visible: false }))
    closeBubble()
    requestAnimationFrame(() => {
      const anchor = document.querySelector<HTMLElement>(
        `[data-verlauf-annotation-id="${annotationId}"]`,
      )
      anchor?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [closeBubble])

  const handleRemoveComment = useCallback(
    (annotationId: string) => {
      const next = removeVerlaufAnnotations([annotationId], caseId)
      setAnnotations(next)
      setActiveAnnotationId((current) => (current === annotationId ? null : current))
    },
    [caseId],
  )

  const handleSelection = useCallback(
    (
      selectedText: string,
      startOffset: number,
      endOffset: number,
      entryId: string,
      rect: DOMRect,
      readonly: boolean,
    ) => {
      const { x, y } = selectionBubblePosition(rect)
      const overlapping = findOverlappingAnnotations(
        annotations,
        entryId,
        startOffset,
        endOffset,
      )
      setBubble({
        visible: true,
        x,
        y,
        selectedText,
        startOffset,
        endOffset,
        entryId,
        readonly: readonly || demoReadOnly,
        overlappingAnnotations: overlapping,
      })
      setTimelinePopover((p) => ({ ...p, visible: false }))
      setCommentPopover((p) => ({ ...p, visible: false }))
    },
    [annotations, demoReadOnly],
  )

  const handleFormat = useCallback(
    (type: AnnotationType, color?: string) => {
      if (bubble.readonly) return
      const { entryId, startOffset, endOffset, selectedText } = bubble
      if (!entryId) return

      const annotation = {
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
    if (bubble.readonly) return
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
    (payload: CommentSavePayload) => {
      const { entryId, startOffset, endOffset, rangeText } = commentPopover
      const annotation = {
        entryId,
        startOffset,
        endOffset,
        type: 'comment' as const,
        comment: payload.comment,
        rangeText,
        visibility: payload.visibility,
        sharedWithUserId: payload.sharedWithUserId,
        authorUserId: currentUserId,
        createdAt: new Date().toISOString(),
      }
      const next = addVerlaufAnnotation(annotation, caseId)
      const saved = next[next.length - 1]
      setAnnotations(next)
      closeCommentPopover()
      if (saved?.id) setActiveAnnotationId(saved.id)
    },
    [caseId, closeCommentPopover, commentPopover, currentUserId],
  )

  const handleRemoveMarkierung = useCallback(() => {
    if (bubble.readonly) return
    const ids = bubble.overlappingAnnotations
      .filter((ann) => isFormatAnnotation(ann.type))
      .map((ann) => ann.id)
    if (ids.length === 0) return
    const next = removeVerlaufAnnotations(ids, caseId)
    setAnnotations(next)
    closeBubble()
  }, [bubble, caseId, closeBubble])

  const handleBubbleCopy = useCallback(() => {
    if (bubble.selectedText) {
      void navigator.clipboard.writeText(bubble.selectedText)
    }
    closeBubble()
  }, [bubble.selectedText, closeBubble])

  const readonlyBubbleActions = useMemo((): SelectionAction[] => {
    if (!bubble.selectedText) return []
    return [
      {
        id: 'copy',
        label: t('verlaufBubbleCopy'),
        onClick: handleBubbleCopy,
      },
    ]
  }, [bubble.selectedText, handleBubbleCopy, t])

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
  const [composerType, setComposerType] = useState<VerlaufDocumentType>('verlauf')

  const handleComposerSave = useCallback(() => {
    if (!composerText.trim()) return
    const typeOption =
      VERLAUF_ENTRY_TYPE_OPTIONS.find((option) => option.id === composerType) ??
      VERLAUF_ENTRY_TYPE_OPTIONS[0]
    // Mirror the Workspace save flow: attribution is attached only for the
    // Arztbrief / Therapie-Verlauf type, not for plain Verlaufsdokumentation.
    const attribution = typeOption.attachAttribution
      ? buildTherapyAttribution(
          user?.id ?? member?.userId ?? '',
          role,
          member?.therapyDiscipline,
          member?.therapyDisciplineCustom,
        )
      : undefined
    const newEntry = appendVerlaufEntry(caseId, {
      date: composerDate ? new Date(composerDate).toISOString() : new Date().toISOString(),
      content: composerText.trim(),
      pageType: typeOption.id,
      source: 'manual',
      ...(attribution ? { attribution } : {}),
    })
    setEntries((prev) => [newEntry, ...prev])
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerType('verlauf')
    setComposerOpen(false)
  }, [caseId, composerDate, composerText, composerType, member, role, user?.id])

  const handleComposerCancel = useCallback(() => {
    setComposerText('')
    setComposerDate(new Date().toISOString().slice(0, 10))
    setComposerType('verlauf')
    setComposerOpen(false)
  }, [])

  const aufnahmeFeedEvent = useMemo(
    () => buildAufnahmeFeedEvent(loadDokumente(caseId), t('dokumenteCategoryAnamnese'), language),
    // `dokumenteRevision` intentionally participates so archive updates trigger a recompute.
    [caseId, dokumenteRevision, language, t],
  )

  // Inline AI edit only applies to editable manual entries (those that own a
  // plain-text `content` written back via `updateVerlaufEntry`). Derived /
  // Aufnahme cards are read-only history, so the helper returns null for them.
  const aiEditTarget = useMemo(
    () =>
      aiEditEnabled
        ? resolveVerlaufAiEditTarget(entries, {
            entryId: bubble.entryId,
            selectedText: bubble.selectedText,
            startOffset: bubble.startOffset,
            endOffset: bubble.endOffset,
            readonly: bubble.readonly,
          })
        : null,
    [aiEditEnabled, bubble, entries],
  )

  const handleAiEdit = useCallback(() => {
    if (!aiEditTarget) return
    const { entryId, fullText, selectedText, selectionStart, selectionEnd } = aiEditTarget
    inlineEdit.open({
      selectedText,
      fullText,
      selectionStart,
      selectionEnd,
      position: { top: bubble.y, left: bubble.x },
      applyReplacement: (editedText) => {
        const nextContent = applyEdit(fullText, selectionStart, selectionEnd, editedText)
        setEntries(updateVerlaufEntry(entryId, nextContent, caseId))
      },
    })
    closeBubble()
  }, [aiEditTarget, bubble.x, bubble.y, caseId, closeBubble, inlineEdit])

  // ⌘⌥B / Strg+Alt+B — same shortcut as the Notion editors, active only while an
  // editable selection bubble is showing.
  useEffect(() => {
    if (!aiEditTarget) return
    function handleKey(e: KeyboardEvent) {
      if (isInlineAiEditShortcut(e)) {
        e.preventDefault()
        handleAiEdit()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [aiEditTarget, handleAiEdit])

  const handleCreateTimeline = useCallback(() => {
    if (bubble.readonly) return
    const { entryId, selectedText, x, y } = bubble
    if (!entryId) return
    const entry = entries.find((e) => e.id === entryId)
    const aufnahmeDate =
      aufnahmeFeedEvent && entryId.startsWith(aufnahmeFeedEvent.id)
        ? aufnahmeFeedEvent.date
        : undefined
    setTimelinePopover({
      visible: true,
      x,
      y: y + 60,
      entryId,
      entryDate: entry?.date ?? aufnahmeDate ?? new Date().toISOString(),
      selectedText,
    })
    closeBubble()
  }, [aufnahmeFeedEvent, bubble, closeBubble, entries])

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
    const merged = [...manualItems, ...derivedItems].filter(
      (item) => !aufnahmeFeedEvent || item.id !== aufnahmeFeedEvent.id,
    )
    const sorted = merged
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const byTs =
          sortOrder === 'oldest' ? a.item.ts - b.item.ts : b.item.ts - a.item.ts
        if (byTs !== 0) return byTs
        // When timestamps tie (e.g. unparsed dates → ts 0), still flip order on toggle.
        return sortOrder === 'oldest' ? a.index - b.index : b.index - a.index
      })
      .map(({ item }) => item)
    if (!aufnahmeFeedEvent) return sorted
    // Aufnahmebefund is the admission anchor and stays pinned to the top in both
    // sort orders; its header still shows the source document date.
    return [
      {
        kind: 'derived',
        id: aufnahmeFeedEvent.id,
        ts: sortOrder === 'oldest' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
        source: 'aufnahmebefund',
        event: aufnahmeFeedEvent,
      },
      ...sorted,
    ]
  }, [entries, derivedEvents, aufnahmeFeedEvent, sortOrder])

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
        : source === 'aufnahmebefund'
          ? t('dokumenteCategoryAnamnese')
          : translateClinicalEventSource(language, source),
    [language, t],
  )

  const isEmpty = allItems.length === 0
  const derivedReadonlyLabel = t('verlaufDerivedReadonly')
  const aufnahmeReadonlyLabel = t('verlaufAufnahmeReadonly' as Parameters<typeof t>[0])
  const copyLabel = t('verlaufEntryCopy')
  const editInSourceLabel = t('verlaufEditInSource')
  const deleteInSourceLabel = t('verlaufDeleteInSource')

  return (
    <div className="verlauf-feed-layout">
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
          <div className="verlauf-composer__type-row" role="radiogroup" aria-label={t('verlaufEntryType')}>
            <span className="verlauf-composer__type-label">{t('verlaufEntryType')}</span>
            <div className="verlauf-composer__type-options">
              {VERLAUF_ENTRY_TYPE_OPTIONS.map((option) => {
                const active = composerType === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`verlauf-composer__type-btn${
                      active ? ' verlauf-composer__type-btn--active' : ''
                    }`}
                    onClick={() => setComposerType(option.id)}
                  >
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
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

      {!isEmpty && (
        <div className="verlauf-toolbar">
          <div className="verlauf-sort" role="group" aria-label={t('verlaufSortLabel')}>
            <button
              type="button"
              className={`verlauf-sort__btn${sortOrder === 'newest' ? ' verlauf-sort__btn--active' : ''}`}
              aria-pressed={sortOrder === 'newest'}
              onClick={() => handleSortChange('newest')}
            >
              {t('verlaufSortNewest')}
            </button>
            <button
              type="button"
              className={`verlauf-sort__btn${sortOrder === 'oldest' ? ' verlauf-sort__btn--active' : ''}`}
              aria-pressed={sortOrder === 'oldest'}
              onClick={() => handleSortChange('oldest')}
            >
              {t('verlaufSortOldest')}
            </button>
          </div>

          {availableSources.length > 1 && (
            <div className="verlauf-filter-menu" ref={filterMenuRef}>
              <button
                type="button"
                className={`verlauf-filter-menu__trigger${
                  !allActive ? ' verlauf-filter-menu__trigger--active' : ''
                }`}
                aria-haspopup="true"
                aria-expanded={filterMenuOpen}
                onClick={() => setFilterMenuOpen((open) => !open)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {t('verlaufFilterButton')}
                {!allActive && (
                  <span className="verlauf-filter-menu__count">
                    {availableSources.filter((src) => activeSources.has(src)).length}
                  </span>
                )}
              </button>

              {filterMenuOpen && (
                <div
                  className="verlauf-filter-menu__panel"
                  role="group"
                  aria-label={t('verlaufFilterLabel')}
                >
                  <div className="verlauf-filter-menu__header">
                    <span className="verlauf-filter-menu__title">{t('verlaufFilterLabel')}</span>
                    <button
                      type="button"
                      className="verlauf-filter-menu__reset"
                      onClick={selectAllSources}
                      disabled={allActive}
                    >
                      {t('verlaufFilterReset')}
                    </button>
                  </div>
                  <div className="verlauf-filter-menu__options">
                    {availableSources.map((source) => {
                      const checked = activeSources.has(source)
                      return (
                        <button
                          key={source}
                          type="button"
                          className={`verlauf-filter-menu__option verlauf-filter-menu__option--${source}${
                            checked ? ' verlauf-filter-menu__option--checked' : ''
                          }`}
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleSource(source)}
                        >
                          <span className="verlauf-filter-menu__check" aria-hidden>
                            {checked && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span className="verlauf-filter-menu__option-label">
                            {sourceChipLabel(source)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isEmpty && !composerOpen ? (
        <div className="clinical-empty-state-card verlauf-feed-page__empty-card">
          <p className="clinical-empty-state-card__text">{t('verlaufFeedEmpty')}</p>
        </div>
      ) : isEmpty ? null : (
        <div className="verlauf-feed-page__list" ref={listRef}>
          {visibleItems.map((item, index) => (
            <div key={item.id}>
              {item.kind === 'manual' ? (
                <EntryCard
                  entry={item.entry}
                  annotations={annotations}
                  onSelection={handleSelection}
                  onCommentSelect={handleCommentSelect}
                  onEdit={handleEntryEdit}
                  onDelete={handleEntryDelete}
                />
              ) : isAufnahmeFeedEvent(item.event) && item.event.sections.length > 0 ? (
                <AufnahmeEntryCard
                  event={item.event}
                  annotations={annotations}
                  readonlyLabel={aufnahmeReadonlyLabel}
                  copyLabel={copyLabel}
                  onSelection={handleSelection}
                  onCommentSelect={handleCommentSelect}
                  onNavigateToSource={onNavigateToSource}
                />
              ) : (
                <DerivedEntryCard
                  event={item.event}
                  annotations={annotations}
                  readonlyLabel={
                    item.event.source === 'aufnahmebefund'
                      ? aufnahmeReadonlyLabel
                      : derivedReadonlyLabel
                  }
                  copyLabel={copyLabel}
                  editLabel={editInSourceLabel}
                  deleteLabel={deleteInSourceLabel}
                  onSelection={handleSelection}
                  onCommentSelect={handleCommentSelect}
                  onNavigateToSource={onNavigateToSource}
                  annotatable={!demoReadOnly}
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
            onRemoveMarkierung={handleRemoveMarkierung}
            onClose={closeBubble}
            onAiEdit={aiEditTarget ? handleAiEdit : undefined}
          />

          <SelectionActionBubble
            visible={bubble.visible && bubble.readonly}
            position={{ x: bubble.x, y: bubble.y }}
            actions={readonlyBubbleActions}
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
            teamMembers={teamMembers}
            currentUserId={currentUserId}
            onSave={handleSaveComment}
            onClose={closeCommentPopover}
          />

          <VerlaufAnnotationConnector activeId={connectorId} />

          {inlineEdit.popup}
        </>,
        document.body,
      )}
    </div>

    <VerlaufAnnotationPanel
      comments={visibleComments}
      activeId={activeAnnotationId}
      linkedId={connectorId}
      teamMembers={teamMembers}
      currentUserId={currentUserId}
      onSelect={handleCommentSelect}
      onRemove={handleRemoveComment}
      onHover={setHoveredCommentId}
    />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Re-export for auto-save integration
// ---------------------------------------------------------------------------
export { appendVerlaufEntry }

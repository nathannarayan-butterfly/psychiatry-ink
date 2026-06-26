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
import { Check, Sparkles } from 'lucide-react'
import { VerlaufActionToolbar } from './VerlaufActionToolbar'
import { copyTextToClipboard } from '../../utils/notionDocumentActions'
import { useCopyWithFeedback } from '../../hooks/useCopyWithFeedback'
import {
  buildVerlaufPlainText,
  exportVerlaufText,
  printVerlauf,
  type VerlaufExportItem,
} from '../../utils/verlauf/exportVerlauf'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
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
  updateVerlaufAnnotationComment,
  updateVerlaufEntry,
  updateVerlaufEntryDate,
  updateVerlaufTodo,
  type AnnotationType,
  type TodoPriority,
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
  resolveRevealedCommentId,
  verlaufTodoPriorityColor,
} from '../../utils/verlaufAnnotationHelpers'
import { fetchTeamSnapshot, type TeamMemberProfile } from '../../services/orgApi'
import { VerlaufAnnotationPanel } from './VerlaufAnnotationPanel'
import { VerlaufCommentHoverBubble } from './VerlaufCommentHoverBubble'
import { VerlaufAnnotationConnector } from './VerlaufAnnotationConnector'
import {
  VerlaufTodoPanel,
  type VerlaufTodoEditPayload,
  type VerlaufTodoItem,
} from './VerlaufTodoPanel'
import { VerlaufTodoHoverBubble } from './VerlaufTodoHoverBubble'
import { useVerlaufAnnotationReveal } from '../../hooks/useVerlaufAnnotationReveal'
import { useTodoScope } from '../../hooks/useTodoScope'
import {
  deleteCentralTodo,
  reconcileCentralTodoLink,
  setCentralTodoDone,
  type CentralTodoFields,
} from '../../utils/verlauf/verlaufTodoSync'
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
import { SomaticBefundQuickModal } from './verlauf/SomaticBefundQuickModal'
import { SomaticBefundEntryCard } from './verlauf/SomaticBefundEntryCard'
import { isSomaticBefundEntry } from '../../utils/verlauf/somaticBefund'

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
  nowSiteTime,
  siteDateTimeToIso,
  todayIsoDateSite,
} from '../../utils/siteTimezone'
import { buildImproveOnlyInstruction } from '../../../shared/improveOnlyPrompt'

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

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
    attrs.push(`data-comment="${escapeHtml(ann.comment)}"`)
    attrs.push('data-verlauf-annot-type="comment"')
    attrs.push('tabindex="0"')
    attrs.push('role="note"')
    attrs.push(`aria-label="${escapeHtml(ann.comment)}"`)
  }
  if (ann.type === 'todo' && ann.todoText) {
    const color = verlaufTodoPriorityColor(ann.priority)
    const tint = hexToRgba(color, 0.1)
    styles.push(`border-bottom: 2px dotted ${color}; background: ${tint}; cursor: pointer`)
    if (ann.done) styles.push('text-decoration: line-through; opacity: 0.6')
    attrs.push(`data-todo="${escapeHtml(ann.todoText)}"`)
    attrs.push('data-verlauf-annot-type="todo"')
    attrs.push(`data-verlauf-todo-priority="${escapeHtml(ann.priority ?? 'normal')}"`)
    if (ann.done) attrs.push('data-verlauf-todo-done="true"')
    attrs.push('tabindex="0"')
    attrs.push('role="note"')
    attrs.push(`aria-label="${escapeHtml(ann.todoText)}"`)
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
  onTodo: () => void
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
  onTodo,
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
        title={t('verlaufTodoAdd')}
        aria-label={t('verlaufTodoAdd')}
        onClick={onTodo}
      >
        ☑
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
// To-do compose popover
// ---------------------------------------------------------------------------

interface TodoPopoverState {
  visible: boolean
  x: number
  y: number
  entryId: string
  startOffset: number
  endOffset: number
  rangeText: string
}

interface TodoSavePayload {
  todoText: string
  priority: TodoPriority
  dueDate: string | null
}

const TODO_PRIORITY_OPTIONS: {
  value: TodoPriority
  labelKey: 'verlaufTodoPriorityHigh' | 'verlaufTodoPriorityNormal' | 'verlaufTodoPriorityLow'
}[] = [
  { value: 'high', labelKey: 'verlaufTodoPriorityHigh' },
  { value: 'normal', labelKey: 'verlaufTodoPriorityNormal' },
  { value: 'low', labelKey: 'verlaufTodoPriorityLow' },
]

interface TodoComposePopoverProps {
  state: TodoPopoverState
  onSave: (payload: TodoSavePayload) => void
  onClose: () => void
}

function TodoComposePopover({ state, onSave, onClose }: TodoComposePopoverProps) {
  const { t } = useTranslation()
  const [todoText, setTodoText] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const { ref, top, left, ready } = usePopoverPlacement(state.visible, state.x, state.y)

  useEffect(() => {
    setTodoText('')
    setPriority('normal')
    setDueDate('')
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

  const canSave = todoText.trim().length > 0
  const accent = verlaufTodoPriorityColor(priority)

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="verlauf-popover verlauf-popover--todo-compose"
      style={
        {
          top,
          left,
          visibility: ready ? undefined : 'hidden',
          '--verlauf-todo-accent': accent,
        } as React.CSSProperties
      }
    >
      <p className="verlauf-popover__title">{t('verlaufTodoAdd')}</p>
      <blockquote className="verlauf-popover__quote">{state.rangeText || '…'}</blockquote>
      <textarea
        className="verlauf-popover__textarea"
        value={todoText}
        onChange={(e) => setTodoText(e.target.value)}
        rows={2}
        placeholder={t('verlaufTodoPlaceholder')}
        autoFocus
      />
      <label className="verlauf-popover__label">
        {t('verlaufTodoPriority')}
        <select
          className="verlauf-popover__input"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
        >
          {TODO_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="verlauf-popover__label">
        {t('verlaufTodoDueDate')}
        <input
          type="date"
          className="verlauf-popover__input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
      <p className="verlauf-popover__hint">{t('verlaufTodoDueDateHint')}</p>
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
              todoText: todoText.trim(),
              priority,
              dueDate: dueDate.trim() || null,
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
  onTodoSelect: (annotationId: string) => void
  onEdit: (id: string, content: string) => void
  /** Persist an edited date/time (full UTC ISO timestamp). */
  onEditDate?: (id: string, isoDate: string) => void
  onDelete: (id: string) => void
  /** Run the improve-only KI over the whole entry (Item 9). */
  onImprove?: (id: string, anchor: DOMRect) => void
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

const EntryCard = memo(function EntryCard({
  entry,
  annotations,
  onSelection,
  onCommentSelect,
  onTodoSelect,
  onEdit,
  onEditDate,
  onDelete,
  onImprove,
}: EntryCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(entry.content)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
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
    const annotType = target.getAttribute('data-verlauf-annot-type')
    if (annotType === 'comment') {
      onCommentSelect(annotationId)
    } else if (annotType === 'todo') {
      onTodoSelect(annotationId)
    }
  }

  function handleCopyEntry(e: React.MouseEvent) {
    e.stopPropagation()
    void copy(entry.content)
  }

  function handleEditStart(e: React.MouseEvent) {
    e.stopPropagation()
    setEditText(entry.content)
    // Seed the date/time pickers from the entry's stored timestamp, expressed in
    // the site timezone so the clinician edits the wall-clock time they see.
    const parts = getSiteZonedParts(new Date(entry.date))
    setEditDate(`${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`)
    setEditTime(`${pad2(parts.hour)}:${pad2(parts.minute)}`)
    setEditing(true)
    setConfirmDelete(false)
  }

  function handleEditSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (editText.trim()) {
      onEdit(entry.id, editText.trim())
    }
    // Persist an edited (incl. back-dated) date/time when it changed.
    if (onEditDate && editDate) {
      const nextIso = siteDateTimeToIso(editDate, editTime || '00:00')
      if (nextIso !== entry.date) onEditDate(entry.id, nextIso)
    }
    setEditing(false)
  }

  function handleImprove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onImprove || !entry.content.trim()) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onImprove(entry.id, rect)
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
        {entry.sectionLabel || entry.subheading ? (
          <span className="verlauf-entry__section">
            {[entry.sectionLabel, entry.subheading].filter(Boolean).join(' — ')}
          </span>
        ) : null}
        {entry.source === 'ai-accepted' && (
          <span className="verlauf-entry__ai-badge" title="KI-generierter Text, vom Arzt akzeptiert">
            KI
          </span>
        )}
        {entry.attribution ? <TherapyAttributionBadge attribution={entry.attribution} /> : null}
        <span className="verlauf-entry__actions" onClick={(e) => e.stopPropagation()}>
          {onImprove ? (
            <button
              type="button"
              className="verlauf-entry__action-btn verlauf-entry__action-btn--ai"
              title={t('verlaufEntryImprove')}
              aria-label={t('verlaufEntryImprove')}
              onClick={handleImprove}
            >
              <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
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
            className={`verlauf-entry__action-btn${copied ? ' verlauf-entry__action-btn--copied' : ''}`}
            title={copied ? t('copyButtonCopied') : t('verlaufEntryCopy')}
            aria-label={copied ? t('copyButtonCopied') : t('verlaufEntryCopy')}
            onClick={handleCopyEntry}
          >
            {copied ? (
              <Check width={13} height={13} strokeWidth={2} aria-hidden />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
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
          {onEditDate ? (
            <div className="verlauf-inline-editor__meta">
              <label className="verlauf-inline-editor__meta-field">
                <span className="verlauf-inline-editor__meta-label">{t('verlaufEntryDateLabel')}</span>
                <input
                  type="date"
                  className="verlauf-inline-editor__meta-input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </label>
              <label className="verlauf-inline-editor__meta-field">
                <span className="verlauf-inline-editor__meta-label">{t('verlaufEntryTimeLabel')}</span>
                <input
                  type="time"
                  className="verlauf-inline-editor__meta-input"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </label>
            </div>
          ) : null}
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
  onTodoSelect: (annotationId: string) => void
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
  onTodoSelect,
  onNavigateToSource,
  annotatable,
}: DerivedEntryCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()

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
    void copy(entryText)
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
    const annotType = target.getAttribute('data-verlauf-annot-type')
    if (annotType === 'comment') {
      onCommentSelect(annotationId)
    } else if (annotType === 'todo') {
      onTodoSelect(annotationId)
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
            className={`verlauf-entry__action-btn${copied ? ' verlauf-entry__action-btn--copied' : ''}`}
            title={copied ? t('copyButtonCopied') : copyLabel}
            aria-label={copied ? t('copyButtonCopied') : copyLabel}
            onClick={handleCopy}
          >
            {copied ? (
              <Check width={13} height={13} strokeWidth={2} aria-hidden />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
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
  onTodoSelect: EntryCardProps['onTodoSelect']
  onNavigateToSource?: (source: DerivedFeedEvent['source']) => void
}

const AufnahmeEntryCard = memo(function AufnahmeEntryCard({
  event,
  annotations,
  readonlyLabel,
  copyLabel,
  onSelection,
  onCommentSelect,
  onTodoSelect,
  onNavigateToSource,
}: AufnahmeEntryCardProps) {
  const { t } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void copy(event.body)
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
    const annotType = target.getAttribute('data-verlauf-annot-type')
    if (annotType === 'comment') {
      onCommentSelect(annotationId)
    } else if (annotType === 'todo') {
      onTodoSelect(annotationId)
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
            className={`verlauf-entry__action-btn${copied ? ' verlauf-entry__action-btn--copied' : ''}`}
            title={copied ? t('copyButtonCopied') : copyLabel}
            aria-label={copied ? t('copyButtonCopied') : copyLabel}
            onClick={handleCopy}
          >
            {copied ? (
              <Check width={13} height={13} strokeWidth={2} aria-hidden />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
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
  /** Human-readable patient label for to-dos mirrored into the central list. */
  patientLabel?: string | null
  /** When true on mount, opens the inline composer (Übersicht quick action). */
  autoOpenComposer?: boolean
  /** Called once the auto-open request has been consumed. */
  onAutoOpenComposerHandled?: () => void
  /** Optional guided-entry gate — parent shows mode chooser / wizard instead of composer. */
  onNewEntryRequest?: () => void
  /**
   * Routes a derived (projected) entry's edit/delete to its source module.
   * Derived cards mirror data owned by another section, so they are never
   * mutated in place — the clinician manages the underlying record at source.
   */
  onNavigateToSource?: (source: VerlaufDerivedSource) => void
  /** Opens the Befundung workspace for structured ECG/EEG documentation. */
  onOpenFullBefund?: () => void
}

export function VerlaufFeedPage({
  caseId,
  patientLabel = null,
  autoOpenComposer = false,
  onAutoOpenComposerHandled,
  onNewEntryRequest,
  onNavigateToSource,
  onOpenFullBefund,
}: VerlaufFeedPageProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const { member, role, organisation } = usePermissionContext()
  const demoReadOnly = false
  const todoScope = useTodoScope()

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
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null)
  // Layout model: wide viewport shows the padded margin panel; narrow viewport
  // hides it and reveals comments only as a hover/focus popup near the anchor.
  // Kept in sync with the CSS `@media (max-width: 1100px)` breakpoint.
  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1100px)').matches,
  )
  const hoverClearTimerRef = useRef<number | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([])

  const revealedCommentId = resolveRevealedCommentId(hoveredCommentId, focusedCommentId)

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current)
      hoverClearTimerRef.current = null
    }
  }, [])

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear()
    hoverClearTimerRef.current = window.setTimeout(() => {
      setHoveredCommentId(null)
      hoverClearTimerRef.current = null
    }, 120)
  }, [cancelHoverClear])

  // Source-text highlight tracks hover/focus on anchor or sidebar index entry.
  const linkedCommentId = revealedCommentId ?? activeAnnotationId
  const listRef = useRef<HTMLDivElement>(null)

  // Parallel hover/focus reveal model for to-do annotations (mirrors comments).
  const todoReveal = useVerlaufAnnotationReveal({
    listRef,
    annotType: 'todo',
    panelAttr: 'data-verlauf-todo-panel-id',
    bubbleAttr: 'data-verlauf-todo-bubble-id',
  })
  const linkedTodoId = todoReveal.revealedId ?? activeTodoId

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

  const [todoPopover, setTodoPopover] = useState<TodoPopoverState>({
    visible: false,
    x: 0,
    y: 0,
    entryId: '',
    startOffset: 0,
    endOffset: 0,
    rangeText: '',
  })

  const currentUserId = user?.id ?? member?.userId
  // Link the mirrored central to-do to the patient case only when a patient is
  // present; otherwise it becomes a general (workspace) to-do.
  const todoCentralContext = useMemo(
    () => ({ caseId: patientLabel ? caseId : null, patientLabel }),
    [caseId, patientLabel],
  )

  // Reload when caseId changes
  useEffect(() => {
    setEntries(loadVerlaufFeed(caseId))
    setAnnotations(loadVerlaufAnnotations(caseId))
    setActiveAnnotationId(null)
    setActiveTodoId(null)
    todoReveal.reset()
  }, [caseId, todoReveal.reset])

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
    if (!linkedCommentId) return
    const linked = document.querySelectorAll<HTMLElement>(
      `[data-verlauf-annotation-id="${linkedCommentId}"][data-verlauf-annot-type="comment"]`,
    )
    linked.forEach((el) => el.classList.add(cls))
    return () => {
      linked.forEach((el) => el.classList.remove(cls))
    }
  }, [linkedCommentId, annotations, entries, derivedEvents])

  // Same persistent link, for the pinned/hovered to-do's anchored chart text.
  useEffect(() => {
    const cls = 'verlauf-todo-annot--linked'
    const previous = document.querySelectorAll<HTMLElement>(`.${cls}`)
    previous.forEach((el) => el.classList.remove(cls))
    if (!linkedTodoId) return
    const linked = document.querySelectorAll<HTMLElement>(
      `[data-verlauf-annotation-id="${linkedTodoId}"][data-verlauf-annot-type="todo"]`,
    )
    linked.forEach((el) => el.classList.add(cls))
    return () => {
      linked.forEach((el) => el.classList.remove(cls))
    }
  }, [linkedTodoId, annotations, entries, derivedEvents])

  // Hovering commented text in the feed reveals its bubble; a short grace period
  // lets the pointer travel from the anchor span to the bubble or sidebar index.
  useEffect(() => {
    const container = listRef.current
    if (!container) return
    function resolveCommentId(target: EventTarget | null): string | null {
      const el = (target as HTMLElement | null)?.closest?.(
        '[data-verlauf-annot-type="comment"]',
      )
      return el?.getAttribute('data-verlauf-annotation-id') ?? null
    }
    function isRelatedCommentTarget(related: Node | null, id: string): boolean {
      if (!related) return false
      const el = related as HTMLElement
      const bubbleId = el.closest?.('[data-verlauf-comment-bubble-id]')?.getAttribute(
        'data-verlauf-comment-bubble-id',
      )
      if (bubbleId === id) return true
      const panelItem = el.closest?.('.verlauf-annotation-panel__item')
      if (panelItem) {
        const panelId = panelItem
          .querySelector('[data-verlauf-panel-annotation-id]')
          ?.getAttribute('data-verlauf-panel-annotation-id')
        if (panelId === id) return true
      }
      return false
    }
    function handleOver(e: Event) {
      const id = resolveCommentId(e.target)
      if (!id) return
      cancelHoverClear()
      setHoveredCommentId(id)
    }
    function handleOut(e: Event) {
      const id = resolveCommentId(e.target)
      if (!id) return
      const related = (e as MouseEvent).relatedTarget as Node | null
      if (isRelatedCommentTarget(related, id)) return
      scheduleHoverClear()
    }
    function handleFocusIn(e: Event) {
      const id = resolveCommentId(e.target)
      if (id) setFocusedCommentId(id)
    }
    function handleFocusOut(e: Event) {
      const id = resolveCommentId(e.target)
      if (!id) return
      const related = (e as FocusEvent).relatedTarget as Node | null
      if (isRelatedCommentTarget(related, id)) return
      setFocusedCommentId((current) => (current === id ? null : current))
    }
    container.addEventListener('mouseover', handleOver)
    container.addEventListener('mouseout', handleOut)
    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('focusout', handleFocusOut)
    return () => {
      container.removeEventListener('mouseover', handleOver)
      container.removeEventListener('mouseout', handleOut)
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('focusout', handleFocusOut)
      cancelHoverClear()
    }
  }, [cancelHoverClear, scheduleHoverClear])

  // On resize, drop hover/focus-reveal so bubbles never stick visible off-anchor
  // or overlap the source text mid-transition.
  useEffect(() => {
    function handleResize() {
      cancelHoverClear()
      setHoveredCommentId(null)
      setFocusedCommentId(null)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cancelHoverClear])

  // Track the wide/narrow breakpoint. Switching modes also clears any revealed
  // comment so a panel card and a hover bubble are never shown simultaneously.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(max-width: 1100px)')
    const apply = (matches: boolean) => {
      setIsNarrow(matches)
      cancelHoverClear()
      setHoveredCommentId(null)
      setFocusedCommentId(null)
      todoReveal.reset()
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [cancelHoverClear, todoReveal.reset])

  const closeBubble = useCallback(() => {
    setBubble((b) => ({ ...b, visible: false }))
  }, [])

  const closeTimelinePopover = useCallback(() => {
    setTimelinePopover((p) => ({ ...p, visible: false }))
  }, [])

  const closeCommentPopover = useCallback(() => {
    setCommentPopover((p) => ({ ...p, visible: false }))
  }, [])

  const closeTodoPopover = useCallback(() => {
    setTodoPopover((p) => ({ ...p, visible: false }))
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

  const visibleTodos = useMemo<VerlaufTodoItem[]>(
    () =>
      annotations.filter(
        (ann): ann is VerlaufTodoItem => ann.type === 'todo' && Boolean(ann.todoText),
      ),
    [annotations],
  )

  const handleCommentSelect = useCallback((annotationId: string) => {
    setActiveAnnotationId(annotationId)
    cancelHoverClear()
    setHoveredCommentId(annotationId)
    setCommentPopover((p) => ({ ...p, visible: false }))
    closeBubble()
    requestAnimationFrame(() => {
      const anchor = document.querySelector<HTMLElement>(
        `[data-verlauf-annotation-id="${annotationId}"]`,
      )
      anchor?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [cancelHoverClear, closeBubble])

  const handleRemoveComment = useCallback(
    (annotationId: string) => {
      const next = removeVerlaufAnnotations([annotationId], caseId)
      setAnnotations(next)
      setActiveAnnotationId((current) => (current === annotationId ? null : current))
    },
    [caseId],
  )

  const handleEditComment = useCallback(
    (annotationId: string, comment: string) => {
      const next = updateVerlaufAnnotationComment(annotationId, comment, caseId)
      setAnnotations(next)
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
      setTodoPopover((p) => ({ ...p, visible: false }))
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

  const handleTodo = useCallback(() => {
    if (bubble.readonly) return
    const { entryId, startOffset, endOffset, selectedText, x, y } = bubble
    if (!entryId) return
    setTodoPopover({
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

  const handleTodoSelect = useCallback(
    (annotationId: string) => {
      setActiveTodoId(annotationId)
      todoReveal.cancelHoverClear()
      todoReveal.setHoveredId(annotationId)
      setTodoPopover((p) => ({ ...p, visible: false }))
      closeBubble()
      requestAnimationFrame(() => {
        const anchor = document.querySelector<HTMLElement>(
          `[data-verlauf-annotation-id="${annotationId}"][data-verlauf-annot-type="todo"]`,
        )
        anchor?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    },
    [closeBubble, todoReveal],
  )

  const handleSaveTodo = useCallback(
    (payload: TodoSavePayload) => {
      const { entryId, startOffset, endOffset, rangeText } = todoPopover
      const annotation = {
        entryId,
        startOffset,
        endOffset,
        type: 'todo' as const,
        todoText: payload.todoText,
        rangeText,
        priority: payload.priority,
        dueDate: payload.dueDate,
        done: false,
        linkedTodoId: null,
        authorUserId: currentUserId,
        createdAt: new Date().toISOString(),
      }
      const next = addVerlaufAnnotation(annotation, caseId)
      const saved = next[next.length - 1]
      setAnnotations(next)
      closeTodoPopover()
      if (saved?.id) setActiveTodoId(saved.id)

      if (payload.dueDate && saved?.id) {
        const fields: CentralTodoFields = {
          todoText: payload.todoText,
          rangeText,
          priority: payload.priority,
          dueDate: payload.dueDate,
          done: false,
        }
        void reconcileCentralTodoLink({
          scope: todoScope,
          ctx: todoCentralContext,
          linkedTodoId: null,
          fields,
        })
          .then((linkedId) => {
            if (linkedId) {
              setAnnotations(updateVerlaufTodo(saved.id, { linkedTodoId: linkedId }, caseId))
            }
          })
          .catch(() => {
            // Mirroring is best-effort; the Verlauf to-do itself is already saved.
          })
      }
    },
    [caseId, closeTodoPopover, currentUserId, todoCentralContext, todoPopover, todoScope],
  )

  const handleEditTodo = useCallback(
    (annotationId: string, payload: VerlaufTodoEditPayload) => {
      const existing = annotations.find((a) => a.id === annotationId)
      const next = updateVerlaufTodo(
        annotationId,
        { todoText: payload.todoText, priority: payload.priority, dueDate: payload.dueDate },
        caseId,
      )
      setAnnotations(next)

      const fields: CentralTodoFields = {
        todoText: payload.todoText,
        rangeText: existing?.rangeText ?? '',
        priority: payload.priority,
        dueDate: payload.dueDate,
        done: existing?.done ?? false,
      }
      void reconcileCentralTodoLink({
        scope: todoScope,
        ctx: todoCentralContext,
        linkedTodoId: existing?.linkedTodoId ?? null,
        fields,
      })
        .then((linkedId) => {
          setAnnotations(updateVerlaufTodo(annotationId, { linkedTodoId: linkedId }, caseId))
        })
        .catch(() => {
          // Best-effort sync.
        })
    },
    [annotations, caseId, todoCentralContext, todoScope],
  )

  const handleToggleTodoDone = useCallback(
    (annotationId: string, done: boolean) => {
      const existing = annotations.find((a) => a.id === annotationId)
      setAnnotations(updateVerlaufTodo(annotationId, { done }, caseId))
      if (existing?.linkedTodoId) {
        void setCentralTodoDone(todoScope, existing.linkedTodoId, done).catch(() => {
          // Best-effort sync.
        })
      }
    },
    [annotations, caseId, todoScope],
  )

  const handleRemoveTodo = useCallback(
    (annotationId: string) => {
      const existing = annotations.find((a) => a.id === annotationId)
      const next = removeVerlaufAnnotations([annotationId], caseId)
      setAnnotations(next)
      setActiveTodoId((current) => (current === annotationId ? null : current))
      if (existing?.linkedTodoId) {
        void deleteCentralTodo(todoScope, existing.linkedTodoId).catch(() => {
          // Best-effort sync.
        })
      }
    },
    [annotations, caseId, todoScope],
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
      void copyTextToClipboard(bubble.selectedText).then((ok) => {
        if (ok) showNotionToast(t('notionCopied'))
      })
    }
    closeBubble()
  }, [bubble.selectedText, closeBubble, t])

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

  const handleEntryEditDate = useCallback(
    (id: string, isoDate: string) => {
      setEntries(updateVerlaufEntryDate(id, isoDate, caseId))
    },
    [caseId],
  )

  const handleEntryDelete = useCallback(
    (id: string) => {
      // Drop any central to-dos mirrored from this entry's todo annotations.
      annotations
        .filter((a) => a.entryId === id && a.type === 'todo' && a.linkedTodoId)
        .forEach((a) => {
          void deleteCentralTodo(todoScope, a.linkedTodoId as string).catch(() => {
            // Best-effort sync.
          })
        })
      const next = deleteVerlaufEntry(id, caseId)
      setEntries(next)
      setAnnotations((prev) => prev.filter((a) => a.entryId !== id))
    },
    [annotations, caseId, todoScope],
  )

  const [composerOpen, setComposerOpen] = useState(false)
  const [somaticModalOpen, setSomaticModalOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  // Site-timezone calendar date (not UTC slice) so a note composed late evening
  // doesn't roll to the next day, and the saved timestamp matches wall-clock.
  const [composerDate, setComposerDate] = useState(() => todayIsoDateSite())
  const [composerTime, setComposerTime] = useState(() => nowSiteTime())
  const [composerType, setComposerType] = useState<VerlaufDocumentType>('verlauf')

  useEffect(() => {
    if (!autoOpenComposer) return
    setComposerOpen(true)
    onAutoOpenComposerHandled?.()
  }, [autoOpenComposer, onAutoOpenComposerHandled])

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
      date: composerDate
        ? siteDateTimeToIso(composerDate, composerTime || '00:00')
        : new Date().toISOString(),
      content: composerText.trim(),
      pageType: typeOption.id,
      source: 'manual',
      ...(attribution ? { attribution } : {}),
    })
    setEntries((prev) => [newEntry, ...prev])
    setComposerText('')
    setComposerDate(todayIsoDateSite())
    setComposerTime(nowSiteTime())
    setComposerType('verlauf')
    setComposerOpen(false)
  }, [caseId, composerDate, composerTime, composerText, composerType, member, role, user?.id])

  const handleComposerCancel = useCallback(() => {
    setComposerText('')
    setComposerDate(todayIsoDateSite())
    setComposerTime(nowSiteTime())
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

  // Item 9 — "KI verbessern": improve-only pass over the WHOLE entry. Reuses the
  // inline-edit preview flow with a fixed improve-only instruction (shared with
  // the Psychopathologischer Befund KI, Item 8) so the model polishes wording
  // without adding interpretation.
  const handleEntryImprove = useCallback(
    (id: string, anchor: DOMRect) => {
      const entry = entries.find((e) => e.id === id)
      if (!entry || !entry.content.trim()) return
      inlineEdit.open({
        selectedText: entry.content,
        fullText: entry.content,
        selectionStart: 0,
        selectionEnd: entry.content.length,
        position: {
          top: anchor.bottom + 8,
          left: Math.max(16, anchor.left - 240),
        },
        presetInstruction: buildImproveOnlyInstruction(),
        applyReplacement: (editedText) => {
          setEntries(updateVerlaufEntry(id, editedText, caseId))
        },
      })
    },
    [caseId, entries, inlineEdit],
  )

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

  const exportItems = useMemo((): VerlaufExportItem[] => {
    return allItems.map((item) => {
      if (item.kind === 'manual') {
        return {
          kind: 'manual',
          date: item.entry.date,
          sectionLabel: item.entry.sectionLabel,
          subheading: item.entry.subheading,
          content: item.entry.content,
        }
      }
      if (isAufnahmeFeedEvent(item.event) && item.event.sections.length > 0) {
        return {
          kind: 'derived',
          date: item.event.date,
          sourceLabel: item.event.sourceLabel,
          title: item.event.title,
          body: item.event.body,
          sections: item.event.sections,
        }
      }
      return {
        kind: 'derived',
        date: item.event.date,
        sourceLabel: item.event.sourceLabel,
        title: item.event.title,
        body: item.event.body,
      }
    })
  }, [allItems])

  const handleCopyAll = useCallback(async () => {
    const text = buildVerlaufPlainText(exportItems, t('verlaufFeedTitle'))
    const copied = await copyTextToClipboard(text)
    if (copied) showNotionToast(t('notionCopied'))
  }, [exportItems, t])

  const handleExportAll = useCallback(() => {
    const text = buildVerlaufPlainText(exportItems, t('verlaufFeedTitle'))
    exportVerlaufText(`${caseId}-verlauf`, text)
  }, [caseId, exportItems, t])

  const handlePrintAll = useCallback(() => {
    printVerlauf(exportItems, t('verlaufFeedTitle'))
  }, [exportItems, t])

  return (
    <div
      className={`verlauf-feed-layout${
        isNarrow ? ' verlauf-feed-layout--narrow' : ''
      }`}
    >
    <div className="verlauf-feed-page">
      <div className="verlauf-feed-chrome">
      <header className="verlauf-feed-page__header">
        <h2 className="verlauf-feed-page__title">{t('verlaufFeedTitle')}</h2>
        <div className="verlauf-feed-page__header-actions">
          {!isEmpty ? (
            <VerlaufActionToolbar
              onCopy={() => void handleCopyAll()}
              onExport={handleExportAll}
              onPrint={handlePrintAll}
            />
          ) : null}
          {!composerOpen ? (
            <div className="verlauf-feed-page__header-entry-actions">
              <button
                type="button"
                className="verlauf-feed-page__new-btn verlauf-feed-page__new-btn--secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  setSomaticModalOpen(true)
                }}
              >
                ＋ {t('verlaufSomaticBefundNew')}
              </button>
              <button
                type="button"
                className="verlauf-feed-page__new-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onNewEntryRequest) {
                    onNewEntryRequest()
                    return
                  }
                  setComposerOpen(true)
                }}
              >
                ＋ {t('verlaufNewEntry')}
              </button>
            </div>
          ) : null}
        </div>
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
              {t('verlaufEntryDateLabel')}
              <input
                type="date"
                className="verlauf-composer__date-input"
                value={composerDate}
                onChange={(e) => setComposerDate(e.target.value)}
              />
            </label>
            <label className="verlauf-composer__date-label">
              {t('verlaufEntryTimeLabel')}
              <input
                type="time"
                className="verlauf-composer__date-input"
                value={composerTime}
                onChange={(e) => setComposerTime(e.target.value)}
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
      </div>

      {isEmpty && !composerOpen ? (
        <div className="clinical-empty-state-card verlauf-feed-page__empty-card">
          <p className="clinical-empty-state-card__text">{t('verlaufFeedEmpty')}</p>
        </div>
      ) : isEmpty ? null : (
        <div className="verlauf-feed-page__list" ref={listRef}>
          {visibleItems.map((item, index) => (
            <div key={item.id}>
              {item.kind === 'manual' ? (
                isSomaticBefundEntry(item.entry) ? (
                  <SomaticBefundEntryCard
                    entry={item.entry}
                    onDelete={handleEntryDelete}
                    onOpenFullBefund={onOpenFullBefund}
                  />
                ) : (
                  <EntryCard
                    entry={item.entry}
                    annotations={annotations}
                    onSelection={handleSelection}
                    onCommentSelect={handleCommentSelect}
                    onTodoSelect={handleTodoSelect}
                    onEdit={handleEntryEdit}
                    onEditDate={handleEntryEditDate}
                    onDelete={handleEntryDelete}
                    onImprove={aiEditEnabled ? handleEntryImprove : undefined}
                  />
                )
              ) : isAufnahmeFeedEvent(item.event) && item.event.sections.length > 0 ? (
                <AufnahmeEntryCard
                  event={item.event}
                  annotations={annotations}
                  readonlyLabel={aufnahmeReadonlyLabel}
                  copyLabel={copyLabel}
                  onSelection={handleSelection}
                  onCommentSelect={handleCommentSelect}
                  onTodoSelect={handleTodoSelect}
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
                  onTodoSelect={handleTodoSelect}
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
            onTodo={handleTodo}
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

          <TodoComposePopover
            state={todoPopover}
            onSave={handleSaveTodo}
            onClose={closeTodoPopover}
          />

          <VerlaufAnnotationConnector
            commentId={linkedCommentId}
            mode={isNarrow ? 'bubble' : 'panel'}
          />

          <VerlaufAnnotationConnector
            commentId={linkedTodoId}
            mode={isNarrow ? 'bubble' : 'panel'}
            annotType="todo"
            panelAttr="data-verlauf-todo-panel-id"
            bubbleAttr="data-verlauf-todo-bubble-id"
            lineColor={hexToRgba(verlaufTodoPriorityColor(
              visibleTodos.find((todoItem) => todoItem.id === linkedTodoId)?.priority,
            ), 0.6)}
            dotColor={hexToRgba(verlaufTodoPriorityColor(
              visibleTodos.find((todoItem) => todoItem.id === linkedTodoId)?.priority,
            ), 0.85)}
          />

          {isNarrow ? (
            <VerlaufCommentHoverBubble
              commentId={revealedCommentId}
              comment={visibleComments.find((c) => c.id === revealedCommentId)}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
              onRemove={handleRemoveComment}
              onEdit={handleEditComment}
              onHover={(id) => {
                if (id) {
                  cancelHoverClear()
                  setHoveredCommentId(id)
                } else {
                  scheduleHoverClear()
                }
              }}
              cancelHoverClear={cancelHoverClear}
              scheduleHoverClear={scheduleHoverClear}
            />
          ) : null}

          {isNarrow ? (
            <VerlaufTodoHoverBubble
              todoId={todoReveal.revealedId}
              todo={visibleTodos.find((todoItem) => todoItem.id === todoReveal.revealedId)}
              onToggleDone={handleToggleTodoDone}
              onRemove={handleRemoveTodo}
              onEdit={handleEditTodo}
              onHover={(id) => {
                if (id) {
                  todoReveal.cancelHoverClear()
                  todoReveal.setHoveredId(id)
                } else {
                  todoReveal.scheduleHoverClear()
                }
              }}
              cancelHoverClear={todoReveal.cancelHoverClear}
              scheduleHoverClear={todoReveal.scheduleHoverClear}
            />
          ) : null}

          {inlineEdit.popup}
        </>,
        document.body,
      )}
    </div>

    {!isNarrow ? (
      <div className="verlauf-feed-aside">
        <VerlaufAnnotationPanel
          comments={visibleComments}
          activeId={activeAnnotationId}
          linkedId={linkedCommentId}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onSelect={handleCommentSelect}
          onRemove={handleRemoveComment}
          onEdit={handleEditComment}
          onHover={(id) => {
            if (id) {
              cancelHoverClear()
              setHoveredCommentId(id)
            } else {
              scheduleHoverClear()
            }
          }}
        />
        <VerlaufTodoPanel
          todos={visibleTodos}
          activeId={activeTodoId}
          linkedId={linkedTodoId}
          onSelect={handleTodoSelect}
          onToggleDone={handleToggleTodoDone}
          onRemove={handleRemoveTodo}
          onEdit={handleEditTodo}
          onHover={(id) => {
            if (id) {
              todoReveal.cancelHoverClear()
              todoReveal.setHoveredId(id)
            } else {
              todoReveal.scheduleHoverClear()
            }
          }}
        />
      </div>
    ) : null}

      <SomaticBefundQuickModal
        open={somaticModalOpen}
        caseId={caseId}
        userId={user?.id}
        onClose={() => setSomaticModalOpen(false)}
        onSaved={() => {
          setEntries(loadVerlaufFeed(caseId))
          showNotionToast(t('verlaufSomaticBefundSaved'))
        }}
        onOpenFullBefund={onOpenFullBefund}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Re-export for auto-save integration
// ---------------------------------------------------------------------------
export { appendVerlaufEntry }

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { VerlaufCommentVisibility } from '../../utils/verlaufAnnotationHelpers'
import { resolveCommentBubblePlacement } from '../../utils/verlaufAnnotationHelpers'
import type { TeamMemberProfile } from '../../services/orgApi'
import type { VerlaufCommentItem } from './VerlaufAnnotationPanel'

interface VerlaufCommentHoverBubbleProps {
  commentId: string | null
  comment: VerlaufCommentItem | undefined
  teamMembers: TeamMemberProfile[]
  currentUserId: string | undefined
  onRemove: (id: string) => void
  onEdit: (id: string, comment: string) => void
  onHover: (id: string | null) => void
  cancelHoverClear: () => void
  scheduleHoverClear: () => void
}

function visibilityLabel(
  visibility: VerlaufCommentVisibility | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (visibility ?? 'private') {
    case 'team':
      return t('verlaufCommentVisibilityTeam')
    case 'person':
      return t('verlaufCommentVisibilityPerson')
    default:
      return t('verlaufCommentVisibilityPrivate')
  }
}

function memberLabel(member: TeamMemberProfile | undefined): string {
  if (!member) return '—'
  return member.displayName?.trim() || member.email?.trim() || member.userId.slice(0, 8)
}

export function VerlaufCommentHoverBubble({
  commentId,
  comment,
  teamMembers,
  currentUserId,
  onRemove,
  onEdit,
  onHover,
  cancelHoverClear,
  scheduleHoverClear,
}: VerlaufCommentHoverBubbleProps) {
  const { t } = useTranslation()
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0, ready: false, placeable: false })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Reset any in-progress edit whenever the revealed comment changes.
  useEffect(() => {
    setEditing(false)
    setDraft(comment?.comment ?? '')
  }, [commentId, comment?.comment])

  const measure = useCallback(() => {
    if (!commentId || !comment) {
      setPlacement((prev) => (prev.ready ? { ...prev, ready: false, placeable: false } : prev))
      return
    }

    const anchor = document.querySelector<HTMLElement>(
      `[data-verlauf-annotation-id="${commentId}"][data-verlauf-annot-type="comment"]`,
    )
    const bubble = bubbleRef.current
    if (!anchor || !bubble) return

    const anchorRect = anchor.getBoundingClientRect()
    const { width, height } = bubble.getBoundingClientRect()
    const next = resolveCommentBubblePlacement(
      anchorRect,
      width,
      height,
      window.innerWidth,
      window.innerHeight,
    )
    setPlacement({ top: next.top, left: next.left, ready: true, placeable: next.placeable })
  }, [comment, commentId])

  useLayoutEffect(() => {
    if (!commentId || !comment) {
      setPlacement({ top: 0, left: 0, ready: false, placeable: false })
      return
    }
    measure()
  }, [comment, commentId, measure])

  useEffect(() => {
    if (!commentId || !comment) return

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        measure()
      })
    }

    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    const anchor = document.querySelector<HTMLElement>(
      `[data-verlauf-annotation-id="${commentId}"][data-verlauf-annot-type="comment"]`,
    )
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (anchor) observer?.observe(anchor)
    if (bubbleRef.current) observer?.observe(bubbleRef.current)

    return () => {
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [comment, commentId, measure])

  if (!commentId || !comment) return null

  const isAuthor = !comment.authorUserId || comment.authorUserId === currentUserId
  const sharedMember =
    comment.visibility === 'person'
      ? teamMembers.find((m) => m.userId === comment.sharedWithUserId)
      : undefined

  function startEdit() {
    setDraft(comment?.comment ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(comment?.comment ?? '')
  }

  function saveEdit() {
    if (!commentId) return
    const next = draft.trim()
    if (next && next !== comment?.comment) onEdit(commentId, next)
    setEditing(false)
  }

  return createPortal(
    <div
      ref={bubbleRef}
      className="verlauf-comment-bubble"
      role="tooltip"
      data-verlauf-comment-bubble-id={commentId}
      style={{
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        visibility: placement.ready && placement.placeable ? 'visible' : 'hidden',
        pointerEvents: placement.ready && placement.placeable ? 'auto' : 'none',
      }}
      onMouseEnter={() => {
        cancelHoverClear()
        onHover(commentId)
      }}
      onMouseLeave={() => {
        if (!editing) scheduleHoverClear()
      }}
      onFocusCapture={() => {
        cancelHoverClear()
        onHover(commentId)
      }}
      onBlurCapture={(e) => {
        if (editing) return
        const related = e.relatedTarget as Node | null
        if (related) {
          const anchor = document.querySelector(
            `[data-verlauf-annotation-id="${commentId}"][data-verlauf-annot-type="comment"]`,
          )
          if (anchor?.contains(related)) return
        }
        scheduleHoverClear()
      }}
    >
      <div className="verlauf-comment-bubble__head">
        <span className="verlauf-comment-bubble__visibility">
          {visibilityLabel(comment.visibility, t)}
          {comment.visibility === 'person' && sharedMember ? (
            <span className="verlauf-comment-bubble__shared-with">
              {' → '}
              {memberLabel(sharedMember)}
            </span>
          ) : null}
        </span>
        {isAuthor && !editing ? (
          <span className="verlauf-comment-bubble__actions">
            <button
              type="button"
              className="icon-action-btn"
              title={t('verlaufCommentEdit')}
              aria-label={t('verlaufCommentEdit')}
              onClick={startEdit}
            >
              <Pencil strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--danger"
              title={t('verlaufCommentRemove')}
              aria-label={t('verlaufCommentRemove')}
              onClick={() => onRemove(commentId)}
            >
              <Trash2 strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        ) : null}
      </div>

      <blockquote className="verlauf-comment-bubble__quote">{comment.rangeText || '…'}</blockquote>

      {editing ? (
        <div className="verlauf-comment-bubble__editor">
          <textarea
            className="verlauf-comment-bubble__editor-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split('\n').length)}
            // biome-ignore lint/a11y/noAutofocus: editing inside the revealed bubble
            autoFocus
          />
          <div className="verlauf-comment-bubble__editor-actions">
            <button
              type="button"
              className="icon-action-btn"
              title={t('verlaufEntryCancel')}
              aria-label={t('verlaufEntryCancel')}
              onClick={cancelEdit}
            >
              <X strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--success"
              title={t('verlaufEntrySave')}
              aria-label={t('verlaufEntrySave')}
              onClick={saveEdit}
              disabled={!draft.trim()}
            >
              <Check strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <p className="verlauf-comment-bubble__text">{comment.comment}</p>
      )}
    </div>,
    document.body,
  )
}

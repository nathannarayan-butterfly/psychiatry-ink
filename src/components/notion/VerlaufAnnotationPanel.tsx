import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { VerlaufAnnotation } from '../../utils/verlaufFeed'
import type { VerlaufCommentVisibility } from '../../utils/verlaufAnnotationHelpers'
import {
  panelListMinHeight,
  resolvePanelItemPositions,
  VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT,
  type PanelItemPosition,
} from '../../utils/verlaufAnnotationHelpers'
import type { TeamMemberProfile } from '../../services/orgApi'

export interface VerlaufCommentItem extends VerlaufAnnotation {
  type: 'comment'
  comment: string
}

interface VerlaufAnnotationPanelProps {
  comments: VerlaufCommentItem[]
  activeId: string | null
  /** Pinned or hovered comment — highlights the card to mirror the source link. */
  linkedId?: string | null
  teamMembers: TeamMemberProfile[]
  currentUserId: string | undefined
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  /** Hover feedback so the connector + source highlight can track the card. */
  onHover?: (id: string | null) => void
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

export const VerlaufAnnotationPanel = memo(function VerlaufAnnotationPanel({
  comments,
  activeId,
  linkedId,
  teamMembers,
  currentUserId,
  onSelect,
  onRemove,
  onHover,
}: VerlaufAnnotationPanelProps) {
  const { t } = useTranslation()
  const activeRef = useRef<HTMLLIElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [positions, setPositions] = useState<PanelItemPosition[]>([])
  const [listMinHeight, setListMinHeight] = useState(0)

  const updatePositions = useCallback(() => {
    const listEl = listRef.current
    if (!listEl || comments.length === 0) {
      setPositions([])
      setListMinHeight(0)
      return
    }
    const listRect = listEl.getBoundingClientRect()
    const next = resolvePanelItemPositions(
      comments.map((item) => item.id),
      listRect.top,
    )
    setPositions(next)
    setListMinHeight(panelListMinHeight(next))
    window.dispatchEvent(new CustomEvent(VERLAUF_ANNOTATION_PANEL_LAYOUT_EVENT))
  }, [comments])

  useEffect(() => {
    const raf = requestAnimationFrame(updatePositions)
    window.addEventListener('scroll', updatePositions, true)
    window.addEventListener('resize', updatePositions)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updatePositions, true)
      window.removeEventListener('resize', updatePositions)
    }
  }, [updatePositions, activeId])

  useEffect(() => {
    if (!activeId || !activeRef.current) return
    activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  const positionById = new Map(positions.map((p) => [p.id, p]))

  return (
    <aside className="verlauf-annotation-panel" aria-label={t('verlaufAnnotationPanelTitle')}>
      <header className="verlauf-annotation-panel__header">
        <h3 className="verlauf-annotation-panel__title">{t('verlaufAnnotationPanelTitle')}</h3>
        <span className="verlauf-annotation-panel__count">{comments.length}</span>
      </header>

      {comments.length === 0 ? (
        <p className="verlauf-annotation-panel__empty">{t('verlaufAnnotationPanelEmpty')}</p>
      ) : (
        <ul
          ref={listRef}
          className="verlauf-annotation-panel__list"
          style={{ minHeight: listMinHeight > 0 ? `${listMinHeight}px` : undefined }}
        >
          {comments.map((item) => {
            const isActive = item.id === activeId
            const isLinked = item.id === linkedId
            const isAuthor = !item.authorUserId || item.authorUserId === currentUserId
            const sharedMember =
              item.visibility === 'person'
                ? teamMembers.find((m) => m.userId === item.sharedWithUserId)
                : undefined
            const position = positionById.get(item.id)

            return (
              <li
                key={item.id}
                ref={isActive ? activeRef : undefined}
                className={`verlauf-annotation-panel__item${
                  isActive ? ' verlauf-annotation-panel__item--active' : ''
                }${isLinked && !isActive ? ' verlauf-annotation-panel__item--linked' : ''}${
                  position?.anchored ? ' verlauf-annotation-panel__item--anchored' : ''
                }`}
                style={
                  position
                    ? { top: `${position.top}px`, transform: 'translateY(-50%)' }
                    : undefined
                }
                onMouseEnter={() => onHover?.(item.id)}
                onMouseLeave={() => onHover?.(null)}
              >
                <button
                  type="button"
                  className="verlauf-annotation-panel__item-btn"
                  data-verlauf-panel-annotation-id={item.id}
                  onClick={() => onSelect(item.id)}
                >
                  <blockquote className="verlauf-annotation-panel__quote">
                    {item.rangeText || '…'}
                  </blockquote>
                  <p className="verlauf-annotation-panel__comment">{item.comment}</p>
                  <div className="verlauf-annotation-panel__meta">
                    <span className="verlauf-annotation-panel__visibility">
                      {visibilityLabel(item.visibility, t)}
                    </span>
                    {item.visibility === 'person' && sharedMember ? (
                      <span className="verlauf-annotation-panel__shared-with">
                        → {memberLabel(sharedMember)}
                      </span>
                    ) : null}
                  </div>
                </button>
                {isAuthor ? (
                  <button
                    type="button"
                    className="verlauf-annotation-panel__delete"
                    onClick={() => onRemove(item.id)}
                  >
                    {t('verlaufCommentRemove')}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
})

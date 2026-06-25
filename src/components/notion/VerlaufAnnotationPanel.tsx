import { memo, useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { VerlaufAnnotation } from '../../utils/verlaufFeed'
import type { VerlaufCommentVisibility } from '../../utils/verlaufAnnotationHelpers'
import type { TeamMemberProfile } from '../../services/orgApi'

export interface VerlaufCommentItem extends VerlaufAnnotation {
  type: 'comment'
  comment: string
}

interface VerlaufAnnotationPanelProps {
  comments: VerlaufCommentItem[]
  activeId: string | null
  /** Pinned or hovered comment — highlights the index entry. */
  linkedId?: string | null
  teamMembers: TeamMemberProfile[]
  currentUserId: string | undefined
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string, comment: string) => void
  /** Hover feedback so the feed anchor + bubble can track the index entry. */
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

interface PanelCommentItemProps {
  item: VerlaufCommentItem
  isActive: boolean
  isLinked: boolean
  isAuthor: boolean
  sharedMember: TeamMemberProfile | undefined
  activeRef: React.Ref<HTMLLIElement>
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string, comment: string) => void
  onHover?: (id: string | null) => void
}

function PanelCommentItem({
  item,
  isActive,
  isLinked,
  isAuthor,
  sharedMember,
  activeRef,
  onSelect,
  onRemove,
  onEdit,
  onHover,
}: PanelCommentItemProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.comment)

  function startEdit() {
    setDraft(item.comment)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(item.comment)
  }

  function saveEdit() {
    const next = draft.trim()
    if (next && next !== item.comment) onEdit(item.id, next)
    setEditing(false)
  }

  return (
    <li
      ref={isActive ? activeRef : undefined}
      className={`verlauf-annotation-panel__item${
        isActive ? ' verlauf-annotation-panel__item--active' : ''
      }${isLinked && !isActive ? ' verlauf-annotation-panel__item--linked' : ''}`}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="verlauf-annotation-panel__item-head">
        <span className="verlauf-annotation-panel__visibility">
          {visibilityLabel(item.visibility, t)}
          {item.visibility === 'person' && sharedMember ? (
            <span className="verlauf-annotation-panel__shared-with">
              {' → '}
              {memberLabel(sharedMember)}
            </span>
          ) : null}
        </span>
        {isAuthor && !editing ? (
          <span className="verlauf-annotation-panel__item-actions">
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
              onClick={() => onRemove(item.id)}
            >
              <Trash2 strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        ) : null}
      </div>

      {editing ? (
        <div className="verlauf-annotation-panel__editor">
          <textarea
            className="verlauf-annotation-panel__editor-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split('\n').length)}
            // biome-ignore lint/a11y/noAutofocus: editing a single card in place
            autoFocus
          />
          <div className="verlauf-annotation-panel__editor-actions">
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
        <button
          type="button"
          className="verlauf-annotation-panel__item-btn"
          data-verlauf-panel-annotation-id={item.id}
          onClick={() => onSelect(item.id)}
          onFocus={() => onHover?.(item.id)}
          onBlur={() => onHover?.(null)}
        >
          <blockquote className="verlauf-annotation-panel__quote">
            {item.rangeText || '…'}
          </blockquote>
          <p className="verlauf-annotation-panel__comment">{item.comment}</p>
        </button>
      )}
    </li>
  )
}

export const VerlaufAnnotationPanel = memo(function VerlaufAnnotationPanel({
  comments,
  activeId,
  linkedId,
  teamMembers,
  currentUserId,
  onSelect,
  onRemove,
  onEdit,
  onHover,
}: VerlaufAnnotationPanelProps) {
  const { t } = useTranslation()
  const activeRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!activeId || !activeRef.current) return
    activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  return (
    <aside className="verlauf-annotation-panel" aria-label={t('verlaufAnnotationPanelTitle')}>
      <header className="verlauf-annotation-panel__header">
        <h3 className="verlauf-annotation-panel__title">{t('verlaufAnnotationPanelTitle')}</h3>
        <span className="verlauf-annotation-panel__count">{comments.length}</span>
      </header>

      {comments.length === 0 ? (
        <p className="verlauf-annotation-panel__empty">{t('verlaufAnnotationPanelEmpty')}</p>
      ) : (
        <ul className="verlauf-annotation-panel__list">
          {comments.map((item) => {
            const isAuthor = !item.authorUserId || item.authorUserId === currentUserId
            const sharedMember =
              item.visibility === 'person'
                ? teamMembers.find((m) => m.userId === item.sharedWithUserId)
                : undefined

            return (
              <PanelCommentItem
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                isLinked={item.id === linkedId}
                isAuthor={isAuthor}
                sharedMember={sharedMember}
                activeRef={activeRef}
                onSelect={onSelect}
                onRemove={onRemove}
                onEdit={onEdit}
                onHover={onHover}
              />
            )
          })}
        </ul>
      )}
    </aside>
  )
})

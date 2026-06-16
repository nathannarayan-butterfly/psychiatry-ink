import { MessageSquare, Plus } from 'lucide-react'
import { useDiscussSectionNavOptional } from '../../contexts/DiscussSectionNavContext'
import type { DiscussCaseListItem } from '../../types/discussCase'

const STATUS_LABELS: Record<DiscussCaseListItem['status'], string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  archived: 'Archiviert',
  revoked: 'Entzogen',
}

function formatListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Discuss tab navigation hosted in the global case sidebar: conversation list + new. */
export function DiscussSectionNav() {
  const nav = useDiscussSectionNavOptional()
  if (!nav) return null

  const { snapshot, openDiscussion, requestCreate } = nav
  const { discussions, loading, error, activeDiscussionId, canCreate } = snapshot

  return (
    <nav className="med-therapy-nav discuss-section-nav" aria-label="Besprechungen">
      <button
        type="button"
        className="discuss-section-nav__new"
        onClick={requestCreate}
        disabled={!canCreate}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Neue Besprechung
      </button>

      <div className="med-therapy-nav__list discuss-section-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">Besprechungen</span>

          {loading ? (
            <p className="discuss-section-nav__hint">Wird geladen…</p>
          ) : error ? (
            <p className="discuss-section-nav__hint discuss-section-nav__hint--error">{error}</p>
          ) : discussions.length === 0 ? (
            <p className="discuss-section-nav__hint">Noch keine Besprechungen.</p>
          ) : (
            <ul className="med-therapy-nav__items discuss-section-nav__items">
              {discussions.map((discussion) => {
                const active = discussion.id === activeDiscussionId
                return (
                  <li key={discussion.id}>
                    <button
                      type="button"
                      className={`discuss-section-nav__item${
                        active ? ' discuss-section-nav__item--active' : ''
                      }`}
                      onClick={() => openDiscussion(discussion.id)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <MessageSquare
                        className="discuss-section-nav__item-icon h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                      <span className="discuss-section-nav__item-text">
                        <span className="discuss-section-nav__item-title">{discussion.title}</span>
                        <span className="discuss-section-nav__item-meta">
                          {formatListDate(discussion.updatedAt)} · {STATUS_LABELS[discussion.status]}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </nav>
  )
}

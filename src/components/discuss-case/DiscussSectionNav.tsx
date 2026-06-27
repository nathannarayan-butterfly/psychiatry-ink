import { MessageSquare, Plus } from 'lucide-react'
import { useDiscussSectionNavOptional } from '../../contexts/DiscussSectionNavContext'
import { loadStoredUiLanguage } from '../../utils/clinicalLanguage'
import {
  type DiscussChromeLocale,
  discussChromeT,
  discussStatusLabel,
  resolveDiscussChromeLocale,
} from '../../utils/discussCase/chromeI18n'

const DATE_LOCALES: Record<DiscussChromeLocale, string> = {
  de: 'de-DE',
  en: 'en-GB',
  fr: 'fr-FR',
  es: 'es-ES',
}

function formatListDate(iso: string, locale: DiscussChromeLocale): string {
  try {
    return new Date(iso).toLocaleDateString(DATE_LOCALES[locale], { day: '2-digit', month: '2-digit' })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Discuss tab navigation hosted in the global case sidebar: conversation list + new. */
export function DiscussSectionNav() {
  const nav = useDiscussSectionNavOptional()
  const locale = resolveDiscussChromeLocale(loadStoredUiLanguage())
  if (!nav) return null

  const { snapshot, openDiscussion, requestCreate } = nav
  const { discussions, loading, error, activeDiscussionId, canCreate } = snapshot

  return (
    <nav className="med-therapy-nav discuss-section-nav" aria-label={discussChromeT(locale, 'navDiscussions')}>
      <button
        type="button"
        className="discuss-section-nav__new"
        onClick={requestCreate}
        disabled={!canCreate}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {discussChromeT(locale, 'newDiscussion')}
      </button>

      <div className="med-therapy-nav__list discuss-section-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">{discussChromeT(locale, 'navDiscussions')}</span>

          {loading ? (
            <p className="discuss-section-nav__hint">{discussChromeT(locale, 'navLoading')}</p>
          ) : error ? (
            // Show a localized failure message rather than the raw backend error
            // string (which is English-only, e.g. "Authentication required") so
            // the German sidebar never leaks English. The detail is preserved in
            // the tooltip for debugging.
            <p
              className="discuss-section-nav__hint discuss-section-nav__hint--error"
              title={error}
            >
              {discussChromeT(locale, 'loadFailed')}
            </p>
          ) : discussions.length === 0 ? (
            <p className="discuss-section-nav__hint">{discussChromeT(locale, 'navNoDiscussions')}</p>
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
                          {formatListDate(discussion.updatedAt, locale)} · {discussStatusLabel(locale, discussion.status)}
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

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MessageSquare, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { collectClinicalPayload } from '../../utils/workspaceVault'
import { deleteDiscussion, listDiscussions } from '../../services/discussCaseApi'
import type { DiscussCaseListItem } from '../../types/discussCase'
import { ClinicalFullPageLayout } from '../AppLogoHeader'
import { DiscussCasePackageBuilder } from './DiscussCasePackageBuilder'
import { DiscussCaseView } from './DiscussCaseView'
import { useDiscussSectionNavOptional } from '../../contexts/DiscussSectionNavContext'
import { loadStoredUiLanguage } from '../../utils/clinicalLanguage'
import { discussChromeT, discussStatusLabel, resolveDiscussChromeLocale } from '../../utils/discussCase/chromeI18n'

type DiscussCaseMode = 'list' | 'create' | 'view'

/**
 * The creator/owner can delete a discussion from the list at any status —
 * deletion runs on the encrypted row by id and never needs the decryption key,
 * so it stays reachable even when the session can't be opened. Non-owner
 * managers keep the archived-only rule mirrored from the server.
 */
function canDeleteDiscussion(discussion: DiscussCaseListItem): boolean {
  return discussion.isOwner || (discussion.canManage && discussion.status === 'archived')
}

interface DiscussCasePageProps {
  caseId: string
  discussionId?: string
  onNavigate: (path: string) => void
  onNavigateHome?: () => void
  /** Render inside NotionApp case shell (no full-page layout). */
  embedded?: boolean
}

export function DiscussCasePage({
  caseId,
  discussionId,
  onNavigate,
  onNavigateHome,
  embedded = false,
}: DiscussCasePageProps) {
  const handleNavigateHome = onNavigateHome ?? (() => onNavigate('/dashboard'))
  const wrap = (content: ReactNode) =>
    embedded ? content : (
      <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>{content}</ClinicalFullPageLayout>
    )
  const payload = useMemo(() => collectClinicalPayload(undefined, caseId), [caseId])
  const caseMeta = getCaseMeta(caseId)
  const [mode, setMode] = useState<DiscussCaseMode>(discussionId ? 'view' : 'list')
  const [discussions, setDiscussions] = useState<DiscussCaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDiscussionId, setActiveDiscussionId] = useState(discussionId ?? '')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const sidebarNav = useDiscussSectionNavOptional()
  const locale = resolveDiscussChromeLocale(loadStoredUiLanguage())

  const refreshList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listDiscussions(caseId)
      setDiscussions(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : discussChromeT(locale, 'loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [caseId, locale])

  // Keep the list fresh on mount and whenever the mode changes so the global
  // sidebar conversation list stays in sync even while viewing a discussion.
  useEffect(() => {
    void refreshList()
  }, [refreshList, mode])

  useEffect(() => {
    if (discussionId) {
      setActiveDiscussionId(discussionId)
      setMode('view')
      return
    }
    setActiveDiscussionId('')
    setMode('list')
  }, [discussionId])

  const openDiscussion = useCallback(
    (id: string) => {
      setActiveDiscussionId(id)
      setMode('view')
      onNavigate(`/case/${encodeURIComponent(caseId)}/discuss/${encodeURIComponent(id)}`)
    },
    [caseId, onNavigate],
  )

  const backToList = useCallback(() => {
    setMode('list')
    onNavigate(`/case/${encodeURIComponent(caseId)}/discuss`)
  }, [caseId, onNavigate])

  const requestCreate = useCallback(() => {
    if (payload) setMode('create')
  }, [payload])

  // Bridge state + actions into the global case sidebar (single left panel).
  useEffect(() => {
    sidebarNav?.setHandlers({ openDiscussion, requestCreate, backToList })
  }, [sidebarNav, openDiscussion, requestCreate, backToList])

  useEffect(() => {
    sidebarNav?.setSnapshot({
      discussions,
      loading,
      error,
      activeDiscussionId: mode === 'view' ? activeDiscussionId : '',
      canCreate: Boolean(payload),
    })
  }, [sidebarNav, discussions, loading, error, mode, activeDiscussionId, payload])

  const handleDeleteDiscussion = useCallback(
    async (item: DiscussCaseListItem) => {
      if (!canDeleteDiscussion(item) || deletingId) return
      const confirmed = window.confirm(discussChromeT(locale, 'deleteDiscussionConfirm'))
      if (!confirmed) return

      setDeletingId(item.id)
      setError(null)
      try {
        await deleteDiscussion(item.id)
        setDiscussions((current) => current.filter((discussion) => discussion.id !== item.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : discussChromeT(locale, 'deleteFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId, locale],
  )

  if (mode === 'create' && payload) {
    return wrap(
      <DiscussCasePackageBuilder
        caseId={caseId}
        payload={payload}
        patientName={caseMeta?.localName || [caseMeta?.localVorname, caseMeta?.localNachname].filter(Boolean).join(' ')}
        onBack={() => setMode('list')}
        onCreated={(id) => openDiscussion(id)}
      />,
    )
  }

  if (mode === 'view' && activeDiscussionId) {
    return wrap(
      <div className="discuss-case-page">
        <DiscussCaseView
          discussionId={activeDiscussionId}
          onBack={backToList}
          onArchived={() => {
            setMode('list')
            onNavigate(`/case/${encodeURIComponent(caseId)}/discuss`)
          }}
        />
      </div>,
    )
  }

  // Embedded list mode: the conversation list lives in the global sidebar, so
  // the main area becomes a spacious, welcoming landing for the workspace.
  if (embedded) {
    return wrap(
      <div className="discuss-case-page discuss-case-page--landing">
        <section className="discuss-case-hero">
          <span className="discuss-case-hero__badge">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            DiscussCase
          </span>
          <h1 className="discuss-case-hero__title">{discussChromeT(locale, 'heroTitle')}</h1>
          <p className="discuss-case-hero__subtitle">{discussChromeT(locale, 'heroSubtitle')}</p>
          <button
            type="button"
            className="discuss-case-hero__cta"
            onClick={() => setMode('create')}
            disabled={!payload}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            {discussChromeT(locale, 'newDiscussion')}
          </button>

          {error ? <p className="discuss-case-page__error">{error}</p> : null}

          {loading ? (
            <ClinicalLoading variant="compact" />
          ) : discussions.length > 0 ? (
            <div className="discuss-case-hero__recent">
              <h2 className="discuss-case-hero__recent-title">{discussChromeT(locale, 'recentlyActive')}</h2>
              <ul className="discuss-case-cards">
                {discussions.slice(0, 6).map((discussion) => (
                  <li key={discussion.id} className="discuss-case-card">
                    <button
                      type="button"
                      className="discuss-case-card__open"
                      onClick={() => openDiscussion(discussion.id)}
                    >
                      <span className="discuss-case-card__icon" aria-hidden="true">
                        <Users className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="discuss-case-card__text">
                        <span className="discuss-case-card__title">{discussion.title}</span>
                        <span className="discuss-case-card__meta">
                          {new Date(discussion.updatedAt).toLocaleDateString()}
                          <span
                            className={`discuss-case-card__status discuss-case-card__status--${discussion.status}`}
                          >
                            {discussStatusLabel(locale, discussion.status)}
                          </span>
                        </span>
                      </span>
                    </button>
                    {canDeleteDiscussion(discussion) ? (
                      <button
                        type="button"
                        className="discuss-case-card__delete icon-action-btn"
                        disabled={deletingId === discussion.id}
                        onClick={() => void handleDeleteDiscussion(discussion)}
                        title={discussChromeT(locale, 'deleteDiscussionTitle')}
                        aria-label={discussChromeT(locale, 'deleteDiscussionLabel')}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="clinical-empty-state discuss-case-hero__empty">
              {discussChromeT(locale, 'noDiscussions')}
            </p>
          )}
        </section>
      </div>,
    )
  }

  // Standalone (non-embedded) list view.
  return wrap(
    <div className="discuss-case-page">
      <header className="discuss-case-page__header">
        <div>
          <button
            type="button"
            className="discuss-case-page__back clinical-back-link"
            onClick={() => onNavigate(`/case/${encodeURIComponent(caseId)}?view=overview`)}
          >
            {discussChromeT(locale, 'caseOverview')}
          </button>
          <h1 className="discuss-case-page__title">
            <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            DiscussCase
          </h1>
          <p className="discuss-case-page__subtitle">{discussChromeT(locale, 'pageSubtitle')}</p>
        </div>
        <button
          type="button"
          className="discuss-case-page__create-btn"
          onClick={() => setMode('create')}
          disabled={!payload}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          {discussChromeT(locale, 'newDiscussion')}
        </button>
      </header>

      {error ? <p className="discuss-case-page__error">{error}</p> : null}

      {loading ? (
        <ClinicalLoading variant="compact" />
      ) : discussions.length === 0 ? (
        <p className="clinical-empty-state">{discussChromeT(locale, 'noDiscussions')}</p>
      ) : (
        <ul className="discuss-case-page__list">
          {discussions.map((discussion) => (
            <li key={discussion.id} className="discuss-case-page__list-row">
              <button
                type="button"
                className="discuss-case-page__list-item"
                onClick={() => openDiscussion(discussion.id)}
              >
                <span className="discuss-case-page__list-title">{discussion.title}</span>
                <span className="discuss-case-page__list-meta">
                  {new Date(discussion.updatedAt).toLocaleDateString()} ·{' '}
                  {discussStatusLabel(locale, discussion.status)}
                </span>
              </button>
              {canDeleteDiscussion(discussion) ? (
                <button
                  type="button"
                  className="discuss-case-page__delete-btn"
                  disabled={deletingId === discussion.id}
                  onClick={() => void handleDeleteDiscussion(discussion)}
                  title={discussChromeT(locale, 'deleteDiscussionTitle')}
                  aria-label={discussChromeT(locale, 'deleteDiscussionLabel')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {deletingId === discussion.id
                    ? discussChromeT(locale, 'deleting')
                    : discussChromeT(locale, 'delete')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>,
  )
}

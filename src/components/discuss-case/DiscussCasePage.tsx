import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { collectClinicalPayload } from '../../utils/workspaceVault'
import { deleteDiscussion, listDiscussions } from '../../services/discussCaseApi'
import type { DiscussCaseListItem } from '../../types/discussCase'
import { ClinicalFullPageLayout } from '../AppLogoHeader'
import { DiscussCasePackageBuilder } from './DiscussCasePackageBuilder'
import { DiscussCaseView } from './DiscussCaseView'

type DiscussCaseMode = 'list' | 'create' | 'view'

interface DiscussCasePageProps {
  caseId: string
  discussionId?: string
  onNavigate: (path: string) => void
  onNavigateHome?: () => void
}

export function DiscussCasePage({
  caseId,
  discussionId,
  onNavigate,
  onNavigateHome,
}: DiscussCasePageProps) {
  const handleNavigateHome = onNavigateHome ?? (() => onNavigate('/dashboard'))
  const payload = useMemo(() => collectClinicalPayload(undefined, caseId), [caseId])
  const caseMeta = getCaseMeta(caseId)
  const [mode, setMode] = useState<DiscussCaseMode>(discussionId ? 'view' : 'list')
  const [discussions, setDiscussions] = useState<DiscussCaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDiscussionId, setActiveDiscussionId] = useState(discussionId ?? '')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listDiscussions(caseId)
      setDiscussions(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    if (mode === 'list') void refreshList()
  }, [mode, refreshList])

  useEffect(() => {
    if (discussionId) {
      setActiveDiscussionId(discussionId)
      setMode('view')
    }
  }, [discussionId])

  const openDiscussion = useCallback(
    (id: string) => {
      setActiveDiscussionId(id)
      setMode('view')
      onNavigate(`/case/${encodeURIComponent(caseId)}/discuss/${encodeURIComponent(id)}`)
    },
    [caseId, onNavigate],
  )

  const handleDeleteDiscussion = useCallback(
    async (item: DiscussCaseListItem) => {
      if (!item.canManage || item.status !== 'archived' || deletingId) return
      const confirmed = window.confirm('Besprechung endgültig löschen?')
      if (!confirmed) return

      setDeletingId(item.id)
      setError(null)
      try {
        await deleteDiscussion(item.id)
        setDiscussions((current) => current.filter((discussion) => discussion.id !== item.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId],
  )

  if (mode === 'create' && payload) {
    return (
      <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
        <DiscussCasePackageBuilder
          caseId={caseId}
          payload={payload}
          patientName={caseMeta?.localName || [caseMeta?.localVorname, caseMeta?.localNachname].filter(Boolean).join(' ')}
          onBack={() => setMode('list')}
          onCreated={(id) => openDiscussion(id)}
        />
      </ClinicalFullPageLayout>
    )
  }

  if (mode === 'view' && activeDiscussionId) {
    return (
      <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
        <div className="discuss-case-page">
          <button
            type="button"
            className="discuss-case-page__back clinical-back-link"
            onClick={() => {
              setMode('list')
              onNavigate(`/case/${encodeURIComponent(caseId)}/discuss`)
            }}
          >
            ← Zurück
          </button>
          <DiscussCaseView
            discussionId={activeDiscussionId}
            onArchived={() => {
              setMode('list')
              onNavigate(`/case/${encodeURIComponent(caseId)}/discuss`)
            }}
          />
        </div>
      </ClinicalFullPageLayout>
    )
  }

  return (
    <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
    <div className="discuss-case-page">
      <header className="discuss-case-page__header">
        <div>
          <button
            type="button"
            className="discuss-case-page__back clinical-back-link"
            onClick={() => onNavigate(`/case/${encodeURIComponent(caseId)}?view=overview`)}
          >
            ← Fallübersicht
          </button>
          <h1 className="discuss-case-page__title">
            <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            DiscussCase
          </h1>
          <p className="discuss-case-page__subtitle">
            Fallbezogene Zusammenarbeit — intern, extern oder mit AI-Unterstützung.
          </p>
        </div>
        <button
          type="button"
          className="discuss-case-page__create-btn"
          onClick={() => setMode('create')}
          disabled={!payload}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Neue Besprechung
        </button>
      </header>

      {error ? <p className="discuss-case-page__error">{error}</p> : null}

      {loading ? (
        <ClinicalLoading variant="compact" />
      ) : discussions.length === 0 ? (
        <p className="clinical-empty-state">Noch keine Besprechungen für diesen Fall.</p>
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
                  {new Date(discussion.updatedAt).toLocaleDateString('de-DE')} · {discussion.status}
                </span>
              </button>
              {discussion.status === 'archived' && discussion.canManage ? (
                <button
                  type="button"
                  className="discuss-case-page__delete-btn"
                  disabled={deletingId === discussion.id}
                  onClick={() => void handleDeleteDiscussion(discussion)}
                  title="Besprechung endgültig löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {deletingId === discussion.id ? 'Löschen…' : 'Löschen'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
    </ClinicalFullPageLayout>
  )
}

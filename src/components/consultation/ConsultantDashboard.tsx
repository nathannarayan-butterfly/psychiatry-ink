import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { ConsultationRequest, ConsultationRequestStatus } from '../../types/consultation'
import { CONSULTATION_STATUS_LABELS } from '../../types/consultation'
import { listConsultantRequests } from '../../services/consultationApi'
import { ClinicalFullPageLayout } from '../AppLogoHeader'
import { ConsultantRequestWorkspace } from './ConsultantRequestWorkspace'

type FilterTab = 'all' | ConsultationRequestStatus

interface ConsultantDashboardProps {
  requestId?: string
  onNavigate: (path: string) => void
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'sent', label: 'Ausstehend' },
  { id: 'in_progress', label: 'In Bearbeitung' },
  { id: 'more_info_requested', label: 'Rückfrage offen' },
  { id: 'submitted', label: 'Eingereicht' },
  { id: 'archived', label: 'Archiviert' },
]

function matchesFilter(req: ConsultationRequest, tab: FilterTab): boolean {
  if (tab === 'all') return req.status !== 'archived'
  if (tab === 'sent') return req.status === 'sent' || req.status === 'viewed'
  return req.status === tab
}

export function ConsultantDashboard({ requestId, onNavigate }: ConsultantDashboardProps) {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listConsultantRequests()
      setRequests(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(
    () => requests.filter((r) => matchesFilter(r, activeTab)),
    [requests, activeTab],
  )

  if (requestId) {
    return (
      <ClinicalFullPageLayout onNavigateHome={() => onNavigate('/dashboard')}>
        <ConsultantRequestWorkspace
          requestId={requestId}
          onBack={() => onNavigate('/consultant/requests')}
        />
      </ClinicalFullPageLayout>
    )
  }

  return (
    <ClinicalFullPageLayout onNavigateHome={() => onNavigate('/dashboard')}>
    <div className="consultation-consultant">
      <header className="consultation-consultant__header">
        <div>
          <button
            type="button"
            className="consultation-page__back clinical-back-link"
            onClick={() => onNavigate('/dashboard')}
          >
            ← Dashboard
          </button>
          <h1 className="consultation-page__title">Externer Konsiliarzugang</h1>
          <p className="consultation-page__subtitle">Konsilanfragen — eingeschränkter Zugriff</p>
        </div>
      </header>

      <nav className="consultation-consultant__tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`consultation-consultant__tab${activeTab === tab.id ? ' consultation-consultant__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? <p className="consultation-page__error">{error}</p> : null}

      {loading ? (
        <ClinicalLoading variant="compact" />
      ) : filtered.length === 0 ? (
        <p className="clinical-empty-state">Keine Konsilanfragen in dieser Kategorie.</p>
      ) : (
        <ul className="consultation-page__list">
          {filtered.map((req) => (
            <li key={req.id}>
              <button
                type="button"
                className="consultation-page__list-item"
                onClick={() => onNavigate(`/consultant/requests/${encodeURIComponent(req.id)}`)}
              >
                <span className="consultation-page__list-title">{req.title}</span>
                <span className="consultation-page__list-meta">
                  {req.specialty} · {CONSULTATION_STATUS_LABELS[req.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
    </ClinicalFullPageLayout>
  )
}

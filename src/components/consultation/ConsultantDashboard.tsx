import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { ConsultationRequest, ConsultationRequestStatus } from '../../types/consultation'
import { listConsultantRequests } from '../../services/consultationApi'
import { ClinicalFullPageLayout } from '../AppLogoHeader'
import { ConsultantRequestWorkspace } from './ConsultantRequestWorkspace'
import { useTranslation } from '../../context/TranslationContext'
import {
  translateConsultationStatus,
  translateConsultationUi,
  type ConsultationUiKey,
} from '../../data/consultationUiTranslations'

type FilterTab = 'all' | ConsultationRequestStatus

interface ConsultantDashboardProps {
  requestId?: string
  onNavigate: (path: string) => void
}

const FILTER_TABS: { id: FilterTab; labelKey: ConsultationUiKey }[] = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'sent', labelKey: 'filterPending' },
  { id: 'in_progress', labelKey: 'filterInProgress' },
  { id: 'more_info_requested', labelKey: 'filterMoreInfo' },
  { id: 'submitted', labelKey: 'filterSubmitted' },
  { id: 'archived', labelKey: 'filterArchived' },
]

function matchesFilter(req: ConsultationRequest, tab: FilterTab): boolean {
  if (tab === 'all') return req.status !== 'archived'
  if (tab === 'sent') return req.status === 'sent' || req.status === 'viewed'
  return req.status === tab
}

export function ConsultantDashboard({ requestId, onNavigate }: ConsultantDashboardProps) {
  const { language } = useTranslation()
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
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [language])

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
            {translateConsultationUi(language, 'backToDashboard')}
          </button>
          <h1 className="consultation-page__title">{translateConsultationUi(language, 'externalConsultantAccess')}</h1>
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
            {translateConsultationUi(language, tab.labelKey)}
          </button>
        ))}
      </nav>

      {error ? <p className="consultation-page__error">{error}</p> : null}

      {loading ? (
        <ClinicalLoading variant="compact" />
      ) : filtered.length === 0 ? (
        <p className="clinical-empty-state">{translateConsultationUi(language, 'noRequestsInCategory')}</p>
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
                  {req.specialty} · {translateConsultationStatus(language, req.status)}
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

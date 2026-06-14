import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { collectClinicalPayload } from '../../utils/workspaceVault'
import { listConsultationsForCase } from '../../services/consultationApi'
import type { ConsultationRequest, ConsultationRequestStatus } from '../../types/consultation'
import { CONSULTATION_STATUS_LABELS } from '../../types/consultation'
import { ClinicalFullPageLayout } from '../AppLogoHeader'
import { ConsultationRequestBuilder } from './ConsultationRequestBuilder'
import { ConsultationReportReview } from './ConsultationReportReview'
import { printConsultationById } from '../../utils/consultation/printConsultation'

type KonsilMode = 'list' | 'create' | 'review'

interface ConsultationCasePageProps {
  caseId: string
  requestId?: string
  onNavigate: (path: string) => void
  onNavigateHome?: () => void
}

function statusBadgeClass(status: ConsultationRequestStatus): string {
  return `consultation-badge consultation-badge--${status}`
}

export function ConsultationCasePage({
  caseId,
  requestId,
  onNavigate,
  onNavigateHome,
}: ConsultationCasePageProps) {
  const handleNavigateHome = onNavigateHome ?? (() => onNavigate('/dashboard'))
  const payload = useMemo(() => collectClinicalPayload(undefined, caseId), [caseId])
  const caseMeta = getCaseMeta(caseId)
  const [mode, setMode] = useState<KonsilMode>(requestId ? 'review' : 'list')
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRequestId, setActiveRequestId] = useState(requestId ?? '')
  const [printingId, setPrintingId] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listConsultationsForCase(caseId)
      setRequests(items)
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
    if (requestId) {
      setActiveRequestId(requestId)
      setMode('review')
    }
  }, [requestId])

  const openRequest = useCallback(
    (id: string) => {
      setActiveRequestId(id)
      setMode('review')
      onNavigate(`/case/${encodeURIComponent(caseId)}/konsil/${encodeURIComponent(id)}`)
    },
    [caseId, onNavigate],
  )

  const handlePrint = useCallback(async (requestId: string) => {
    setPrintingId(requestId)
    try {
      await printConsultationById(requestId)
    } catch {
      // ignore
    } finally {
      setPrintingId(null)
    }
  }, [])

  const printableRequests = useMemo(
    () =>
      [...requests]
        .filter((req) => req.status !== 'draft' && req.status !== 'cancelled')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [requests],
  )

  if (mode === 'create' && payload) {
    return (
      <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
        <ConsultationRequestBuilder
          caseId={caseId}
          payload={payload}
          patientName={
            caseMeta?.localName ||
            [caseMeta?.localVorname, caseMeta?.localNachname].filter(Boolean).join(' ')
          }
          onBack={() => setMode('list')}
          onCreated={(id) => openRequest(id)}
        />
      </ClinicalFullPageLayout>
    )
  }

  if (mode === 'review' && activeRequestId) {
    return (
      <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
        <div className="consultation-page">
          <ConsultationReportReview
            requestId={activeRequestId}
            onBack={() => {
              setMode('list')
              onNavigate(`/case/${encodeURIComponent(caseId)}/konsil`)
            }}
          />
        </div>
      </ClinicalFullPageLayout>
    )
  }

  return (
    <ClinicalFullPageLayout onNavigateHome={handleNavigateHome}>
    <div className="consultation-page">
      <header className="consultation-page__header">
        <div>
          <button
            type="button"
            className="consultation-page__back clinical-back-link"
            onClick={() => onNavigate(`/case/${encodeURIComponent(caseId)}?view=overview`)}
          >
            ← Fallübersicht
          </button>
          <h1 className="consultation-page__title">Konsile</h1>
          <p className="consultation-page__subtitle">Externe Konsiliarberichte — formal, strukturiert</p>
        </div>
        <div className="consultation-page__header-actions">
          <button
            type="button"
            className="consultation-builder__secondary"
            disabled={printableRequests.length === 0 || printingId != null}
            onClick={() => {
              const latest = printableRequests[0]
              if (latest) void handlePrint(latest.id)
            }}
            title="Konsilanfrage drucken"
          >
            Drucken
          </button>
          <button
            type="button"
            className="consultation-page__create-btn"
            onClick={() => setMode('create')}
            disabled={!payload}
          >
            Konsil anfordern
          </button>
        </div>
      </header>

      {error ? <p className="consultation-page__error">{error}</p> : null}

      {loading ? (
        <ClinicalLoading variant="compact" />
      ) : requests.length === 0 ? (
        <p className="clinical-empty-state">Noch keine Konsilanfragen für diesen Fall.</p>
      ) : (
        <ul className="consultation-page__list">
          {requests.map((req) => (
            <li key={req.id} className="consultation-page__list-row">
              <button
                type="button"
                className="consultation-page__list-item"
                onClick={() => openRequest(req.id)}
              >
                <span className="consultation-page__list-title">{req.title}</span>
                <span className="consultation-page__list-meta">
                  {req.specialty} ·{' '}
                  <span className={statusBadgeClass(req.status)}>
                    {CONSULTATION_STATUS_LABELS[req.status]}
                  </span>
                </span>
              </button>
              {req.status !== 'draft' && req.status !== 'cancelled' ? (
                <button
                  type="button"
                  className="consultation-page__list-print"
                  disabled={printingId === req.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    void handlePrint(req.id)
                  }}
                  title="Konsilanfrage drucken"
                  aria-label="Konsilanfrage drucken"
                >
                  <Printer size={14} aria-hidden />
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

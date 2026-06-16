import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { ConsultationRequest, ConsultationRequestStatus } from '../../types/consultation'
import { CONSULTATION_STATUS_LABELS } from '../../types/consultation'
import { listConsultationsForCase } from '../../services/consultationApi'
import { printConsultationById } from '../../utils/consultation/printConsultation'

interface ConsultationCaseSectionProps {
  caseId: string
  onOpenRequest: (requestId: string) => void
  onRequestConsultation: () => void
}

const OVERVIEW_STATUSES: ConsultationRequestStatus[] = [
  'sent',
  'viewed',
  'in_progress',
  'more_info_requested',
  'submitted',
  'archived',
]

const STATUS_PRIORITY: Partial<Record<ConsultationRequestStatus, number>> = {
  submitted: 0,
  more_info_requested: 1,
  in_progress: 2,
  viewed: 3,
  sent: 4,
  archived: 5,
}

function statusBadgeClass(status: ConsultationRequestStatus): string {
  return `consultation-badge consultation-badge--${status}`
}

function sortOverviewRequests(requests: ConsultationRequest[]): ConsultationRequest[] {
  return [...requests].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 99
    const priorityB = STATUS_PRIORITY[b.status] ?? 99
    if (priorityA !== priorityB) return priorityA - priorityB
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function ConsultationCaseSection({
  caseId,
  onOpenRequest,
  onRequestConsultation,
}: ConsultationCaseSectionProps) {
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listConsultationsForCase(caseId)
      setRequests(
        items.filter((r) => OVERVIEW_STATUSES.includes(r.status)),
      )
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sortedRequests = useMemo(() => sortOverviewRequests(requests), [requests])

  const handlePrint = useCallback(async (requestId: string) => {
    setPrintingId(requestId)
    try {
      await printConsultationById(requestId)
    } catch {
      // Print dialog may still open; ignore fetch errors silently.
    } finally {
      setPrintingId(null)
    }
  }, [])

  const handlePrintLatest = useCallback(() => {
    const latest = sortedRequests[0]
    if (latest) void handlePrint(latest.id)
  }, [sortedRequests, handlePrint])

  return (
    <section className="overview-konsile" aria-label="Konsile">
      <div className="overview-konsile__header">
        <h3 className="overview-konsile__title">Konsile</h3>
        <div className="overview-konsile__actions">
          <button
            type="button"
            className="overview-konsile__action"
            onClick={onRequestConsultation}
          >
            Konsil anfordern
          </button>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--bordered"
            disabled={sortedRequests.length === 0 || printingId != null}
            onClick={() => void handlePrintLatest()}
            title="Konsilanfrage drucken"
            aria-label="Konsilanfrage drucken"
          >
            <Printer size={14} aria-hidden />
          </button>
        </div>
      </div>

      {loading ? (
        <ClinicalLoading variant="inline" />
      ) : sortedRequests.length === 0 ? (
        <p className="overview-konsile__empty">Noch keine Konsilanfragen</p>
      ) : (
        <ul className="overview-konsile__list">
          {sortedRequests.map((req) => (
            <li key={req.id} className="overview-konsile__row">
              <button
                type="button"
                className="overview-konsile__card"
                onClick={() => onOpenRequest(req.id)}
              >
                <div className="overview-konsile__card-head">
                  <span className="overview-konsile__specialty">{req.specialty}</span>
                  <span className={statusBadgeClass(req.status)}>
                    {CONSULTATION_STATUS_LABELS[req.status]}
                  </span>
                </div>
                <span className="overview-konsile__name">{req.title}</span>
                {req.status === 'submitted' ? (
                  <span className="overview-konsile__hint">Konsilbericht zur Prüfung öffnen</span>
                ) : null}
              </button>
              <button
                type="button"
                className="overview-konsile__print"
                disabled={printingId === req.id}
                onClick={(event) => {
                  event.stopPropagation()
                  void handlePrint(req.id)
                }}
                title="Konsilanfrage drucken"
                aria-label="Konsilanfrage drucken"
              >
                <Printer size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

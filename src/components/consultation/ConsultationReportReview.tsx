import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, Printer } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { ConsultationSession } from '../../types/consultation'
import {
  archiveConsultation,
  loadConsultationSession,
  markConsultationReviewed,
  respondConsultationInfo,
  revokeConsultationAccess,
} from '../../services/consultationApi'
import { printConsultationSession } from '../../utils/consultation/printConsultation'

interface ConsultationReportReviewProps {
  requestId: string
  onBack: () => void
}

export function ConsultationReportReview({ requestId, onBack }: ConsultationReportReviewProps) {
  const [session, setSession] = useState<ConsultationSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadConsultationSession(requestId)
      setSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const report = session?.report

  const handleCopy = useCallback(async () => {
    if (!report) return
    const text = [
      'Konsilbericht',
      '',
      `Befunde: ${report.findings}`,
      `Beurteilung: ${report.assessment}`,
      `Empfehlungen: ${report.recommendations}`,
      `Limitationen: ${report.limitations}`,
      `Follow-up: ${report.followUp}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [report])

  const handlePrint = useCallback(() => {
    if (!session) return
    printConsultationSession(session)
  }, [session])

  const handleMarkReviewed = useCallback(async () => {
    setActionLoading(true)
    try {
      await markConsultationReviewed(requestId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen')
    } finally {
      setActionLoading(false)
    }
  }, [requestId, refresh])

  const handleArchive = useCallback(async () => {
    setActionLoading(true)
    try {
      await archiveConsultation(requestId)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archivieren fehlgeschlagen')
    } finally {
      setActionLoading(false)
    }
  }, [requestId, onBack])

  const handleRevoke = useCallback(async () => {
    setActionLoading(true)
    try {
      await revokeConsultationAccess(requestId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Widerruf fehlgeschlagen')
    } finally {
      setActionLoading(false)
    }
  }, [requestId, refresh])

  const handleRespond = useCallback(async () => {
    if (!responseText.trim()) return
    setActionLoading(true)
    try {
      await respondConsultationInfo(requestId, responseText.trim())
      setResponseText('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Antwort fehlgeschlagen')
    } finally {
      setActionLoading(false)
    }
  }, [requestId, responseText, refresh])

  if (loading) return <ClinicalLoading variant="compact" />
  if (error) return <p className="consultation-page__error">{error}</p>
  if (!session) return null

  return (
    <div className="consultation-review">
      <button type="button" className="consultation-page__back clinical-back-link" onClick={onBack}>
        ← Zurück
      </button>

      <h1 className="consultation-page__title" style={{ marginTop: '0.75rem' }}>
        Konsilbericht — {session.request.title}
      </h1>
      <p className="consultation-page__subtitle">
        {session.request.specialty} · {session.request.clinicalQuestion}
      </p>

      {session.request.status === 'more_info_requested' ? (
        <div className="consultation-builder__warning" style={{ margin: '1rem 0' }}>
          Weitere Informationen angefordert
          {session.messages
            .filter((m) => m.messageType === 'request_more_information')
            .slice(-1)
            .map((m) => (
              <p key={m.id} style={{ margin: '0.5rem 0 0' }}>
                {m.body}
              </p>
            ))}
          <textarea
            className="consultation-builder__textarea"
            style={{ marginTop: '0.75rem' }}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Antwort an Konsiliar…"
          />
          <button
            type="button"
            className="consultation-workspace__btn consultation-workspace__btn--primary"
            style={{ marginTop: '0.5rem' }}
            disabled={actionLoading}
            onClick={() => void handleRespond()}
          >
            Antwort senden
          </button>
        </div>
      ) : null}

      {report?.status === 'submitted' ? (
        <>
          <div className="consultation-review__report-block">
            <h3>Befunde</h3>
            <p>{report.findings || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>Beurteilung</h3>
            <p>{report.assessment || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>Empfehlungen</h3>
            <p>{report.recommendations || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>Limitationen</h3>
            <p>{report.limitations || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>Follow-up</h3>
            <p>{report.followUp || '—'}</p>
          </div>

          <div className="consultation-review__actions">
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              onClick={handlePrint}
              title="Drucken"
              aria-label="Drucken"
            >
              <Printer strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`icon-action-btn icon-action-btn--bordered${copied ? ' icon-action-btn--success' : ''}`}
              onClick={() => void handleCopy()}
              title={copied ? 'Kopiert' : 'Kopieren'}
              aria-label={copied ? 'Kopiert' : 'Kopieren'}
            >
              {copied ? <Check strokeWidth={1.75} aria-hidden /> : <Clipboard strokeWidth={1.75} aria-hidden />}
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleCopy()}
              title="Manuell in Fallakte übernehmen"
            >
              In Fallakte übernehmen
            </button>
            <button
              type="button"
              className="consultation-workspace__btn consultation-workspace__btn--primary"
              disabled={actionLoading || Boolean(session.request.reviewedAt)}
              onClick={() => void handleMarkReviewed()}
            >
              Als geprüft markieren
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleArchive()}
            >
              Archivieren
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleRevoke()}
            >
              Zugriff widerrufen
            </button>
          </div>
        </>
      ) : (
        <p className="clinical-empty-state">Noch kein eingereichter Konsilbericht.</p>
      )}
    </div>
  )
}
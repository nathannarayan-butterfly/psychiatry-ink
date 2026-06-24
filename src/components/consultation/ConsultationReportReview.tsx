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
import { useTranslation } from '../../context/TranslationContext'
import { translateConsultationUi } from '../../data/consultationUiTranslations'

interface ConsultationReportReviewProps {
  requestId: string
  onBack: () => void
}

export function ConsultationReportReview({ requestId, onBack }: ConsultationReportReviewProps) {
  const { language } = useTranslation()
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
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [requestId, language])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const report = session?.report

  const handleCopy = useCallback(async () => {
    if (!report) return
    const text = [
      translateConsultationUi(language, 'consultationReport'),
      '',
      `${translateConsultationUi(language, 'findings')}: ${report.findings}`,
      `${translateConsultationUi(language, 'assessment')}: ${report.assessment}`,
      `${translateConsultationUi(language, 'recommendations')}: ${report.recommendations}`,
      `${translateConsultationUi(language, 'limitations')}: ${report.limitations}`,
      `${translateConsultationUi(language, 'followUp')}: ${report.followUp}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [report, language])

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
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errActionFailed'))
    } finally {
      setActionLoading(false)
    }
  }, [requestId, refresh, language])

  const handleArchive = useCallback(async () => {
    setActionLoading(true)
    try {
      await archiveConsultation(requestId)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errArchiveFailed'))
    } finally {
      setActionLoading(false)
    }
  }, [requestId, onBack, language])

  const handleRevoke = useCallback(async () => {
    setActionLoading(true)
    try {
      await revokeConsultationAccess(requestId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errRevokeFailed'))
    } finally {
      setActionLoading(false)
    }
  }, [requestId, refresh, language])

  const handleRespond = useCallback(async () => {
    if (!responseText.trim()) return
    setActionLoading(true)
    try {
      await respondConsultationInfo(requestId, responseText.trim())
      setResponseText('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errResponseFailed'))
    } finally {
      setActionLoading(false)
    }
  }, [requestId, responseText, refresh, language])

  if (loading) return <ClinicalLoading variant="compact" />
  if (error) return <p className="consultation-page__error">{error}</p>
  if (!session) return null

  return (
    <div className="consultation-review">
      <button type="button" className="consultation-page__back clinical-back-link" onClick={onBack}>
        {translateConsultationUi(language, 'back')}
      </button>

      <h1 className="consultation-page__title" style={{ marginTop: '0.75rem' }}>
        {translateConsultationUi(language, 'consultationReport')} — {session.request.title}
      </h1>
      <p className="consultation-page__subtitle">
        {session.request.specialty} · {session.request.clinicalQuestion}
      </p>

      {session.request.status === 'more_info_requested' ? (
        <div className="consultation-builder__warning" style={{ margin: '1rem 0' }}>
          {translateConsultationUi(language, 'moreInfoRequested')}
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
            placeholder={translateConsultationUi(language, 'responseToConsultantPlaceholder')}
          />
          <button
            type="button"
            className="consultation-workspace__btn consultation-workspace__btn--primary"
            style={{ marginTop: '0.5rem' }}
            disabled={actionLoading}
            onClick={() => void handleRespond()}
          >
            {translateConsultationUi(language, 'sendResponse')}
          </button>
        </div>
      ) : null}

      {report?.status === 'submitted' ? (
        <>
          <div className="consultation-review__report-block">
            <h3>{translateConsultationUi(language, 'findings')}</h3>
            <p>{report.findings || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>{translateConsultationUi(language, 'assessment')}</h3>
            <p>{report.assessment || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>{translateConsultationUi(language, 'recommendations')}</h3>
            <p>{report.recommendations || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>{translateConsultationUi(language, 'limitations')}</h3>
            <p>{report.limitations || '—'}</p>
          </div>
          <div className="consultation-review__report-block">
            <h3>{translateConsultationUi(language, 'followUp')}</h3>
            <p>{report.followUp || '—'}</p>
          </div>

          <div className="consultation-review__actions">
            <button
              type="button"
              className="icon-action-btn icon-action-btn--bordered"
              onClick={handlePrint}
              title={translateConsultationUi(language, 'print')}
              aria-label={translateConsultationUi(language, 'print')}
            >
              <Printer strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`icon-action-btn icon-action-btn--bordered${copied ? ' icon-action-btn--success' : ''}`}
              onClick={() => void handleCopy()}
              title={copied ? translateConsultationUi(language, 'copied') : translateConsultationUi(language, 'copy')}
              aria-label={copied ? translateConsultationUi(language, 'copied') : translateConsultationUi(language, 'copy')}
            >
              {copied ? <Check strokeWidth={1.75} aria-hidden /> : <Clipboard strokeWidth={1.75} aria-hidden />}
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleCopy()}
              title={translateConsultationUi(language, 'adoptToCaseFileTitle')}
            >
              {translateConsultationUi(language, 'adoptToCaseFile')}
            </button>
            <button
              type="button"
              className="consultation-workspace__btn consultation-workspace__btn--primary"
              disabled={actionLoading || Boolean(session.request.reviewedAt)}
              onClick={() => void handleMarkReviewed()}
            >
              {translateConsultationUi(language, 'markReviewed')}
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleArchive()}
            >
              {translateConsultationUi(language, 'archive')}
            </button>
            <button
              type="button"
              className="consultation-workspace__btn"
              disabled={actionLoading}
              onClick={() => void handleRevoke()}
            >
              {translateConsultationUi(language, 'revokeAccess')}
            </button>
          </div>
        </>
      ) : (
        <p className="clinical-empty-state">{translateConsultationUi(language, 'noSubmittedReport')}</p>
      )}
    </div>
  )
}
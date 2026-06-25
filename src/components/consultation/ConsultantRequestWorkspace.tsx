import { useCallback, useEffect, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type { PatientExamined, SaveReportInput } from '../../types/consultation'
import {
  loadConsultationSession,
  requestConsultationMoreInfo,
  saveConsultationReportDraft,
  submitConsultationReport,
} from '../../services/consultationApi'
import { useTranslation } from '../../context/TranslationContext'
import {
  translateConsultationStatus,
  translateConsultationUi,
} from '../../data/consultationUiTranslations'
import {
  decryptJson,
  isEncryptedEnvelope,
  konsilKeyStorageId,
  resolveKey,
} from '../../utils/e2ee'

/**
 * Decrypt a shared item's stored content. Items are uploaded as a JSON-stringified
 * E2EE envelope; purged or legacy items may be plaintext/empty, which we pass
 * through unchanged.
 */
async function decryptSharedItemContent(
  raw: string,
  key: CryptoKey | null,
  onKeyMissing: () => void,
): Promise<string> {
  if (!raw) return ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }
  if (!isEncryptedEnvelope(parsed)) return raw
  if (!key) {
    onKeyMissing()
    return ''
  }
  try {
    return await decryptJson<string>(key, parsed)
  } catch {
    onKeyMissing()
    return ''
  }
}

interface ConsultantRequestWorkspaceProps {
  requestId: string
  onBack: () => void
}

const EMPTY_REPORT: SaveReportInput = {
  patientExamined: 'not_applicable',
  findings: '',
  assessment: '',
  recommendations: '',
  limitations: '',
  followUp: '',
}

export function ConsultantRequestWorkspace({ requestId, onBack }: ConsultantRequestWorkspaceProps) {
  const { language } = useTranslation()
  const [session, setSession] = useState<Awaited<ReturnType<typeof loadConsultationSession>> | null>(null)
  const [report, setReport] = useState<SaveReportInput>(EMPTY_REPORT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moreInfoText, setMoreInfoText] = useState('')
  const [itemContents, setItemContents] = useState<Record<string, string>>({})
  const [keyMissing, setKeyMissing] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadConsultationSession(requestId)
      setSession(data)
      if (data.report) {
        setReport({
          patientExamined: data.report.patientExamined,
          findings: data.report.findings,
          assessment: data.report.assessment,
          recommendations: data.report.recommendations,
          limitations: data.report.limitations,
          followUp: data.report.followUp,
        })
      }

      // E2EE: decrypt shared material locally using the key from the invite
      // link (resolved from the URL fragment or persisted locally).
      const key = await resolveKey(konsilKeyStorageId(requestId))
      let missing = false
      const contents: Record<string, string> = {}
      for (const item of data.sharedItems) {
        contents[item.id] = await decryptSharedItemContent(item.content, key, () => {
          missing = true
        })
      }
      setItemContents(contents)
      setKeyMissing(missing)
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [requestId, language])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await saveConsultationReportDraft(requestId, report)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errSaveFailed'))
    } finally {
      setSaving(false)
    }
  }, [requestId, report, refresh, language])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await submitConsultationReport(requestId, report)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errSubmitFailed'))
    } finally {
      setSaving(false)
    }
  }, [requestId, report, refresh, language])

  const handleMoreInfo = useCallback(async () => {
    if (!moreInfoText.trim()) return
    setSaving(true)
    try {
      await requestConsultationMoreInfo(requestId, moreInfoText.trim())
      setMoreInfoText('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : translateConsultationUi(language, 'errMoreInfoFailed'))
    } finally {
      setSaving(false)
    }
  }, [requestId, moreInfoText, refresh, language])

  if (loading) return <ClinicalLoading variant="compact" />
  if (!session) return <p className="consultation-page__error">{error ?? translateConsultationUi(language, 'notFound')}</p>

  const submitted = session.report?.status === 'submitted'

  return (
    <div className="consultation-workspace">
      <header className="consultation-workspace__header">
        <div>
          <button type="button" className="consultation-page__back clinical-back-link" onClick={onBack}>
            {translateConsultationUi(language, 'backToRequests')}
          </button>
          <h1 className="consultation-workspace__title">{session.request.title}</h1>
          <p className="consultation-page__subtitle">
            {session.request.specialty} ·{' '}
            <span className={`consultation-badge consultation-badge--${session.request.status}`}>
              {translateConsultationStatus(language, session.request.status)}
            </span>
          </p>
        </div>
      </header>

      {error ? <p className="consultation-page__error">{error}</p> : null}

      <div className="consultation-workspace__columns">
        <div className="consultation-workspace__material">
          <h2 className="consultation-workspace__panel-title">{translateConsultationUi(language, 'sharedMaterial')}</h2>
          <div className="consultation-workspace__question">
            <strong>{translateConsultationUi(language, 'clinicalQuestion')}:</strong> {session.request.clinicalQuestion}
          </div>
          {session.request.kurzanamnese ? (
            <div className="consultation-workspace__question">
              <strong>{translateConsultationUi(language, 'shortHistory')}:</strong> {session.request.kurzanamnese}
            </div>
          ) : null}
          {keyMissing ? (
            <p className="consultation-builder__warning">
              {translateConsultationUi(language, 'decryptFailedWarning')}
            </p>
          ) : null}
          {session.sharedItems.length === 0 ? (
            <p className="clinical-empty-state">{translateConsultationUi(language, 'noSharedMaterial')}</p>
          ) : (
            session.sharedItems.map((item) => (
              <article key={item.id} className="consultation-workspace__item">
                <h3 className="consultation-workspace__item-title">{item.label}</h3>
                <p className="consultation-workspace__item-content">
                  {itemContents[item.id] ?? ''}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="consultation-workspace__report">
          <h2 className="consultation-workspace__panel-title">{translateConsultationUi(language, 'writeReport')}</h2>
          {submitted ? (
            <p className="clinical-empty-state">{translateConsultationUi(language, 'reportSubmittedNotice')}</p>
          ) : (
            <>
              <div className="consultation-builder__field">
                <label className="consultation-builder__label">{translateConsultationUi(language, 'patientExamined')}</label>
                <select
                  className="consultation-builder__select"
                  value={report.patientExamined}
                  onChange={(e) =>
                    setReport((r) => ({ ...r, patientExamined: e.target.value as PatientExamined }))
                  }
                >
                  <option value="not_applicable">{translateConsultationUi(language, 'notApplicable')}</option>
                  <option value="yes">{translateConsultationUi(language, 'yes')}</option>
                  <option value="no">{translateConsultationUi(language, 'no')}</option>
                </select>
              </div>
              {(
                [
                  ['findings', 'findings'],
                  ['assessment', 'assessment'],
                  ['recommendations', 'recommendations'],
                  ['limitations', 'limitations'],
                  ['followUp', 'followUp'],
                ] as const
              ).map(([key, labelKey]) => (
                <div key={key} className="consultation-builder__field">
                  <label className="consultation-builder__label">{translateConsultationUi(language, labelKey)}</label>
                  <textarea
                    className="consultation-builder__textarea"
                    value={report[key]}
                    onChange={(e) => setReport((r) => ({ ...r, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {!submitted ? (
        <div className="consultation-workspace__toolbar">
          <button
            type="button"
            className="consultation-workspace__btn"
            disabled={saving}
            onClick={() => void handleSaveDraft()}
          >
            {translateConsultationUi(language, 'saveDraft')}
          </button>
          <button
            type="button"
            className="consultation-workspace__btn consultation-workspace__btn--primary"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {translateConsultationUi(language, 'submitReport')}
          </button>
          <input
            className="consultation-builder__input"
            style={{ flex: 1, minWidth: '12rem' }}
            placeholder={translateConsultationUi(language, 'queryToClinicianPlaceholder')}
            value={moreInfoText}
            onChange={(e) => setMoreInfoText(e.target.value)}
          />
          <button
            type="button"
            className="consultation-workspace__btn"
            disabled={saving || !moreInfoText.trim()}
            onClick={() => void handleMoreInfo()}
          >
            {translateConsultationUi(language, 'raiseQuery')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
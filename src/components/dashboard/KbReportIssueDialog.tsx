import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import { submitKbContribution } from '../../services/kbContributionsApi'
import { kbT } from '../medication/kb/kbStrings'
import { showNotionToast } from '../notion/NotionToast'

interface KbReportIssueDialogProps {
  substanceId: string | null
  drugName: string
  language: string
  sectionKey?: string
  sectionLabel?: string
  onClose: () => void
}

/**
 * Minimal "report an issue" flow available to ANY authenticated user. Submits a
 * `report_issue` community contribution (no content license required) which a
 * Knowledge Base admin reviews in the KB console.
 */
export function KbReportIssueDialog({
  substanceId,
  drugName,
  language,
  sectionKey,
  sectionLabel,
  onClose,
}: KbReportIssueDialogProps) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim()
    if (!trimmed) {
      setDescriptionError(kbT(language, 'reportIssueDescriptionRequired'))
      return
    }
    if (submitting) return

    setError(null)
    setSubmitting(true)
    try {
      await submitKbContribution({
        substanceId,
        contributionType: 'report_issue',
        payload: {
          description: trimmed,
          drugName,
          ...(sectionKey ? { sectionKey } : {}),
          ...(sectionLabel ? { sectionLabel } : {}),
        },
      })
      showNotionToast(kbT(language, 'reportIssueSuccess'))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : kbT(language, 'reportIssueError'))
    } finally {
      setSubmitting(false)
    }
  }, [description, submitting, substanceId, drugName, sectionKey, sectionLabel, language, onClose])

  return createPortal(
    <div className="kbp-overlay" role="dialog" aria-modal aria-labelledby="kb-report-issue-title">
      <div className="kbp-dialog kbp-dialog--contribution">
        <div className="kbp-dialog__header">
          <div>
            <h2 id="kb-report-issue-title" className="kbp-dialog__title">
              {kbT(language, 'reportIssueDialogTitle')}
            </h2>
            <p className="kbp-contribution-dialog__subtitle">
              {kbT(language, 'reportIssueDialogSubtitle')}
            </p>
          </div>
          <button
            type="button"
            className="kbp-icon-btn"
            onClick={onClose}
            aria-label={t('kbPharmaCancel')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <form
          className="kbp-dialog__form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <label className="kbp-field">
            <span className="kbp-field__label">{kbT(language, 'reportIssueDescriptionLabel')}</span>
            <textarea
              className="kbp-section__textarea"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (descriptionError && e.target.value.trim()) setDescriptionError(null)
              }}
              placeholder={kbT(language, 'reportIssuePlaceholder')}
              rows={6}
              required
              autoFocus
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={descriptionError ? 'kb-report-issue-error' : undefined}
            />
            {descriptionError ? (
              <span id="kb-report-issue-error" className="kbp-field__error" role="alert">
                {descriptionError}
              </span>
            ) : null}
          </label>

          {error ? <p className="kbp-ai-error" role="alert">{error}</p> : null}

          <div className="kbp-dialog__actions">
            <button
              type="submit"
              className="kbp-btn kbp-btn--primary"
              disabled={submitting || description.trim().length === 0}
            >
              {submitting
                ? kbT(language, 'reportIssueSubmitting')
                : kbT(language, 'reportIssueSubmit')}
            </button>
            <button type="button" className="kbp-btn" onClick={onClose} disabled={submitting}>
              {t('kbPharmaCancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

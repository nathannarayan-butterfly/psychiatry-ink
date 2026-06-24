import { memo, useMemo, useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { VerlaufFeedEntry } from '../../../utils/verlaufFeed'
import {
  buildSomaticBefundSummaryRows,
  isSomaticBefundEntry,
} from '../../../utils/verlauf/somaticBefund'
import { formatIsoTimestampDate, formatIsoTimestampTime } from '../../../utils/siteTimezone'

interface SomaticBefundEntryCardProps {
  entry: VerlaufFeedEntry
  onDelete: (id: string) => void
  onOpenFullBefund?: () => void
}

export const SomaticBefundEntryCard = memo(function SomaticBefundEntryCard({
  entry,
  onDelete,
  onOpenFullBefund,
}: SomaticBefundEntryCardProps) {
  const { t, language } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const payload = entry.somaticBefund
  const summaryRows = useMemo(
    () => (payload ? buildSomaticBefundSummaryRows(payload, language) : []),
    [language, payload],
  )

  if (!isSomaticBefundEntry(entry) || !payload) {
    return null
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(entry.content)
  }

  function handleDeleteRequest(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  function handleDeleteConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(entry.id)
  }

  function handleDeleteCancel(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <article className="verlauf-entry verlauf-entry--somatic-befund">
      <header className="verlauf-entry__header">
        <time className="verlauf-entry__date" dateTime={entry.date}>
          {formatIsoTimestampDate(entry.date)}
        </time>
        <span className="verlauf-entry__time">{formatIsoTimestampTime(entry.date)}</span>
        <span className="verlauf-entry__somatic-badge">
          <Stethoscope className="verlauf-entry__somatic-icon" strokeWidth={1.75} aria-hidden />
          {t('verlaufSomaticBefundEyebrow')}
        </span>
        <span className="verlauf-entry__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="verlauf-entry__action-btn"
            title={t('verlaufEntryCopy')}
            onClick={handleCopy}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button
            type="button"
            className="verlauf-entry__action-btn verlauf-entry__action-btn--delete"
            title={t('verlaufEntryDelete')}
            onClick={handleDeleteRequest}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </span>
      </header>

      {confirmDelete ? (
        <div className="verlauf-entry__confirm-delete" onClick={(e) => e.stopPropagation()}>
          <span className="verlauf-entry__confirm-text">{t('verlaufDeleteConfirm')}</span>
          <button
            type="button"
            className="verlauf-entry__confirm-yes"
            onClick={handleDeleteConfirm}
          >
            {t('verlaufDeleteYes')}
          </button>
          <button
            type="button"
            className="verlauf-entry__confirm-no"
            onClick={handleDeleteCancel}
          >
            {t('verlaufEntryCancel')}
          </button>
        </div>
      ) : null}

      <div className="verlauf-somatic-summary">
        {summaryRows.map((row) => (
          <div key={row.labelKey} className="verlauf-somatic-summary__row">
            <span className="verlauf-somatic-summary__label">{t(row.labelKey)}</span>
            <span className="verlauf-somatic-summary__value">{row.value}</span>
          </div>
        ))}
      </div>

      {onOpenFullBefund ? (
        <footer className="verlauf-somatic-summary__footer">
          <button type="button" className="verlauf-somatic-summary__link" onClick={onOpenFullBefund}>
            {t('verlaufSomaticBefundFullLink')}
          </button>
        </footer>
      ) : null}
    </article>
  )
})

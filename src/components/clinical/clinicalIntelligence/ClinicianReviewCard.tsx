import { useMemo } from 'react'
import { CiStatusCountRow } from './CiStatusCountRow'
import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEmpty } from '../ClinicalSection'
import { getCiAuditActionLabel } from '../../../data/clinicalIntelligenceTranslations'
import type {
  ClinicalIntelligenceCaseState,
} from '../../../types/clinicalIntelligence'

interface ClinicianReviewCardProps {
  state: ClinicalIntelligenceCaseState
  onSaveAccepted: () => void
}

/**
 * Audit-trail + status counts. Body-only — section chrome (header + collapse)
 * is provided by the parent panel.
 */
export function ClinicianReviewCard({ state, onSaveAccepted }: ClinicianReviewCardProps) {
  const { t, language } = useTranslation()
  const run = state.latestRun

  const counts = useMemo(() => {
    let dimAccepted = 0
    let dimPending = 0
    let dimRejected = 0
    let dimEdited = 0
    let mechAccepted = 0
    let mechPending = 0
    let mechRejected = 0
    let mechEdited = 0
    if (run) {
      for (const d of run.dimensional.activeDimensions) {
        if (d.reviewStatus === 'accepted') dimAccepted += 1
        else if (d.reviewStatus === 'edited') dimEdited += 1
        else if (d.reviewStatus === 'pending') dimPending += 1
        else if (d.reviewStatus === 'rejected') dimRejected += 1
      }
      for (const m of run.mechanism.activeMechanisms) {
        if (m.reviewStatus === 'accepted') mechAccepted += 1
        else if (m.reviewStatus === 'edited') mechEdited += 1
        else if (m.reviewStatus === 'pending') mechPending += 1
        else if (m.reviewStatus === 'rejected') mechRejected += 1
      }
    }
    return {
      dimAccepted,
      dimPending,
      dimRejected,
      dimEdited,
      mechAccepted,
      mechPending,
      mechRejected,
      mechEdited,
    }
  }, [run])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

  const trail = state.audit.slice(0, 12)

  return (
    <div className="ci-review-body">
      <div className="ci-review-counts">
        <div className="ci-review-counts__group">
          <span className="ci-review-counts__label">{t('ciCardDimensional')}</span>
          <CiStatusCountRow
            accepted={counts.dimAccepted + counts.dimEdited}
            pending={counts.dimPending}
            rejected={counts.dimRejected}
          />
        </div>
        <div className="ci-review-counts__group">
          <span className="ci-review-counts__label">{t('ciCardMechanism')}</span>
          <CiStatusCountRow
            accepted={counts.mechAccepted + counts.mechEdited}
            pending={counts.mechPending}
            rejected={counts.mechRejected}
          />
        </div>
      </div>

      <div className="ci-review-export">
        <button type="button" className="ci-btn" onClick={onSaveAccepted}>
          {t('ciActionSaveForReport')}
          <span aria-hidden>→</span>
        </button>
      </div>

      <p className="ci-eyebrow ci-eyebrow--spaced">{t('ciAuditTrailHeading')}</p>
      {trail.length === 0 ? (
        <ClinicalEmpty>{t('ciAuditTrailEmpty')}</ClinicalEmpty>
      ) : (
        <ol className="ci-audit">
          {trail.map((entry) => (
            <li key={entry.id} className="ci-audit__item">
              <time className="ci-audit__ts">
                {dateFormatter.format(new Date(entry.timestamp))}
              </time>
              <span className="ci-audit__type">{getCiAuditActionLabel(entry.action, language)}</span>
              <span className="ci-audit__scope">{entry.targetKind}</span>
              {entry.targetId ? (
                <code className="ci-audit__target">{entry.targetId}</code>
              ) : null}
              {entry.notes ? <span className="ci-audit__note">{entry.notes}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

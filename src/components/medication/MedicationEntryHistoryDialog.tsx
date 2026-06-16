import { useTranslation } from '../../context/TranslationContext'
import {
  getChangeTypeLabel,
  getFormulationLabel,
  getStatusLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import type { MedicationEntry, MedicationStatus } from '../../types/medicationPlan'
import { ChangeTypeIcon } from './MedicationToolbar'

/** Maps medication status onto the shared therapy status-pill palette. */
const MED_STATUS_TONE: Record<MedicationStatus, string> = {
  active: 'green',
  reduced: 'blue',
  increased: 'violet',
  paused: 'amber',
  discontinued: 'gray',
}

interface MedicationEntryHistoryDialogProps {
  entry: MedicationEntry | null
  open: boolean
  onClose: () => void
}

/**
 * Per-medication "Verlauf": a chronological log of every recorded change for a
 * single drug (start, titration, pause, discontinuation …) with the dose,
 * status and clinical reason captured at each point. Read-only.
 */
export function MedicationEntryHistoryDialog({
  entry,
  open,
  onClose,
}: MedicationEntryHistoryDialogProps) {
  const { language } = useTranslation()
  if (!open || !entry) return null

  const locale = language === 'de' ? 'de-DE' : language
  // Newest first — clinicians read the latest state at the top.
  const events = [...entry.history].sort((a, b) => b.changedAt.localeCompare(a.changedAt))

  return (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="therapy-modal medication-entry-history"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 className="therapy-modal__title">
              {entry.substance}
              {entry.displayBrandName ? (
                <span className="medication-entry-history__brand"> ({entry.displayBrandName})</span>
              ) : null}
            </h4>
            <p className="medication-entry-history__subtitle">
              {translateMedicationUi(language, 'medEntryHistoryTitle')}
            </p>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onClose}
            aria-label={translateMedicationUi(language, 'medCancel')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body">
          {events.length === 0 ? (
            <p className="medication-entry-history__empty">
              {translateMedicationUi(language, 'medEntryHistoryEmpty')}
            </p>
          ) : (
            <ol className="medication-entry-history__timeline">
              {events.map((event, index) => {
                const isLatest = index === 0
                const snap = event.snapshot
                return (
                  <li
                    key={event.id}
                    className={`medication-entry-history__event${isLatest ? ' medication-entry-history__event--latest' : ''}`}
                  >
                    <span
                      className="medication-entry-history__icon"
                      title={getChangeTypeLabel(event.changeType, language)}
                    >
                      <ChangeTypeIcon changeType={event.changeType} />
                    </span>
                    <div className="medication-entry-history__body">
                      <div className="medication-entry-history__row">
                        <span className="medication-entry-history__type">
                          {getChangeTypeLabel(event.changeType, language)}
                        </span>
                        <time className="medication-entry-history__date" dateTime={event.changedAt}>
                          {new Date(event.changedAt).toLocaleString(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </time>
                        <span
                          className={`therapy-status therapy-status--${MED_STATUS_TONE[snap.status] ?? 'gray'}`}
                        >
                          {getStatusLabel(snap.status, language)}
                        </span>
                      </div>
                      <div className="medication-entry-history__dose">
                        {snap.doseLineGerman || (
                          <>
                            {getFormulationLabel(snap.formulation, language)}
                            {snap.strength ? ` · ${snap.strength}` : ''}
                          </>
                        )}
                      </div>
                      {event.note || snap.reasonForChange ? (
                        <p className="medication-entry-history__note">
                          {event.note || snap.reasonForChange}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

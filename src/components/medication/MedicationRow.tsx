import { ChevronRight, History, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
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

interface MedicationRowProps {
  entry: MedicationEntry
  disabled?: boolean
  selected?: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function MedicationRow({
  entry,
  disabled = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
}: MedicationRowProps) {
  const { language } = useTranslation()
  const [historyOpen, setHistoryOpen] = useState(false)

  const editLabel = translateMedicationUi(language, 'medEdit')
  const historyLabel = translateMedicationUi(language, 'medHistoryToggle')
  const deleteLabel = translateMedicationUi(language, 'medDelete')

  return (
    <div
      className={`medication-row${selected ? ' medication-row--selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="medication-row__main">
        <span className="medication-row__change" title={getChangeTypeLabel(entry.lastChangeType, language)}>
          <ChangeTypeIcon changeType={entry.lastChangeType} />
        </span>
        <div className="medication-row__content">
          <div className="medication-row__title">
            <span className="medication-row__substance">
              {entry.substance}
              {entry.displayBrandName ? (
                <span className="medication-row__brand"> ({entry.displayBrandName})</span>
              ) : null}
            </span>
            <span className="medication-row__form">
              {getFormulationLabel(entry.formulation, language)}
              {entry.strength ? ` · ${entry.strength}` : ''}
            </span>
            <span
              className={`therapy-status therapy-status--${MED_STATUS_TONE[entry.status] ?? 'gray'} medication-row__status`}
            >
              {getStatusLabel(entry.status, language)}
            </span>
          </div>
          <div className="medication-row__dose">{entry.doseLineGerman}</div>
          <div className="medication-row__meta">
            <span>
              {translateMedicationUi(language, 'medStartDate')}: {entry.startDate || '—'}
            </span>
            <span>
              {translateMedicationUi(language, 'medLastChange')}:{' '}
              {entry.lastChangeAt ? new Date(entry.lastChangeAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
        <div className="medication-row__actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="medication-row__action-btn"
            disabled={disabled}
            title={editLabel}
            aria-label={editLabel}
            onClick={onEdit}
          >
            <Pencil size={13} strokeWidth={1.75} aria-hidden />
          </button>
          {entry.history.length > 0 ? (
            <button
              type="button"
              className={`medication-row__action-btn${historyOpen ? ' medication-row__action-btn--active' : ''}`}
              disabled={disabled}
              title={historyLabel}
              aria-label={historyLabel}
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <History size={13} strokeWidth={1.75} aria-hidden />
              <ChevronRight
                size={10}
                aria-hidden
                className={`medication-row__chevron${historyOpen ? ' medication-row__chevron--open' : ''}`}
              />
            </button>
          ) : null}
          <button
            type="button"
            className="medication-row__action-btn medication-row__action-btn--delete"
            disabled={disabled}
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={onDelete}
          >
            <Trash2 size={13} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {historyOpen ? (
        <ul className="medication-row__history">
          {[...entry.history].reverse().map((event) => (
            <li key={event.id}>
              <span className="medication-row__history-date">
                {new Date(event.changedAt).toLocaleDateString()}
              </span>
              <ChangeTypeIcon changeType={event.changeType} />
              <span>{getChangeTypeLabel(event.changeType, language)}</span>
              <span className="medication-row__history-dose">{event.snapshot.doseLineGerman}</span>
              {event.note ? <span className="medication-row__history-note">{event.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

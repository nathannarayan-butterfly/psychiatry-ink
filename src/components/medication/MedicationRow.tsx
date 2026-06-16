import { History, Pencil, Trash2 } from 'lucide-react'
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
  onHistory: () => void
  onEdit: () => void
  onDelete: () => void
}

export function MedicationRow({
  entry,
  disabled = false,
  selected = false,
  onSelect,
  onHistory,
  onEdit,
  onDelete,
}: MedicationRowProps) {
  const { language } = useTranslation()

  const historyLabel = translateMedicationUi(language, 'medEntryHistory')
  const editLabel = translateMedicationUi(language, 'medEdit')
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
            className="icon-action-btn"
            title={historyLabel}
            aria-label={historyLabel}
            onClick={onHistory}
          >
            <History strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn"
            disabled={disabled}
            title={editLabel}
            aria-label={editLabel}
            onClick={onEdit}
          >
            <Pencil strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--danger"
            disabled={disabled}
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={onDelete}
          >
            <Trash2 strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

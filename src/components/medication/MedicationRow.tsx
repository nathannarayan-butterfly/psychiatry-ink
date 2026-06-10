import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  getChangeTypeLabel,
  getFormulationLabel,
  getStatusLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import type { MedicationEntry } from '../../types/medicationPlan'
import { ChangeTypeIcon } from './MedicationToolbar'

interface MedicationRowProps {
  entry: MedicationEntry
  disabled?: boolean
  selected?: boolean
  onSelect: () => void
  onEdit: () => void
  onAddSideEffect: () => void
}

export function MedicationRow({
  entry,
  disabled = false,
  selected = false,
  onSelect,
  onEdit,
  onAddSideEffect,
}: MedicationRowProps) {
  const { language } = useTranslation()
  const [historyOpen, setHistoryOpen] = useState(false)

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
            <span className="medication-row__substance">{entry.substance}</span>
            <span className="medication-row__form">
              {getFormulationLabel(entry.formulation, language)}
              {entry.strength ? ` · ${entry.strength}` : ''}
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
            <span>{getStatusLabel(entry.status, language)}</span>
          </div>
        </div>
        <div className="medication-row__actions">
          {entry.history.length > 0 ? (
            <button
              type="button"
              className="medication-row__history-btn"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                setHistoryOpen((open) => !open)
              }}
            >
              <ChevronRight
                size={14}
                aria-hidden
                className={`medication-row__chevron${historyOpen ? ' medication-row__chevron--open' : ''}`}
              />
              {translateMedicationUi(language, 'medHistoryToggle')}
            </button>
          ) : null}
          <button
            type="button"
            className="medication-row__side-effect-btn"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onAddSideEffect()
            }}
          >
            <Plus size={12} aria-hidden />
            {translateMedicationUi(language, 'medAddSideEffect')}
          </button>
          <button
            type="button"
            className="medication-row__edit-btn"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
          >
            {translateMedicationUi(language, 'medEdit')}
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

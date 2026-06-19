import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { translateMedicationUi, formatMedicationUiTemplate } from '../../data/medicationUiTranslations'
import type { UiLanguage } from '../../types/settings'
import type { TargetedReceptor } from '../../utils/medication/receptorBurden'

interface CuratedTargetReceptorsProps {
  receptors: TargetedReceptor[]
  pickable: TargetedReceptor[]
  suggestions?: TargetedReceptor[]
  onAdd: (target: string) => void
  onRemove: (target: string) => void
  disabled?: boolean
  variant: 'rows' | 'chips'
  language: UiLanguage
}

export function CuratedTargetReceptors({
  receptors,
  pickable,
  suggestions = [],
  onAdd,
  onRemove,
  disabled = false,
  variant,
  language,
}: CuratedTargetReceptorsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const closePicker = useCallback(() => setPickerOpen(false), [])

  useEffect(() => {
    if (!pickerOpen) return
    const onDocClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        closePicker()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [pickerOpen, closePicker])

  const canAdd = !disabled && pickable.length > 0

  const pickerList = pickable.length > 0 ? pickable : suggestions

  const addButton = (
    <div className="medication-zielrezeptor__add-wrap" ref={pickerRef}>
      <button
        type="button"
        className="medication-zielrezeptor__icon-btn medication-zielrezeptor__icon-btn--add"
        disabled={!canAdd}
        aria-label={translateMedicationUi(language, 'medCuratedReceptorAdd')}
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((open) => !open)}
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
      </button>
      {pickerOpen && pickerList.length > 0 ? (
        <div className="medication-zielrezeptor__picker" role="listbox">
          {suggestions.length > 0 && pickable.length > 0 ? (
            <p className="medication-zielrezeptor__picker-hint">
              {translateMedicationUi(language, 'medCuratedReceptorPickerHint')}
            </p>
          ) : null}
          {pickerList.map((item) => (
            <button
              key={item.target}
              type="button"
              role="option"
              className="medication-zielrezeptor__picker-item"
              onClick={() => {
                onAdd(item.target)
                closePicker()
              }}
            >
              <span className="medication-zielrezeptor__picker-label">{item.label}</span>
              {item.maxPercent > 0 ? (
                <span className="medication-zielrezeptor__picker-meta">{item.maxPercent}%</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )

  if (variant === 'chips') {
    return (
      <div className="medication-zielrezeptor medication-zielrezeptor--chips">
        {receptors.length > 0 ? (
          <div className="medication-zielrezeptor__chips">
            {receptors.map((receptor) => (
              <span
                key={receptor.target}
                className={`medication-insight__chip medication-zielrezeptor__chip${
                  receptor.maxPercent >= 75 ? ' medication-insight__chip--strong' : ''
                }`}
                title={
                  receptor.drugs.length > 0
                    ? `${receptor.label} · ${receptor.drugs.join(', ')}`
                    : receptor.label
                }
              >
                {receptor.label}
                {receptor.count > 1 ? <em> ×{receptor.count}</em> : null}
                {!disabled ? (
                  <button
                    type="button"
                    className="medication-zielrezeptor__chip-remove"
                    aria-label={formatMedicationUiTemplate(language, 'medCuratedReceptorRemove', {
                      label: receptor.label,
                    })}
                    onClick={() => onRemove(receptor.target)}
                  >
                    <X size={11} strokeWidth={2.5} aria-hidden />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : (
          <span className="medication-insight__empty">—</span>
        )}
        {addButton}
        {suggestions.length > 0 && receptors.length === 0 ? (
          <p className="medication-zielrezeptor__suggestions-hint">
            {translateMedicationUi(language, 'medCuratedReceptorSuggestions')}:{' '}
            {suggestions
              .slice(0, 4)
              .map((s) => s.label)
              .join(', ')}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="medication-zielrezeptor medication-zielrezeptor--rows">
      <div className="medication-zielrezeptor__rows-head">
        <p className="medication-dash-panel__subhead">
          {translateMedicationUi(language, 'medCuratedReceptorTitle')}
        </p>
        {addButton}
      </div>
      {receptors.length > 0 ? (
        <ul className="medication-receptor-burden medication-zielrezeptor__list">
          {receptors.map((receptor) => (
            <li key={receptor.target} className="medication-receptor-burden__row medication-zielrezeptor__row">
              <span className="medication-receptor-burden__label">{receptor.label}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="medication-zielrezeptor__icon-btn medication-zielrezeptor__icon-btn--remove"
                  aria-label={formatMedicationUiTemplate(language, 'medCuratedReceptorRemove', {
                    label: receptor.label,
                  })}
                  onClick={() => onRemove(receptor.target)}
                >
                  <X size={13} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
              <span className="medication-receptor-burden__bar" aria-hidden="true">
                <span
                  className="medication-receptor-burden__fill"
                  style={{ width: `${receptor.maxPercent}%` }}
                />
              </span>
              <span
                className="medication-receptor-burden__drugs"
                title={receptor.drugs.join(', ')}
              >
                {receptor.drugs.length > 0 ? receptor.drugs.join(', ') : '—'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="medication-zielrezeptor__empty">
          {translateMedicationUi(language, 'medCuratedReceptorEmpty')}
        </p>
      )}
      {suggestions.length > 0 && receptors.length === 0 ? (
        <p className="medication-zielrezeptor__suggestions-hint">
          {translateMedicationUi(language, 'medCuratedReceptorSuggestions')}:{' '}
          {suggestions
            .slice(0, 5)
            .map((s) => s.label)
            .join(', ')}
        </p>
      ) : null}
    </div>
  )
}

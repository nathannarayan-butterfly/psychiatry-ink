import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  DEMO_MEDICATION_SUGGESTIONS,
  getChangeTypeLabel,
  getFormulationLabel,
  getStatusLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import {
  MEDICATION_CHANGE_TYPES,
  MEDICATION_FORMULATIONS,
  MEDICATION_STATUSES,
  type MedicationEntry,
  type MedicationFormulation,
} from '../../types/medicationPlan'
import { formatDoseLineGerman } from '../../utils/medication/doseLine'
import {
  createDefaultMedicationDraft,
  medicationDraftFromEntry,
  type MedicationDraft,
} from '../../utils/medication/planOps'
import {
  getStrengthOptions,
  isCustomStrengthValue,
  STRENGTH_CUSTOM_VALUE,
} from '../../utils/medication/strengthOptions'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'

interface MedicationEditDialogProps {
  open: boolean
  editingEntry: MedicationEntry | null
  disabled?: boolean
  onClose: () => void
  onSave: (draft: MedicationDraft) => void
}

type DoseInputMode = 'fourTimes' | 'single'

function getDoseInputMode(formulation: MedicationFormulation): DoseInputMode {
  if (formulation === 'depot' || formulation === 'injection' || formulation === 'patch') {
    return 'single'
  }
  return 'fourTimes'
}

function showPrnCheckbox(formulation: MedicationFormulation): boolean {
  return formulation !== 'depot' && formulation !== 'patch'
}

function applyFormulationChange(
  current: MedicationDraft,
  formulation: MedicationFormulation,
): MedicationDraft {
  const nextMode = getDoseInputMode(formulation)
  const prevMode = getDoseInputMode(current.formulation)

  return {
    ...current,
    formulation,
    depotInterval: formulation === 'depot' ? current.depotInterval : '',
    prn: showPrnCheckbox(formulation) ? current.prn : false,
    doseSchedule:
      nextMode === 'single'
        ? { ...current.doseSchedule, noon: '', evening: '', night: '' }
        : prevMode === 'single'
          ? { ...current.doseSchedule, noon: '', evening: '', night: '' }
          : current.doseSchedule,
  }
}

export function MedicationEditDialog({
  open,
  editingEntry,
  disabled = false,
  onClose,
  onSave,
}: MedicationEditDialogProps) {
  const { language, t } = useTranslation()
  const [draft, setDraft] = useState<MedicationDraft>(() => createDefaultMedicationDraft())

  useEffect(() => {
    if (!open) return
    setDraft(editingEntry ? medicationDraftFromEntry(editingEntry) : createDefaultMedicationDraft())
  }, [open, editingEntry])

  const dosePreview = useMemo(() => {
    const schedule = {
      ...draft.doseSchedule,
      prn: draft.prn,
      depotInterval: draft.depotInterval.trim() || undefined,
    }
    return formatDoseLineGerman(draft.substance, draft.formulation, draft.strength, schedule)
  }, [draft])

  const suggestions = useMemo(() => {
    const key = draft.substance.trim().toLowerCase()
    if (key.length < 3) return []
    const match = Object.entries(DEMO_MEDICATION_SUGGESTIONS).find(([name]) => key.includes(name))
    return match?.[1] ?? []
  }, [draft.substance])

  const referenceMatches = useMemo(
    () => (draft.substance.trim().length >= 2 ? getDrugsForSubstance(draft.substance) : []),
    [draft.substance],
  )

  const strengthOptions = useMemo(
    () => getStrengthOptions(draft.substance, draft.formulation, language),
    [draft.substance, draft.formulation, language],
  )

  const hasReferenceData = referenceMatches.length > 0

  const showCustomStrength =
    strengthOptions.length === 0 || isCustomStrengthValue(draft.strength, strengthOptions)

  const strengthSelectValue = showCustomStrength ? STRENGTH_CUSTOM_VALUE : draft.strength

  if (!open) return null

  const isDepot = draft.formulation === 'depot'
  const doseInputMode = getDoseInputMode(draft.formulation)
  const showPrn = showPrnCheckbox(draft.formulation)

  const handleSave = () => {
    if (!draft.substance.trim()) return
    onSave({
      ...draft,
      changeType: editingEntry ? draft.changeType : 'start',
    })
    onClose()
  }

  return (
    <div className="therapy-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="therapy-modal medication-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medication-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 id="medication-edit-title" className="therapy-modal__title">
              {editingEntry
                ? translateMedicationUi(language, 'medEdit')
                : translateMedicationUi(language, 'medAdd')}
            </h4>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body medication-edit-dialog__body">
          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medSubstance')}</span>
            <input
              type="text"
              value={draft.substance}
              disabled={disabled}
              className="therapy-input"
              autoFocus
              onChange={(event) => setDraft((current) => ({ ...current, substance: event.target.value }))}
            />
          </label>

          {hasReferenceData ? (
            <p className="medication-edit-dialog__reference-badge">
              {translateMedicationUi(language, 'medReferenceDataAvailable')}
            </p>
          ) : suggestions.length > 0 ? (
            <div className="medication-edit-dialog__suggestions">
              <span className="medication-edit-dialog__suggestions-label">
                {translateMedicationUi(language, 'medDemoSuggestions')}
              </span>
              {suggestions.map((item) => (
                <button
                  key={`${item.formulation}-${item.strength}`}
                  type="button"
                  className="medication-edit-dialog__suggestion"
                  disabled={disabled}
                  onClick={() =>
                    setDraft((current) => {
                      const next = applyFormulationChange(current, item.formulation)
                      return {
                        ...next,
                        strength: item.strength,
                        doseSchedule: { ...next.doseSchedule, unit: item.unit },
                      }
                    })
                  }
                >
                  {getFormulationLabel(item.formulation, language)} {item.strength}
                </button>
              ))}
            </div>
          ) : null}

          <div className="therapy-field-grid">
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medFormulation')}</span>
              <select
                value={draft.formulation}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) =>
                  setDraft((current) =>
                    applyFormulationChange(
                      current,
                      event.target.value as MedicationDraft['formulation'],
                    ),
                  )
                }
              >
                {MEDICATION_FORMULATIONS.map((form) => (
                  <option key={form} value={form}>
                    {getFormulationLabel(form, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medStrength')}</span>
              {strengthOptions.length > 0 ? (
                <select
                  value={strengthSelectValue}
                  disabled={disabled}
                  className="therapy-input"
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '') {
                      setDraft((current) => ({ ...current, strength: '' }))
                      return
                    }
                    if (value === STRENGTH_CUSTOM_VALUE) {
                      setDraft((current) => ({ ...current, strength: current.strength }))
                      return
                    }
                    const option = strengthOptions.find((item) => item.strength === value)
                    setDraft((current) => ({
                      ...current,
                      strength: value,
                      doseSchedule: option?.unit
                        ? { ...current.doseSchedule, unit: option.unit }
                        : current.doseSchedule,
                    }))
                  }}
                >
                  <option value="">{translateMedicationUi(language, 'medStrengthSelect')}</option>
                  {strengthOptions.map((option) => (
                    <option key={option.strength} value={option.strength}>
                      {option.label}
                    </option>
                  ))}
                  <option value={STRENGTH_CUSTOM_VALUE}>
                    {translateMedicationUi(language, 'medStrengthCustom')}
                  </option>
                </select>
              ) : null}
              {showCustomStrength ? (
                <input
                  type="text"
                  value={draft.strength}
                  disabled={disabled}
                  className="therapy-input medication-edit-dialog__strength-custom"
                  placeholder={translateMedicationUi(language, 'medStrengthCustom')}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, strength: event.target.value }))
                  }
                />
              ) : null}
              {strengthOptions.length > 0 && strengthOptions[0]?.source === 'demo' && draft.substance.trim().length >= 2 ? (
                <span className="medication-edit-dialog__demo-hint">
                  {translateMedicationUi(language, 'medStrengthDemoHint')}
                </span>
              ) : null}
            </label>
          </div>

          <p className="medication-edit-dialog__hint">
            {isDepot
              ? translateMedicationUi(language, 'medDepotDoseHint')
              : doseInputMode === 'single'
                ? translateMedicationUi(language, 'medSingleDoseHint')
                : translateMedicationUi(language, 'medDoseExample')}
          </p>

          {doseInputMode === 'single' ? (
            <div className="therapy-field-grid">
              <label className="therapy-field">
                <span>
                  {draft.formulation === 'patch'
                    ? translateMedicationUi(language, 'medDosePerPatch')
                    : translateMedicationUi(language, 'medDosePerInjection')}
                </span>
                <input
                  type="text"
                  value={draft.doseSchedule.morning}
                  disabled={disabled}
                  className="therapy-input"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      doseSchedule: { ...current.doseSchedule, morning: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="therapy-field">
                <span>{translateMedicationUi(language, 'medDoseUnit')}</span>
                <input
                  type="text"
                  value={draft.doseSchedule.unit}
                  disabled={disabled}
                  className="therapy-input"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      doseSchedule: { ...current.doseSchedule, unit: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
          ) : (
            <div className="medication-edit-dialog__dose-grid">
              {(
                [
                  ['morning', 'medDoseMorning'],
                  ['noon', 'medDoseNoon'],
                  ['evening', 'medDoseEvening'],
                  ['night', 'medDoseNight'],
                ] as const
              ).map(([field, labelKey]) => (
                <label key={field} className="therapy-field">
                  <span>{translateMedicationUi(language, labelKey)}</span>
                  <input
                    type="text"
                    value={draft.doseSchedule[field]}
                    disabled={disabled}
                    className="therapy-input"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        doseSchedule: { ...current.doseSchedule, [field]: event.target.value },
                      }))
                    }
                  />
                </label>
              ))}
              <label className="therapy-field">
                <span>{translateMedicationUi(language, 'medDoseUnit')}</span>
                <input
                  type="text"
                  value={draft.doseSchedule.unit}
                  disabled={disabled}
                  className="therapy-input"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      doseSchedule: { ...current.doseSchedule, unit: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
          )}

          {showPrn ? (
            <label className="medication-edit-dialog__checkbox">
              <input
                type="checkbox"
                checked={draft.prn}
                disabled={disabled}
                onChange={(event) => setDraft((current) => ({ ...current, prn: event.target.checked }))}
              />
              <span>{translateMedicationUi(language, 'medPrn')}</span>
            </label>
          ) : null}

          {isDepot ? (
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medDepotInterval')}</span>
              <input
                type="text"
                value={draft.depotInterval}
                disabled={disabled}
                className="therapy-input"
                placeholder={language === 'de' ? 'z. B. alle 2 Wochen' : 'e.g. every 2 weeks'}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, depotInterval: event.target.value }))
                }
              />
            </label>
          ) : null}

          <div className="therapy-field-grid">
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medStartDate')}</span>
              <input
                type="date"
                value={draft.startDate}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medStatus')}</span>
              <select
                value={draft.status}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as MedicationDraft['status'],
                  }))
                }
              >
                {MEDICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status, language)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {editingEntry ? (
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medReasonChange')}</span>
              <select
                value={draft.changeType}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    changeType: event.target.value as MedicationDraft['changeType'],
                  }))
                }
              >
                {MEDICATION_CHANGE_TYPES.filter((type) => type !== 'start').map((type) => (
                  <option key={type} value={type}>
                    {getChangeTypeLabel(type, language)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medIndication')}</span>
            <input
              type="text"
              value={draft.indication}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setDraft((current) => ({ ...current, indication: event.target.value }))}
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medReasonChange')}</span>
            <input
              type="text"
              value={draft.reasonForChange}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) =>
                setDraft((current) => ({ ...current, reasonForChange: event.target.value }))
              }
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medAdherence')}</span>
            <input
              type="text"
              value={draft.adherenceNote}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) =>
                setDraft((current) => ({ ...current, adherenceNote: event.target.value }))
              }
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medFreeText')}</span>
            <input
              type="text"
              value={draft.freeTextLine}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setDraft((current) => ({ ...current, freeTextLine: event.target.value }))}
            />
          </label>

          <p className="medication-edit-dialog__preview">{dosePreview}</p>
        </div>

        <div className="therapy-modal__footer">
          <button type="button" className="therapy-btn therapy-btn--ghost" onClick={onClose}>
            {translateMedicationUi(language, 'medCancel')}
          </button>
          <button
            type="button"
            className="therapy-btn therapy-btn--primary"
            disabled={disabled || !draft.substance.trim()}
            onClick={handleSave}
          >
            {translateMedicationUi(language, 'medSave')}
          </button>
        </div>
      </div>
    </div>
  )
}

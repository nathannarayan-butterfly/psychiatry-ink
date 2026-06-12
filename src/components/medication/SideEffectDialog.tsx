import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  COMMON_UNCLEAR_SYMPTOMS,
  getAttributionLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import type { MedicationEntry, SideEffectAttribution, SideEffectReport } from '../../types/medicationPlan'

interface SideEffectDialogProps {
  open: boolean
  medications: MedicationEntry[]
  preselectedMedicationId?: string
  disabled?: boolean
  onClose: () => void
  onSave: (report: Omit<SideEffectReport, 'id'>) => void
}

const ATTRIBUTIONS: SideEffectAttribution[] = ['single', 'combination', 'unknown']

export function SideEffectDialog({
  open,
  medications,
  preselectedMedicationId,
  disabled = false,
  onClose,
  onSave,
}: SideEffectDialogProps) {
  const { language, t } = useTranslation()
  const [symptom, setSymptom] = useState('')
  const [onsetDate, setOnsetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [severity, setSeverity] = useState('')
  const [suspectedMedicationId, setSuspectedMedicationId] = useState<string>('')
  const [temporalRelation, setTemporalRelation] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [attribution, setAttribution] = useState<SideEffectAttribution>('unknown')

  useEffect(() => {
    if (!open) return
    setSymptom('')
    setOnsetDate(new Date().toISOString().slice(0, 10))
    setSeverity('')
    setSuspectedMedicationId(preselectedMedicationId ?? '')
    setTemporalRelation('')
    setActionTaken('')
    setOutcome('')
    setNote('')
    setAttribution(preselectedMedicationId ? 'single' : 'unknown')
  }, [open, preselectedMedicationId])

  if (!open) return null

  const handleSave = () => {
    if (!symptom.trim()) return
    onSave({
      symptom: symptom.trim(),
      onsetDate,
      severity: severity.trim(),
      suspectedMedicationId: suspectedMedicationId || undefined,
      temporalRelation: temporalRelation.trim(),
      actionTaken: actionTaken.trim(),
      outcome: outcome.trim(),
      note: note.trim(),
      attribution,
    })
    onClose()
  }

  return (
    <div className="therapy-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="therapy-modal side-effect-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-effect-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 id="side-effect-dialog-title" className="therapy-modal__title">
              {translateMedicationUi(language, 'medReportSideEffect')}
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

        <div className="therapy-modal__body">
          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medSymptom')}</span>
            <input
              type="text"
              value={symptom}
              disabled={disabled}
              className="therapy-input"
              autoFocus
              onChange={(event) => setSymptom(event.target.value)}
            />
          </label>

          <div className="therapy-field-grid">
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medOnset')}</span>
              <input
                type="date"
                value={onsetDate}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) => setOnsetDate(event.target.value)}
              />
            </label>
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medSeverity')}</span>
              <input
                type="text"
                value={severity}
                disabled={disabled}
                className="therapy-input"
                onChange={(event) => setSeverity(event.target.value)}
              />
            </label>
          </div>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medSubstance')}</span>
            <select
              value={suspectedMedicationId}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setSuspectedMedicationId(event.target.value)}
            >
              <option value="">—</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.substance}
                </option>
              ))}
            </select>
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medTemporal')}</span>
            <input
              type="text"
              value={temporalRelation}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setTemporalRelation(event.target.value)}
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medActionTaken')}</span>
            <input
              type="text"
              value={actionTaken}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setActionTaken(event.target.value)}
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medOutcome')}</span>
            <input
              type="text"
              value={outcome}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setOutcome(event.target.value)}
            />
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medAttribution')}</span>
            <select
              value={attribution}
              disabled={disabled}
              className="therapy-input"
              onChange={(event) => setAttribution(event.target.value as SideEffectAttribution)}
            >
              {ATTRIBUTIONS.map((item) => (
                <option key={item} value={item}>
                  {getAttributionLabel(item, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medFreeText')}</span>
            <textarea
              value={note}
              disabled={disabled}
              className="therapy-input"
              rows={2}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>

        <div className="therapy-modal__footer">
          <button type="button" className="therapy-btn therapy-btn--ghost" onClick={onClose}>
            {translateMedicationUi(language, 'medCancel')}
          </button>
          <button
            type="button"
            className="therapy-btn therapy-btn--primary"
            disabled={disabled || !symptom.trim()}
            onClick={handleSave}
          >
            {translateMedicationUi(language, 'medSave')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface GlobalSideEffectFormProps {
  medications: MedicationEntry[]
  disabled?: boolean
  onSave: (report: Omit<SideEffectReport, 'id'>) => void
}

export function GlobalSideEffectForm({
  medications,
  disabled = false,
  onSave,
}: GlobalSideEffectFormProps) {
  const { language } = useTranslation()
  const [symptom, setSymptom] = useState('')
  const [onsetDate, setOnsetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [suspectedMedicationId, setSuspectedMedicationId] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!symptom.trim()) return
    onSave({
      symptom: symptom.trim(),
      onsetDate,
      severity: '',
      suspectedMedicationId: suspectedMedicationId || undefined,
      temporalRelation: '',
      actionTaken: '',
      outcome: '',
      note: note.trim(),
      attribution: 'unknown',
    })
    setSymptom('')
    setSuspectedMedicationId('')
    setNote('')
  }

  return (
    <form className="medication-side-effect-form" onSubmit={handleSubmit}>
      <p className="medication-lower-section__hint">
        {translateMedicationUi(language, 'medGlobalSideEffectHint')}
      </p>

      <div className="therapy-picker__chips" role="list">
        {COMMON_UNCLEAR_SYMPTOMS[language].map((label) => (
          <button
            key={label}
            type="button"
            role="listitem"
            className={`therapy-chip${symptom === label ? ' is-selected' : ''}`}
            disabled={disabled}
            onClick={() => setSymptom(label)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="therapy-field-grid">
        <label className="therapy-field">
          <span>{translateMedicationUi(language, 'medSymptom')}</span>
          <input
            type="text"
            value={symptom}
            disabled={disabled}
            className="therapy-input"
            onChange={(event) => setSymptom(event.target.value)}
          />
        </label>
        <label className="therapy-field">
          <span>{translateMedicationUi(language, 'medOnset')}</span>
          <input
            type="date"
            value={onsetDate}
            disabled={disabled}
            className="therapy-input"
            onChange={(event) => setOnsetDate(event.target.value)}
          />
        </label>
      </div>

      {medications.length > 0 ? (
        <label className="therapy-field">
          <span>{translateMedicationUi(language, 'medSuspectedMedication')}</span>
          <select
            value={suspectedMedicationId}
            disabled={disabled}
            className="therapy-input"
            onChange={(event) => setSuspectedMedicationId(event.target.value)}
          >
            <option value="">—</option>
            {medications.map((med) => (
              <option key={med.id} value={med.id}>
                {med.substance}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="therapy-field">
        <span>{translateMedicationUi(language, 'medFreeText')}</span>
        <input
          type="text"
          value={note}
          disabled={disabled}
          className="therapy-input"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="therapy-btn therapy-btn--primary medication-side-effect-form__submit"
        disabled={disabled || !symptom.trim()}
      >
        {translateMedicationUi(language, 'medReportSideEffect')}
      </button>
    </form>
  )
}

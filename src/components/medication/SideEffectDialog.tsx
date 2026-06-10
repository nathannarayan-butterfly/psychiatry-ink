import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
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
    <div className="timeline-entry-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        className="timeline-entry-dialog workspace-float-block side-effect-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-effect-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="timeline-entry-dialog__header">
          <h2 id="side-effect-dialog-title" className="text-sm font-semibold text-ink">
            {translateMedicationUi(language, 'medReportSideEffect')}
          </h2>
          <button
            type="button"
            className="timeline-entry-dialog__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="timeline-entry-dialog__body">
          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medSymptom')}</span>
            <input
              type="text"
              value={symptom}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              autoFocus
              onChange={(event) => setSymptom(event.target.value)}
            />
          </label>

          <div className="lab-entry-dialog__row">
            <label className="timeline-entry-dialog__field">
              <span>{translateMedicationUi(language, 'medOnset')}</span>
              <input
                type="date"
                value={onsetDate}
                disabled={disabled}
                className="timeline-entry-dialog__input"
                onChange={(event) => setOnsetDate(event.target.value)}
              />
            </label>
            <label className="timeline-entry-dialog__field">
              <span>{translateMedicationUi(language, 'medSeverity')}</span>
              <input
                type="text"
                value={severity}
                disabled={disabled}
                className="timeline-entry-dialog__input"
                onChange={(event) => setSeverity(event.target.value)}
              />
            </label>
          </div>

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medSubstance')}</span>
            <select
              value={suspectedMedicationId}
              disabled={disabled}
              className="timeline-entry-dialog__input"
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

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medTemporal')}</span>
            <input
              type="text"
              value={temporalRelation}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              onChange={(event) => setTemporalRelation(event.target.value)}
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medActionTaken')}</span>
            <input
              type="text"
              value={actionTaken}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              onChange={(event) => setActionTaken(event.target.value)}
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medOutcome')}</span>
            <input
              type="text"
              value={outcome}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              onChange={(event) => setOutcome(event.target.value)}
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medAttribution')}</span>
            <select
              value={attribution}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              onChange={(event) => setAttribution(event.target.value as SideEffectAttribution)}
            >
              {ATTRIBUTIONS.map((item) => (
                <option key={item} value={item}>
                  {getAttributionLabel(item, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{translateMedicationUi(language, 'medFreeText')}</span>
            <textarea
              value={note}
              disabled={disabled}
              className="timeline-entry-dialog__input"
              rows={2}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>

        <div className="timeline-entry-dialog__footer">
          <button type="button" className="timeline-entry-dialog__btn" onClick={onClose}>
            {translateMedicationUi(language, 'medCancel')}
          </button>
          <button
            type="button"
            className="timeline-entry-dialog__btn timeline-entry-dialog__btn--primary"
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
    <form className="medication-lower-section__form" onSubmit={handleSubmit}>
      <p className="medication-lower-section__hint">
        {translateMedicationUi(language, 'medGlobalSideEffectHint')}
      </p>

      <div className="medication-symptom-chips" role="list">
        {COMMON_UNCLEAR_SYMPTOMS[language].map((label) => (
          <button
            key={label}
            type="button"
            role="listitem"
            className={`medication-symptom-chips__chip${symptom === label ? ' medication-symptom-chips__chip--active' : ''}`}
            disabled={disabled}
            onClick={() => setSymptom(label)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="lab-entry-dialog__row">
        <label className="timeline-entry-dialog__field">
          <span>{translateMedicationUi(language, 'medSymptom')}</span>
          <input
            type="text"
            value={symptom}
            disabled={disabled}
            className="timeline-entry-dialog__input"
            onChange={(event) => setSymptom(event.target.value)}
          />
        </label>
        <label className="timeline-entry-dialog__field">
          <span>{translateMedicationUi(language, 'medOnset')}</span>
          <input
            type="date"
            value={onsetDate}
            disabled={disabled}
            className="timeline-entry-dialog__input"
            onChange={(event) => setOnsetDate(event.target.value)}
          />
        </label>
      </div>

      {medications.length > 0 ? (
        <label className="timeline-entry-dialog__field">
          <span>{translateMedicationUi(language, 'medSuspectedMedication')}</span>
          <select
            value={suspectedMedicationId}
            disabled={disabled}
            className="timeline-entry-dialog__input"
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

      <label className="timeline-entry-dialog__field">
        <span>{translateMedicationUi(language, 'medFreeText')}</span>
        <input
          type="text"
          value={note}
          disabled={disabled}
          className="timeline-entry-dialog__input"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button type="submit" className="medication-lower-section__submit" disabled={disabled || !symptom.trim()}>
        {translateMedicationUi(language, 'medReportSideEffect')}
      </button>
    </form>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateSettingsWorkspaceUi } from '../../data/settingsWorkspaceUiTranslations'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { IntegrationCasePicker } from '../settings/IntegrationCasePicker'
import { NewPatientDialog, type NewPatientData } from '../dashboard/NewPatientDialog'
import type {
  CalendarItem,
  CalendarItemType,
  CalendarPriority,
  CreateCalendarItemInput,
} from '../../types/calendar'
import { CALENDAR_ITEM_TYPES } from '../../types/calendar'
import { CALENDAR_PRIORITY_LABEL_KEYS, CALENDAR_TYPE_LABEL_KEYS, typeAccentClass } from '../../utils/calendarLabels'

interface CalendarItemModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateCalendarItemInput) => Promise<void>
  cases: DashboardCase[]
  initial?: Partial<CalendarItem> | null
  defaultStart?: Date
  onCreatePatient?: (patient: NewPatientData) => Promise<string>
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultEnd(start: Date): Date {
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 30)
  return end
}

export function CalendarItemModal({
  open,
  onClose,
  onSave,
  cases,
  initial,
  defaultStart,
  onCreatePatient,
}: CalendarItemModalProps) {
  const { t, language } = useTranslation()
  const startDefault = defaultStart ?? new Date()
  const [type, setType] = useState<CalendarItemType>('consultation')
  const [title, setTitle] = useState('')
  const [caseId, setCaseId] = useState('')
  const [startTime, setStartTime] = useState(toLocalInputValue(startDefault))
  const [endTime, setEndTime] = useState(toLocalInputValue(defaultEnd(startDefault)))
  const [priority, setPriority] = useState<CalendarPriority>('normal')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const [linkedPatientLabel, setLinkedPatientLabel] = useState<string | null>(null)
  const [creatingPatient, setCreatingPatient] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(initial?.type ?? 'consultation')
    setTitle(initial?.title ?? '')
    setCaseId(initial?.caseId ?? '')
    setStartTime(toLocalInputValue(initial?.startTime ? new Date(initial.startTime) : startDefault))
    setEndTime(
      toLocalInputValue(
        initial?.endTime ? new Date(initial.endTime) : defaultEnd(initial?.startTime ? new Date(initial.startTime) : startDefault),
      ),
    )
    setPriority(initial?.priority ?? 'normal')
    setLocation(initial?.location ?? '')
    setNotes(initial?.notes ?? '')
    setReason(initial?.reason ?? '')
    setError(null)
    setShowNewPatientDialog(false)
    setLinkedPatientLabel(null)
  }, [open, initial, startDefault])

  const handleNewPatientSubmit = useCallback(
    async (patient: NewPatientData) => {
      if (!onCreatePatient) return
      setCreatingPatient(true)
      setError(null)
      try {
        const newCaseId = await onCreatePatient(patient)
        const label = patient.name || [patient.vorname, patient.nachname].filter(Boolean).join(' ')
        setCaseId(newCaseId)
        setLinkedPatientLabel(label || null)
        if (!title.trim() && label) setTitle(label)
        setShowNewPatientDialog(false)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : translateSettingsWorkspaceUi(language, 'calPatientCreateFailed'),
        )
      } finally {
        setCreatingPatient(false)
      }
    },
    [onCreatePatient, title, language],
  )

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError(translateSettingsWorkspaceUi(language, 'calTitleRequired'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        type,
        title: title.trim(),
        caseId: caseId || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        priority,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'calSaveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }, [type, title, caseId, startTime, endTime, priority, location, notes, reason, onSave, onClose, language])

  const caseOptions = useMemo(() => cases.filter((c) => c.caseId), [cases])

  if (!open) return null

  return (
    <div className="calendar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`calendar-modal ${typeAccentClass(type)}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="calendar-modal-title" className="calendar-modal__title">
          {initial?.id
            ? translateSettingsWorkspaceUi(language, 'calItemEdit')
            : translateSettingsWorkspaceUi(language, 'calItemPlan')}
        </h2>

        <div className="calendar-modal__grid">
          <label className="calendar-field">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calType')}</span>
            <select className="calendar-field__input" value={type} onChange={(e) => setType(e.target.value as CalendarItemType)}>
              {CALENDAR_ITEM_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {t(CALENDAR_TYPE_LABEL_KEYS[entry])}
                </option>
              ))}
            </select>
          </label>

          <label className="calendar-field calendar-field--full">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calTitle')}</span>
            <input
              className="calendar-field__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={translateSettingsWorkspaceUi(language, 'calTitlePlaceholder')}
            />
          </label>

          <div className="calendar-field calendar-field--full">
            <div className="calendar-patient-field">
              <IntegrationCasePicker
                cases={caseOptions}
                value={caseId}
                onChange={(nextCaseId) => {
                  setCaseId(nextCaseId)
                  setLinkedPatientLabel(null)
                }}
                label={translateSettingsWorkspaceUi(language, 'calPatientCase')}
                searchPlaceholder={translateSettingsWorkspaceUi(language, 'calPatientSearch')}
                noResultsLabel={translateSettingsWorkspaceUi(language, 'calNoResults')}
                id="calendar-case-picker"
              />
              {onCreatePatient ? (
                <button
                  type="button"
                  className="calendar-btn calendar-btn--ghost calendar-btn--xs"
                  onClick={() => setShowNewPatientDialog(true)}
                  disabled={creatingPatient}
                >
                  {t('calendarNewPatientButton')}
                </button>
              ) : null}
            </div>
            {linkedPatientLabel ? (
              <p className="calendar-patient-field__linked">
                {t('calendarPatientLinked').replace('{name}', linkedPatientLabel)}
              </p>
            ) : null}
          </div>

          <label className="calendar-field">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calStart')}</span>
            <input
              type="datetime-local"
              className="calendar-field__input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>

          <label className="calendar-field">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calEnd')}</span>
            <input
              type="datetime-local"
              className="calendar-field__input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>

          <label className="calendar-field">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calPriority')}</span>
            <select
              className="calendar-field__input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as CalendarPriority)}
            >
              {(Object.keys(CALENDAR_PRIORITY_LABEL_KEYS) as CalendarPriority[]).map((p) => (
                <option key={p} value={p}>
                  {t(CALENDAR_PRIORITY_LABEL_KEYS[p])}
                </option>
              ))}
            </select>
          </label>

          <label className="calendar-field">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calLocation')}</span>
            <input
              className="calendar-field__input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={translateSettingsWorkspaceUi(language, 'calLocationPlaceholder')}
            />
          </label>

          <label className="calendar-field calendar-field--full">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calReason')}</span>
            <input
              className="calendar-field__input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <label className="calendar-field calendar-field--full">
            <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calNotes')}</span>
            <textarea
              className="calendar-field__textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>
        </div>

        {error ? (
          <p className="calendar-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="calendar-modal__actions">
          <button type="button" className="calendar-btn calendar-btn--ghost" onClick={onClose}>
            {translateSettingsWorkspaceUi(language, 'calCancel')}
          </button>
          <button type="button" className="calendar-btn calendar-btn--primary" disabled={saving} onClick={() => void handleSubmit()}>
            {saving
              ? translateSettingsWorkspaceUi(language, 'calSaving')
              : translateSettingsWorkspaceUi(language, 'calSave')}
          </button>
        </div>
      </div>

      {showNewPatientDialog && onCreatePatient ? (
        <NewPatientDialog
          onSubmit={(patient) => void handleNewPatientSubmit(patient)}
          onCancel={() => setShowNewPatientDialog(false)}
        />
      ) : null}
    </div>
  )
}

interface RescheduleModalProps {
  open: boolean
  item: CalendarItem | null
  onClose: () => void
  onReschedule: (startTime: string, endTime: string, reason?: string) => Promise<void>
}

export function CalendarRescheduleModal({ open, item, onClose, onReschedule }: RescheduleModalProps) {
  const { language } = useTranslation()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    setStartTime(toLocalInputValue(new Date(item.startTime)))
    setEndTime(toLocalInputValue(new Date(item.endTime)))
    setReason('')
  }, [item, open])

  if (!open || !item) return null

  return (
    <div className="calendar-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="calendar-modal calendar-modal--compact" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="calendar-modal__title">{translateSettingsWorkspaceUi(language, 'calReschedule')}</h2>
        <label className="calendar-field">
          <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calNewStart')}</span>
          <input type="datetime-local" className="calendar-field__input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="calendar-field">
          <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calNewEnd')}</span>
          <input type="datetime-local" className="calendar-field__input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label className="calendar-field">
          <span className="calendar-field__label">{translateSettingsWorkspaceUi(language, 'calReasonOptional')}</span>
          <input className="calendar-field__input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="calendar-modal__actions">
          <button type="button" className="calendar-btn calendar-btn--ghost" onClick={onClose}>
            {translateSettingsWorkspaceUi(language, 'calCancel')}
          </button>
          <button
            type="button"
            className="calendar-btn calendar-btn--primary"
            disabled={saving}
            onClick={() => {
              setSaving(true)
              void onReschedule(new Date(startTime).toISOString(), new Date(endTime).toISOString(), reason.trim() || undefined)
                .then(onClose)
                .finally(() => setSaving(false))
            }}
          >
            {translateSettingsWorkspaceUi(language, 'calRescheduleBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

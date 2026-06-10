import { useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { LocalGeschlecht } from '../../hooks/useCaseRegistry'

export interface NewPatientData {
  vorname: string
  nachname: string
  name: string
  geburtsdatum: string
  geschlecht: LocalGeschlecht | ''
}

interface NewPatientDialogProps {
  mode?: 'create' | 'edit'
  initialData?: NewPatientData
  onSubmit: (patient: NewPatientData) => void
  onCancel: () => void
}

export function NewPatientDialog({
  mode = 'create',
  initialData,
  onSubmit,
  onCancel,
}: NewPatientDialogProps) {
  const { t } = useTranslation()
  const [vorname, setVorname] = useState(initialData?.vorname ?? '')
  const [nachname, setNachname] = useState(initialData?.nachname ?? '')
  const [geburtsdatum, setGeburtsdatum] = useState(initialData?.geburtsdatum ?? '')
  const [geschlecht, setGeschlecht] = useState<LocalGeschlecht | ''>(initialData?.geschlecht ?? '')
  const overlayRef = useRef<HTMLDivElement>(null)

  const isEdit = mode === 'edit'
  const dialogTitle = isEdit ? t('patientEditTitle') : t('dashboardNewPatient')
  const submitLabel = isEdit ? t('patientEditSave') : t('newPatientErstellen')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedVorname = vorname.trim()
    const trimmedNachname = nachname.trim()
    onSubmit({
      vorname: trimmedVorname,
      nachname: trimmedNachname,
      name: [trimmedVorname, trimmedNachname].filter(Boolean).join(' '),
      geburtsdatum,
      geschlecht,
    })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  return (
    <div
      ref={overlayRef}
      className="new-patient-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      onClick={handleOverlayClick}
    >
      <div className="new-patient-dialog">
        <h2 className="new-patient-dialog__title">{dialogTitle}</h2>

        <form onSubmit={handleSubmit} className="new-patient-dialog__form">
          <div className="new-patient-dialog__name-row">
            <div className="new-patient-dialog__field">
              <label htmlFor="npd-vorname" className="new-patient-dialog__label">
                {t('patientFirstNameLabel')}
              </label>
              <input
                id="npd-vorname"
                type="text"
                className="new-patient-dialog__input"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                placeholder={t('patientFirstNamePlaceholder')}
                autoFocus
              />
            </div>

            <div className="new-patient-dialog__field">
              <label htmlFor="npd-nachname" className="new-patient-dialog__label">
                {t('patientLastNameLabel')}
              </label>
              <input
                id="npd-nachname"
                type="text"
                className="new-patient-dialog__input"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                placeholder={t('patientLastNamePlaceholder')}
              />
            </div>
          </div>

          <div className="new-patient-dialog__field">
            <label htmlFor="npd-geburtsdatum" className="new-patient-dialog__label">
              {t('patientFieldGeburtsdatum')}
            </label>
            <input
              id="npd-geburtsdatum"
              type="date"
              className="new-patient-dialog__input"
              value={geburtsdatum}
              onChange={(e) => setGeburtsdatum(e.target.value)}
            />
          </div>

          <div className="new-patient-dialog__field">
            <span className="new-patient-dialog__label">{t('newPatientFieldGeschlecht')}</span>
            <div className="new-patient-dialog__gender-group" role="group">
              {(
                [
                  { value: 'maennlich', labelKey: 'patientGeschlechtMaennlich' },
                  { value: 'weiblich', labelKey: 'patientGeschlechtWeiblich' },
                  { value: 'divers', labelKey: 'patientGeschlechtDivers' },
                ] as const
              ).map(({ value, labelKey }) => (
                <label key={value} className="new-patient-dialog__gender-option">
                  <input
                    type="radio"
                    name="geschlecht"
                    value={value}
                    checked={geschlecht === value}
                    onChange={() => setGeschlecht(value)}
                    className="new-patient-dialog__radio"
                  />
                  {t(labelKey)}
                </label>
              ))}
            </div>
          </div>

          <div className="new-patient-dialog__actions">
            <button
              type="button"
              className="new-patient-dialog__btn new-patient-dialog__btn--cancel"
              onClick={onCancel}
            >
              {t('newPatientAbbrechen')}
            </button>
            <button
              type="submit"
              className="new-patient-dialog__btn new-patient-dialog__btn--create"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

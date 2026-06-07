import { useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { LocalGeschlecht } from '../../hooks/useCaseRegistry'

interface NewPatientDialogProps {
  onCreated: (name: string, geburtsdatum: string, geschlecht: LocalGeschlecht | '') => void
  onCancel: () => void
}

export function NewPatientDialog({ onCreated, onCancel }: NewPatientDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [geburtsdatum, setGeburtsdatum] = useState('')
  const [geschlecht, setGeschlecht] = useState<LocalGeschlecht | ''>('')
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreated(name.trim(), geburtsdatum, geschlecht)
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
      aria-label={t('dashboardNewPatient')}
      onClick={handleOverlayClick}
    >
      <div className="new-patient-dialog">
        <h2 className="new-patient-dialog__title">{t('dashboardNewPatient')}</h2>

        <form onSubmit={handleSubmit} className="new-patient-dialog__form">
          <div className="new-patient-dialog__field">
            <label htmlFor="npd-name" className="new-patient-dialog__label">
              {t('patientNameLabel')}
            </label>
            <input
              id="npd-name"
              type="text"
              className="new-patient-dialog__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('patientNamePlaceholder')}
              autoFocus
            />
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
              {t('newPatientErstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

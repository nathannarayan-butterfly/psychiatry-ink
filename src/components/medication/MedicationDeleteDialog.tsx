import { useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationDeleteReasonCode, MedicationEntry } from '../../types/medicationPlan'
import type { MedicationDeleteInput } from '../../utils/medication/planOps'

interface MedicationDeleteDialogProps {
  open: boolean
  entry: MedicationEntry | null
  disabled?: boolean
  deletedBy: string
  onClose: () => void
  onConfirm: (medicationId: string, input: MedicationDeleteInput) => void
}

const REASON_CODES: MedicationDeleteReasonCode[] = ['wrong_entry', 'duplicate', 'other']

function reasonLabel(code: MedicationDeleteReasonCode, language: ReturnType<typeof useTranslation>['language']) {
  if (code === 'wrong_entry') return translateMedicationUi(language, 'medDeleteReasonWrong')
  if (code === 'duplicate') return translateMedicationUi(language, 'medDeleteReasonDuplicate')
  return translateMedicationUi(language, 'medDeleteReasonOther')
}

export function MedicationDeleteDialog({
  open,
  entry,
  disabled = false,
  deletedBy,
  onClose,
  onConfirm,
}: MedicationDeleteDialogProps) {
  const { language } = useTranslation()
  const [reasonCode, setReasonCode] = useState<MedicationDeleteReasonCode>('wrong_entry')
  const [reasonText, setReasonText] = useState('')

  useEffect(() => {
    if (!open) return
    setReasonCode('wrong_entry')
    setReasonText('')
  }, [open, entry?.id])

  if (!open || !entry) return null

  const requiresText = reasonCode === 'other'
  const canConfirm = !requiresText || reasonText.trim().length > 0

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(entry.id, {
      reasonCode,
      reasonText: reasonText.trim() || undefined,
      deletedBy,
    })
    onClose()
  }

  return (
    <div className="therapy-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="therapy-modal medication-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medication-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 id="medication-delete-title" className="therapy-modal__title">
              {translateMedicationUi(language, 'medDeleteTitle')}
            </h4>
            <p className="medication-delete-dialog__subtitle">{entry.doseLineGerman || entry.substance}</p>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={onClose}
            aria-label={translateMedicationUi(language, 'medCancel')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body medication-delete-dialog__body">
          <label className="therapy-field">
            <span>{translateMedicationUi(language, 'medDeleteReason')}</span>
            <select
              className="therapy-input"
              value={reasonCode}
              disabled={disabled}
              onChange={(event) => setReasonCode(event.target.value as MedicationDeleteReasonCode)}
            >
              {REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {reasonLabel(code, language)}
                </option>
              ))}
            </select>
          </label>

          {requiresText ? (
            <label className="therapy-field">
              <span>{translateMedicationUi(language, 'medDeleteReasonOther')}</span>
              <textarea
                className="therapy-input therapy-input--textarea"
                rows={3}
                value={reasonText}
                disabled={disabled}
                placeholder={translateMedicationUi(language, 'medDeleteReasonOtherPlaceholder')}
                onChange={(event) => setReasonText(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <div className="therapy-modal__footer">
          <button type="button" className="therapy-btn therapy-btn--ghost" disabled={disabled} onClick={onClose}>
            {translateMedicationUi(language, 'medCancel')}
          </button>
          <button
            type="button"
            className="therapy-btn therapy-btn--danger"
            disabled={disabled || !canConfirm}
            onClick={handleConfirm}
          >
            {translateMedicationUi(language, 'medConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

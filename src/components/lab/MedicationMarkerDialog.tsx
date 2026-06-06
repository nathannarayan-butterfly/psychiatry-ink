import { useTranslation } from '../../context/TranslationContext'
import { MEDICATION_CHANGE_TYPES } from '../../types/lab'
import type { MedicationChangeType } from '../../types/lab'
import type { LabToolState } from '../../hooks/useLabTool'

interface MedicationMarkerDialogProps {
  lab: LabToolState
}

const changeTypeLabelKey: Record<
  MedicationChangeType,
  | 'labMedStarted'
  | 'labMedIncreased'
  | 'labMedReduced'
  | 'labMedStopped'
  | 'labMedContinued'
  | 'labMedMissed'
  | 'labMedUnknown'
> = {
  started: 'labMedStarted',
  increased: 'labMedIncreased',
  reduced: 'labMedReduced',
  stopped: 'labMedStopped',
  continued: 'labMedContinued',
  missed: 'labMedMissed',
  unknown: 'labMedUnknown',
}

export function MedicationMarkerDialog({ lab }: MedicationMarkerDialogProps) {
  const { t } = useTranslation()

  if (!lab.markerDialogOpen) return null

  const handleSave = () => {
    const error = lab.saveMarkerDraft()
    if (error) lab.setSaveError(error)
  }

  return (
    <div
      className="timeline-entry-dialog__backdrop"
      role="presentation"
      onClick={lab.closeMarkerDialog}
    >
      <div
        className="timeline-entry-dialog workspace-float-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-marker-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="timeline-entry-dialog__header">
          <h2 id="lab-marker-dialog-title" className="text-sm font-semibold text-ink">
            {lab.editingMarkerId ? t('labEditMedication') : t('labAddMedication')}
          </h2>
        </div>

        <div className="timeline-entry-dialog__body">
          <label className="timeline-entry-dialog__field">
            <span>{t('labDate')}</span>
            <input
              type="date"
              value={lab.markerDraft.date}
              onChange={(event) => lab.updateMarkerDraft({ date: event.target.value })}
              className="timeline-entry-dialog__input"
              autoFocus
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{t('labMedicationName')}</span>
            <input
              type="text"
              value={lab.markerDraft.medicationName}
              onChange={(event) => lab.updateMarkerDraft({ medicationName: event.target.value })}
              className="timeline-entry-dialog__input"
            />
          </label>

          <div className="lab-entry-dialog__row">
            <label className="timeline-entry-dialog__field">
              <span>{t('labDose')}</span>
              <input
                type="text"
                value={lab.markerDraft.dose}
                onChange={(event) => lab.updateMarkerDraft({ dose: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
            <label className="timeline-entry-dialog__field">
              <span>{t('labDoseUnit')}</span>
              <input
                type="text"
                value={lab.markerDraft.doseUnit}
                onChange={(event) => lab.updateMarkerDraft({ doseUnit: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
          </div>

          <div className="timeline-entry-dialog__field">
            <span>{t('labChangeType')}</span>
            <div className="timeline-entry-dialog__segment lab-marker-dialog__segment">
              {MEDICATION_CHANGE_TYPES.map((changeType) => (
                <button
                  key={changeType}
                  type="button"
                  className={`timeline-entry-dialog__segment-btn ${
                    lab.markerDraft.changeType === changeType
                      ? 'timeline-entry-dialog__segment-btn--active'
                      : ''
                  }`}
                  onClick={() => lab.updateMarkerDraft({ changeType })}
                >
                  {t(changeTypeLabelKey[changeType])}
                </button>
              ))}
            </div>
          </div>

          <label className="timeline-entry-dialog__field">
            <span>{t('labNote')}</span>
            <input
              type="text"
              value={lab.markerDraft.note}
              onChange={(event) => lab.updateMarkerDraft({ note: event.target.value })}
              className="timeline-entry-dialog__input"
            />
          </label>

          {lab.saveError ? (
            <p className="lab-entry-dialog__error" role="alert">
              {t(
                lab.saveError === 'date'
                  ? 'labErrorDate'
                  : lab.saveError === 'medication'
                    ? 'labErrorMedication'
                    : 'labErrorValue',
              )}
            </p>
          ) : null}
        </div>

        <div className="timeline-entry-dialog__footer">
          <button
            type="button"
            className="timeline-entry-dialog__btn"
            onClick={lab.closeMarkerDialog}
          >
            {t('timelineCancel')}
          </button>
          <button
            type="button"
            className="timeline-entry-dialog__btn timeline-entry-dialog__btn--primary"
            onClick={handleSave}
          >
            {t('timelineSave')}
          </button>
        </div>
      </div>
    </div>
  )
}

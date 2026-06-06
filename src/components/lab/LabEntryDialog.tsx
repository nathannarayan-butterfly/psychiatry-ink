import { useTranslation } from '../../context/TranslationContext'
import { LAB_PARAMETER_SUGGESTIONS } from '../../types/lab'
import type { LabToolState } from '../../hooks/useLabTool'

interface LabEntryDialogProps {
  lab: LabToolState
}

export function LabEntryDialog({ lab }: LabEntryDialogProps) {
  const { t } = useTranslation()

  if (!lab.labDialogOpen) return null

  const handleSave = () => {
    const error = lab.saveLabDraft()
    if (error) lab.setSaveError(error)
  }

  return (
    <div className="timeline-entry-dialog__backdrop" role="presentation" onClick={lab.closeLabDialog}>
      <div
        className="timeline-entry-dialog workspace-float-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-entry-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="timeline-entry-dialog__header">
          <h2 id="lab-entry-dialog-title" className="text-sm font-semibold text-ink">
            {lab.editingLabId ? t('labEditEntry') : t('labAddEntry')}
          </h2>
        </div>

        <div className="timeline-entry-dialog__body">
          <label className="timeline-entry-dialog__field">
            <span>{t('labDate')}</span>
            <input
              type="date"
              value={lab.labDraft.date}
              onChange={(event) => lab.updateLabDraft({ date: event.target.value })}
              className="timeline-entry-dialog__input"
              autoFocus
            />
          </label>

          <label className="timeline-entry-dialog__field">
            <span>{t('labParameter')}</span>
            <input
              type="text"
              list="lab-parameter-suggestions"
              value={lab.labDraft.parameter}
              onChange={(event) => lab.updateLabDraft({ parameter: event.target.value })}
              className="timeline-entry-dialog__input"
            />
            <datalist id="lab-parameter-suggestions">
              {LAB_PARAMETER_SUGGESTIONS.map((parameter) => (
                <option key={parameter} value={parameter} />
              ))}
            </datalist>
          </label>

          <div className="lab-entry-dialog__row">
            <label className="timeline-entry-dialog__field">
              <span>{t('labValue')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={lab.labDraft.value}
                onChange={(event) => lab.updateLabDraft({ value: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
            <label className="timeline-entry-dialog__field">
              <span>{t('labUnit')}</span>
              <input
                type="text"
                value={lab.labDraft.unit}
                onChange={(event) => lab.updateLabDraft({ unit: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
          </div>

          <div className="lab-entry-dialog__row">
            <label className="timeline-entry-dialog__field">
              <span>{t('labReferenceLow')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={lab.labDraft.referenceLow}
                onChange={(event) => lab.updateLabDraft({ referenceLow: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
            <label className="timeline-entry-dialog__field">
              <span>{t('labReferenceHigh')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={lab.labDraft.referenceHigh}
                onChange={(event) => lab.updateLabDraft({ referenceHigh: event.target.value })}
                className="timeline-entry-dialog__input"
              />
            </label>
          </div>

          <label className="timeline-entry-dialog__field">
            <span>{t('labNote')}</span>
            <input
              type="text"
              value={lab.labDraft.note}
              onChange={(event) => lab.updateLabDraft({ note: event.target.value })}
              className="timeline-entry-dialog__input"
            />
          </label>

          {lab.saveError ? (
            <p className="lab-entry-dialog__error" role="alert">
              {t(
                lab.saveError === 'date'
                  ? 'labErrorDate'
                  : lab.saveError === 'parameter'
                    ? 'labErrorParameter'
                    : 'labErrorValue',
              )}
            </p>
          ) : null}
        </div>

        <div className="timeline-entry-dialog__footer">
          <button type="button" className="timeline-entry-dialog__btn" onClick={lab.closeLabDialog}>
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

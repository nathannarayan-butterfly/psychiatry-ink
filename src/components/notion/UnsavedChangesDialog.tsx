import { useTranslation } from '../../context/TranslationContext'

interface UnsavedChangesDialogProps {
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  isSaving?: boolean
}

export function UnsavedChangesDialog({
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation()

  return (
    <div
      className="unsaved-changes-overlay fixed inset-0 z-[1300] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="unsaved-changes-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-changes-title" className="unsaved-changes-dialog__title">
          {t('unsavedChangesTitle')}
        </h2>
        <p className="unsaved-changes-dialog__body">{t('unsavedChangesBody')}</p>
        <div className="unsaved-changes-dialog__actions">
          <button
            type="button"
            className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--save"
            onClick={onSave}
            disabled={isSaving}
          >
            {t('unsavedChangesSave')}
          </button>
          <button
            type="button"
            className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--discard"
            onClick={onDiscard}
            disabled={isSaving}
          >
            {t('unsavedChangesDiscard')}
          </button>
          <button
            type="button"
            className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            {t('unsavedChangesCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

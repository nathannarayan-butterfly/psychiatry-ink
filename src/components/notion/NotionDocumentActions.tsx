import { Copy, Download, Lock, Printer, Save, Unlock } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

// TODO re-enable: the document "Export" action downloads a plain-text (TXT)
// file. TXT file export is hidden from users for now (only PDF + Word are
// exposed across the app); Save + Copy + Print remain. The `onExport` handler
// stays wired so it can be surfaced again by flipping this flag to `true`.
const DOCUMENT_TXT_EXPORT_ENABLED = false

interface NotionDocumentActionsProps {
  disabled?: boolean
  copyDisabled?: boolean
  onSave: () => void
  onCopy: () => void
  onPrint: () => void
  onExport: () => void
  /** Vidieren (finalize/sign) — only rendered when the document type supports it and the caller passes handlers. */
  isFinalized?: boolean
  canFinalize?: boolean
  onFinalize?: () => void
  onUnlock?: () => void
}

export function NotionDocumentActions({
  disabled = false,
  copyDisabled = disabled,
  onSave,
  onCopy,
  onPrint,
  onExport,
  isFinalized = false,
  canFinalize = false,
  onFinalize,
  onUnlock,
}: NotionDocumentActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="notion-document-actions">
      <button
        type="button"
        className="notion-document-actions__btn"
        disabled={disabled}
        onClick={onSave}
        title={t('notionSaveDocument')}
        aria-label={t('notionSaveDocument')}
      >
        <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="notion-document-actions__btn"
        disabled={copyDisabled}
        onClick={onCopy}
        title={t('notionCopyDocument')}
        aria-label={t('notionCopyDocument')}
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="notion-document-actions__btn"
        disabled={disabled}
        onClick={onPrint}
        title={t('print')}
        aria-label={t('print')}
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {DOCUMENT_TXT_EXPORT_ENABLED ? (
        <button
          type="button"
          className="notion-document-actions__btn"
          disabled={disabled}
          onClick={onExport}
          title={t('export')}
          aria-label={t('export')}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
      {onFinalize && !isFinalized ? (
        <button
          type="button"
          className="notion-document-actions__btn notion-document-actions__btn--finalize"
          disabled={disabled || !canFinalize}
          onClick={onFinalize}
          title={t('notionFinalizeDocument')}
          aria-label={t('notionFinalizeDocument')}
        >
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
      {onUnlock && isFinalized ? (
        <button
          type="button"
          className="notion-document-actions__btn"
          disabled={disabled || !canFinalize}
          onClick={onUnlock}
          title={t('notionUnlockDocument')}
          aria-label={t('notionUnlockDocument')}
        >
          <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

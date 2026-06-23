import { Copy, Download, Printer, Save } from 'lucide-react'
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
}

export function NotionDocumentActions({
  disabled = false,
  copyDisabled = disabled,
  onSave,
  onCopy,
  onPrint,
  onExport,
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
    </div>
  )
}

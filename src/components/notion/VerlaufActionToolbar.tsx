import { Copy, Download, Printer } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

// TODO re-enable: the Verlauf "Export" action downloads a plain-text (TXT) file.
// TXT file export is hidden from users for now (only PDF + Word are exposed
// across the app); Copy + Print remain. The `onExport` handler stays wired so
// it can be surfaced again by flipping this flag to `true`.
const VERLAUF_TXT_EXPORT_ENABLED = false

interface VerlaufActionToolbarProps {
  disabled?: boolean
  onCopy: () => void
  onExport: () => void
  onPrint: () => void
}

export function VerlaufActionToolbar({
  disabled = false,
  onCopy,
  onExport,
  onPrint,
}: VerlaufActionToolbarProps) {
  const { t } = useTranslation()

  return (
    <div
      className="verlauf-action-toolbar"
      role="toolbar"
      aria-label={t('verlaufActionToolbarLabel')}
    >
      <button
        type="button"
        className="icon-action-btn icon-action-btn--bordered"
        disabled={disabled}
        onClick={onCopy}
        title={t('verlaufCopyAll')}
        aria-label={t('verlaufCopyAll')}
      >
        <Copy strokeWidth={1.75} />
      </button>
      {VERLAUF_TXT_EXPORT_ENABLED ? (
        <button
          type="button"
          className="icon-action-btn icon-action-btn--bordered"
          disabled={disabled}
          onClick={onExport}
          title={t('verlaufExportAll')}
          aria-label={t('verlaufExportAll')}
        >
          <Download strokeWidth={1.75} />
        </button>
      ) : null}
      <button
        type="button"
        className="icon-action-btn icon-action-btn--bordered"
        disabled={disabled}
        onClick={onPrint}
        title={t('verlaufPrintAll')}
        aria-label={t('verlaufPrintAll')}
      >
        <Printer strokeWidth={1.75} />
      </button>
    </div>
  )
}

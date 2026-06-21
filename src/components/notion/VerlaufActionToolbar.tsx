import { Copy, Download, Printer } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

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

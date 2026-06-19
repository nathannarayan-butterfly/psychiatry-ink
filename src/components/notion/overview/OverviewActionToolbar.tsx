import { Download, Printer } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'

interface OverviewActionToolbarProps {
  onExport: () => void
  onPrint: () => void
}

export function OverviewActionToolbar({ onExport, onPrint }: OverviewActionToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="ov-action-toolbar" role="toolbar" aria-label={t('overviewActionToolbarLabel')}>
      <button
        type="button"
        className="icon-action-btn icon-action-btn--bordered"
        onClick={onExport}
        title={t('overviewExport')}
        aria-label={t('overviewExport')}
      >
        <Download strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="icon-action-btn icon-action-btn--bordered"
        onClick={onPrint}
        title={t('overviewPrint')}
        aria-label={t('overviewPrint')}
      >
        <Printer strokeWidth={1.75} />
      </button>
    </div>
  )
}

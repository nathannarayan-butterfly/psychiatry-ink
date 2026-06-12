import { ShieldAlert } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

interface WorkspaceBackupBannerProps {
  visible: boolean
  onExport: () => void
  onDismiss?: () => void
}

export function WorkspaceBackupBanner({ visible, onExport, onDismiss }: WorkspaceBackupBannerProps) {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <div className="workspace-backup-banner" role="status">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="workspace-backup-banner__text">{t('workspaceBackupReminder')}</span>
      <button
        type="button"
        className="workspace-backup-banner__action"
        onClick={() => void onExport()}
      >
        {t('workspaceVaultExport')}
      </button>
      {onDismiss ? (
        <button
          type="button"
          className="workspace-backup-banner__dismiss"
          onClick={onDismiss}
          aria-label={t('workspaceBackupDismiss')}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

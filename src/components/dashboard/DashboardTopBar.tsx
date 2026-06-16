import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { IconButton } from '../IconButton'
import { NotificationBell } from '../NotificationBell'

interface DashboardTopBarProps {
  onOpenSettings: (section?: SettingsSectionId) => void
  onNavigateHome?: () => void
}

export function DashboardTopBar({ onOpenSettings, onNavigateHome }: DashboardTopBarProps) {
  const { t } = useTranslation()
  const { signOut, isConfigured } = useAuth()
  const displayName = useAccountDisplayName()

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__brand">
        <AppLogo onClick={onNavigateHome} />
      </div>

      <div className="dashboard-topbar__actions">
        <span className="dashboard-topbar__user">{displayName}</span>

        <NotificationBell />

        <IconButton
          bordered
          icon={<Settings strokeWidth={1.75} aria-hidden />}
          label={t('settingsTitle')}
          onClick={() => onOpenSettings()}
        />

        {isConfigured ? (
          <IconButton
            bordered
            icon={<LogOut strokeWidth={1.75} aria-hidden />}
            label={t('logout')}
            onClick={() => void signOut()}
          />
        ) : null}
      </div>
    </header>
  )
}

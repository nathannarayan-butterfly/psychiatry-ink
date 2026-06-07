import { LogOut, Settings, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { IconButton } from '../IconButton'
import { NotificationBell } from '../NotificationBell'

interface DashboardTopBarProps {
  creditBalance: number
  creditsLoading: boolean
  onOpenCredits: () => void
  onOpenSettings: (section?: SettingsSectionId) => void
  onNavigateHome?: () => void
}

export function DashboardTopBar({
  creditBalance,
  creditsLoading,
  onOpenCredits,
  onOpenSettings,
  onNavigateHome,
}: DashboardTopBarProps) {
  const { t } = useTranslation()
  const { signOut, isConfigured } = useAuth()
  const displayName = useAccountDisplayName()

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__brand">
        <AppLogo onClick={onNavigateHome} />
        <span className="dashboard-topbar__user">{displayName}</span>
      </div>

      <div className="dashboard-topbar__actions">
        {creditsLoading ? (
          <span className="dashboard-topbar__credits dashboard-topbar__credits--loading">…</span>
        ) : (
          <button
            type="button"
            className={[
              'dashboard-topbar__credits',
              'notion-topbar__credits',
              creditBalance >= 50 ? 'notion-topbar__credits--ok' : 'notion-topbar__credits--low',
            ].join(' ')}
            onClick={onOpenCredits}
            title={t('creditBalance')}
            aria-label={t('creditsAddLabel')}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('creditBalanceAmount').replace('{balance}', String(creditBalance))}
          </button>
        )}

        <NotificationBell creditBalance={creditBalance} />

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

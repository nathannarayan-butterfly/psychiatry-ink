import { LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { IconButton } from '../IconButton'
import { NotificationBell } from '../NotificationBell'
import { CreditsPurchaseDialog } from './CreditsPurchaseDialog'

interface NotionTopBarProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
  onNavigateDashboard?: () => void
}

export function NotionTopBar({
  creditBalance,
  onOpenSettings,
  onNavigateDashboard,
}: NotionTopBarProps) {
  const { t } = useTranslation()
  const { signOut, isConfigured } = useAuth()
  const displayName = useAccountDisplayName()
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)

  const creditsTooltip = t('creditsRemaining').replace('{balance}', String(creditBalance))

  return (
    <header className="notion-topbar" data-lottie-exclusion>
      <div className="notion-topbar__left">
        <AppLogo onClick={onNavigateDashboard} />
      </div>

      <div className="notion-topbar__right">
        <span className="notion-topbar__user">{displayName}</span>

        <div className="notion-topbar__actions">
            {/* Euro / Credits icon */}
            <button
              type="button"
              className="notion-topbar__euro-btn"
              onClick={() => setCreditsDialogOpen(true)}
              title={creditsTooltip}
              aria-label={creditsTooltip}
            >
              <span className="notion-topbar__euro-symbol" aria-hidden>€</span>
            </button>

            <NotificationBell creditBalance={creditBalance} />

            <IconButton
              bordered
              icon={<Settings strokeWidth={1.5} />}
              label={t('settings')}
              onClick={() => onOpenSettings('appearance')}
            />
            <IconButton
              bordered
              icon={<LogOut strokeWidth={1.5} />}
              label={t('logout')}
              onClick={() => {
                if (!isConfigured) return
                void signOut().then(() => {
                  window.location.href = '/'
                })
              }}
            />
        </div>
      </div>

      {creditsDialogOpen ? (
        <CreditsPurchaseDialog
          onClose={() => setCreditsDialogOpen(false)}
          creditsExhausted={creditBalance <= 0}
          onUpgrade={() => {
            window.location.href = '/#pricing'
          }}
        />
      ) : null}
    </header>
  )
}

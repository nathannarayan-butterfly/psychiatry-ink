import { LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { NotificationBell } from '../NotificationBell'
import { CreditsPurchaseDialog } from './CreditsPurchaseDialog'

interface CaseSidebarUserFooterProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
}

const ACTION_BTN = 'case-sidebar-user-footer__action-btn'

/** User name and account actions pinned to the bottom of the case sidebar. */
export function CaseSidebarUserFooter({
  creditBalance,
  onOpenSettings,
}: CaseSidebarUserFooterProps) {
  const { t } = useTranslation()
  const { signOut, isConfigured } = useAuth()
  const displayName = useAccountDisplayName()
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)

  const creditsTooltip = t('creditsRemaining').replace('{balance}', String(creditBalance))

  return (
    <footer className="case-sidebar-user-footer">
      <span className="case-sidebar-user-footer__name">{displayName}</span>

      <div className="case-sidebar-user-footer__actions">
        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => setCreditsDialogOpen(true)}
          title={creditsTooltip}
          aria-label={creditsTooltip}
        >
          <span className="case-sidebar-user-footer__euro-symbol" aria-hidden>
            €
          </span>
        </button>

        <NotificationBell
          creditBalance={creditBalance}
          buttonClassName={ACTION_BTN}
          wrapClassName="case-sidebar-user-footer__notif-wrap"
          openClassName={`${ACTION_BTN}--open`}
        />

        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => onOpenSettings('appearance')}
          title={t('settings')}
          aria-label={t('settings')}
        >
          <Settings strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          className={ACTION_BTN}
          onClick={() => {
            if (!isConfigured) return
            void signOut().then(() => {
              window.location.href = '/'
            })
          }}
          title={t('logout')}
          aria-label={t('logout')}
        >
          <LogOut strokeWidth={1.75} aria-hidden />
        </button>
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
    </footer>
  )
}

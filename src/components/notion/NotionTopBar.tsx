import { LogOut, Plus, Settings, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { IconButton } from '../IconButton'
import { CreditsPurchaseDialog } from './CreditsPurchaseDialog'

interface NotionTopBarProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
  onNavigateDashboard?: () => void
  onNewPatient?: () => void
  newPatientDisabled?: boolean
  newPatientDisabledTooltip?: string
}

export function NotionTopBar({
  creditBalance,
  onOpenSettings,
  onNavigateDashboard,
  onNewPatient,
  newPatientDisabled = false,
  newPatientDisabledTooltip,
}: NotionTopBarProps) {
  const { t } = useTranslation()
  const displayName = useAccountDisplayName()
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)

  return (
    <header className="notion-topbar" data-lottie-exclusion>
      <div className="notion-topbar__left">
        <AppLogo onClick={onNavigateDashboard} />
        {onNavigateDashboard ? (
          <div className="notion-topbar__nav-group">
            <button
              type="button"
              className={
                newPatientDisabled
                  ? 'notion-topbar__new-patient notion-topbar__new-patient--disabled'
                  : 'notion-topbar__new-patient'
              }
              onClick={newPatientDisabled ? undefined : onNewPatient}
              disabled={newPatientDisabled}
              title={newPatientDisabled ? newPatientDisabledTooltip : t('notionNewPatient')}
              aria-label={t('notionNewPatient')}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t('notionNewPatient')}
            </button>
          </div>
        ) : null}
      </div>

      <div className="notion-topbar__right">
        <button
          type="button"
          className={
            creditBalance >= 50
              ? 'notion-topbar__credits notion-topbar__credits--ok'
              : 'notion-topbar__credits notion-topbar__credits--low'
          }
          onClick={() => setCreditsDialogOpen(true)}
          title={t('creditBalance')}
          aria-label={t('creditsAddLabel')}
        >
          {t('creditBalanceAmount').replace('{balance}', String(creditBalance))}
        </button>

        <span className="notion-topbar__user">{displayName}</span>

        <div className="notion-topbar__actions">
          <IconButton
            bordered
            icon={<Settings strokeWidth={1.5} />}
            label={t('settings')}
            onClick={() => onOpenSettings('appearance')}
          />
          <IconButton
            bordered
            icon={<User strokeWidth={1.5} />}
            label={t('myAccount')}
            onClick={() => onOpenSettings('account')}
          />
          <IconButton
            bordered
            icon={<LogOut strokeWidth={1.5} />}
            label={t('logout')}
          />
        </div>
      </div>

      {creditsDialogOpen ? <CreditsPurchaseDialog onClose={() => setCreditsDialogOpen(false)} /> : null}
    </header>
  )
}

import { LogOut, Settings, Sparkles } from 'lucide-react'

import { useTranslation } from '../context/TranslationContext'

import type { SettingsSectionId } from '../types/settings'

import { AppLogo } from './AppLogo'
import { IconButton } from './IconButton'

const CURRENT_USER_NAME = 'Nathan Narayan'

interface TopBarProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
}

export function TopBar({ creditBalance, onOpenSettings }: TopBarProps) {
  const { t } = useTranslation()

  return (
    <header
      className="glass-header relative z-20 flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-3 sm:px-4 sm:py-3.5"
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <AppLogo />
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <span
          className="credit-badge shrink-0 font-mono text-[12px] text-ink sm:text-xs"
          title={t('creditBalance')}
        >
          <Sparkles className="h-3 w-3 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          {t('creditBalanceAmount').replace('{balance}', String(creditBalance))}
        </span>

        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:inline sm:max-w-none">
          {CURRENT_USER_NAME}
        </span>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
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
          />
        </div>
      </div>
    </header>
  )
}

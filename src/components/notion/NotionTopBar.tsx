import { Bell, LogOut, Settings, User, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import {
  addNotification,
  clearAll,
  dismissNotification,
  markAllRead,
  useNotifications,
} from '../../hooks/useNotifications'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { IconButton } from '../IconButton'
import { CreditsPurchaseDialog } from './CreditsPurchaseDialog'

interface NotionTopBarProps {
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
  onNavigateDashboard?: () => void
}

// Session-level flag to fire the low-credit notification only once
let _lowCreditNotified = false

import { formatNotificationTime } from '../../utils/siteTimezone'

function notifIcon(type: string): string {
  switch (type) {
    case 'credits-low':
      return '€'
    case 'pomodoro-done':
      return '🍅'
    case 'warning':
      return '⚠️'
    default:
      return 'ℹ️'
  }
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
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount } = useNotifications()

  // Fire low-credit notification once per session
  useEffect(() => {
    if (!_lowCreditNotified && creditBalance < 50) {
      _lowCreditNotified = true
      addNotification(
        'credits-low',
        t('notificationCreditsLow').replace('{balance}', String(creditBalance)),
      )
    }
  }, [creditBalance, t])

  // Close notification popover on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  const handleBellClick = useCallback(() => {
    setNotifOpen(prev => {
      if (!prev) markAllRead()
      return !prev
    })
  }, [])

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

            {/* Notification bell */}
            <div className="notion-topbar__notif-wrap" ref={notifRef}>
              <button
                type="button"
                className={`notion-topbar__notif-btn${notifOpen ? ' notion-topbar__notif-btn--open' : ''}`}
                onClick={handleBellClick}
                aria-label={t('notificationsTitle')}
                title={t('notificationsTitle')}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                  <Bell strokeWidth={1.5} aria-hidden />
                </span>
                {unreadCount > 0 ? (
                  <span className="notion-topbar__notif-badge" aria-hidden>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="notion-topbar__notif-popover" role="dialog" aria-label={t('notificationsTitle')}>
                  <div className="notion-topbar__notif-header">
                    <span className="notion-topbar__notif-title">{t('notificationsTitle')}</span>
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        className="notion-topbar__notif-clear"
                        onClick={() => { clearAll(); setNotifOpen(false) }}
                      >
                        {t('notificationsClearAll')}
                      </button>
                    ) : null}
                  </div>

                  {notifications.length === 0 ? (
                    <p className="notion-topbar__notif-empty">{t('notificationsEmpty')}</p>
                  ) : (
                    <ul className="notion-topbar__notif-list" role="list">
                      {notifications.map(n => (
                        <li key={n.id} className={`notion-topbar__notif-item${n.read ? ' notion-topbar__notif-item--read' : ''}`}>
                          <span className="notion-topbar__notif-icon" aria-hidden>{notifIcon(n.type)}</span>
                          <div className="notion-topbar__notif-body">
                            <span className="notion-topbar__notif-msg">{n.message}</span>
                            <span className="notion-topbar__notif-time">{formatNotificationTime(n.timestamp)}</span>
                          </div>
                          <button
                            type="button"
                            className="notion-topbar__notif-dismiss"
                            onClick={() => dismissNotification(n.id)}
                            aria-label="Schließen"
                          >
                            <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

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

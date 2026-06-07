import { Bell, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import {
  addNotification,
  clearAll,
  dismissNotification,
  markAllRead,
  useNotifications,
} from '../hooks/useNotifications'
import { formatNotificationTime } from '../utils/siteTimezone'

let _lowCreditNotified = false

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

interface NotificationBellProps {
  creditBalance?: number
  buttonClassName?: string
  wrapClassName?: string
}

export function NotificationBell({
  creditBalance,
  buttonClassName = 'notion-topbar__notif-btn',
  wrapClassName = 'notion-topbar__notif-wrap',
}: NotificationBellProps) {
  const { t } = useTranslation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount } = useNotifications()

  useEffect(() => {
    if (creditBalance === undefined || _lowCreditNotified || creditBalance >= 50) return
    _lowCreditNotified = true
    addNotification(
      'credits-low',
      t('notificationCreditsLow').replace('{balance}', String(creditBalance)),
    )
  }, [creditBalance, t])

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
    setNotifOpen((prev) => {
      if (!prev) markAllRead()
      return !prev
    })
  }, [])

  return (
    <div className={wrapClassName} ref={notifRef}>
      <button
        type="button"
        className={`${buttonClassName}${notifOpen ? ' notion-topbar__notif-btn--open' : ''}`}
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
                onClick={() => {
                  clearAll()
                  setNotifOpen(false)
                }}
              >
                {t('notificationsClearAll')}
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="notion-topbar__notif-empty">{t('notificationsEmpty')}</p>
          ) : (
            <ul className="notion-topbar__notif-list" role="list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notion-topbar__notif-item${n.read ? ' notion-topbar__notif-item--read' : ''}`}
                >
                  <span className="notion-topbar__notif-icon" aria-hidden>
                    {notifIcon(n.type)}
                  </span>
                  <div className="notion-topbar__notif-body">
                    <span className="notion-topbar__notif-msg">{n.message}</span>
                    <span className="notion-topbar__notif-time">{formatNotificationTime(n.timestamp)}</span>
                  </div>
                  <button
                    type="button"
                    className="notion-topbar__notif-dismiss"
                    onClick={() => dismissNotification(n.id)}
                    aria-label={t('settingsClose')}
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
  )
}

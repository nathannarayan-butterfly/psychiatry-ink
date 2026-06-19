import { Bell, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  openClassName?: string
}

export function NotificationBell({
  creditBalance,
  buttonClassName = 'notion-topbar__notif-btn',
  wrapClassName = 'notion-topbar__notif-wrap',
  openClassName = 'notion-topbar__notif-btn--open',
}: NotificationBellProps) {
  const { t } = useTranslation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
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
      const target = e.target as Node
      const inWrap = notifRef.current?.contains(target)
      const inPopover = popoverRef.current?.contains(target)
      if (!inWrap && !inPopover) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  // The popover is rendered in a portal and positioned with viewport-aware
  // fixed coordinates so it always opens into the visible area, regardless of
  // where the bell lives (e.g. the bottom-left case sidebar) and without being
  // clipped by an ancestor's `overflow: hidden`.
  useLayoutEffect(() => {
    if (!notifOpen) {
      setCoords(null)
      return
    }

    function computePosition() {
      const wrap = notifRef.current
      const pop = popoverRef.current
      if (!wrap || !pop) return

      const rect = wrap.getBoundingClientRect()
      const popW = pop.offsetWidth
      const popH = pop.offsetHeight
      const gap = 8
      const margin = 8
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Horizontal: prefer aligning the popover's left edge to the bell's left
      // (expands rightward into the content area). Flip to right-align if that
      // would overflow the viewport, then clamp to stay on-screen.
      let left = rect.left
      if (left + popW + margin > vw) {
        left = rect.right - popW
      }
      left = Math.min(Math.max(left, margin), Math.max(margin, vw - popW - margin))

      // Vertical: open downward when there's room below the bell, otherwise
      // open upward (e.g. when the bell is pinned to the bottom of the sidebar).
      const spaceBelow = vh - rect.bottom
      const spaceAbove = rect.top
      let top: number
      if (spaceBelow >= popH + gap + margin || spaceBelow >= spaceAbove) {
        top = rect.bottom + gap
      } else {
        top = rect.top - gap - popH
      }
      top = Math.min(Math.max(top, margin), Math.max(margin, vh - popH - margin))

      setCoords({ top, left })
    }

    computePosition()
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, true)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, true)
    }
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
        className={`${buttonClassName}${notifOpen ? ` ${openClassName}` : ''}`}
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

      {notifOpen
        ? createPortal(
            <div
              ref={popoverRef}
              className="notion-topbar__notif-popover"
              role="dialog"
              aria-label={t('notificationsTitle')}
              style={{
                position: 'fixed',
                top: coords ? `${coords.top}px` : 0,
                left: coords ? `${coords.left}px` : 0,
                right: 'auto',
                bottom: 'auto',
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

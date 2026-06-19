import { useEffect, useReducer } from 'react'

export type NotificationType = 'credits-low' | 'info' | 'warning'

export interface AppNotification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
  read: boolean
}

// Module-level in-memory session store — no persistence across page reloads
const _store: AppNotification[] = []
const _listeners = new Set<() => void>()

function _emit(): void {
  _listeners.forEach(fn => fn())
}

export function addNotification(type: NotificationType, message: string): void {
  _store.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
    timestamp: Date.now(),
    read: false,
  })
  _emit()
}

export function dismissNotification(id: string): void {
  const idx = _store.findIndex(n => n.id === id)
  if (idx !== -1) {
    _store.splice(idx, 1)
    _emit()
  }
}

export function clearAll(): void {
  _store.length = 0
  _emit()
}

export function markAllRead(): void {
  _store.forEach(n => {
    n.read = true
  })
  _emit()
}

export function useNotifications() {
  const [, rerender] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    _listeners.add(rerender)
    return () => {
      _listeners.delete(rerender)
    }
  }, [])

  const unreadCount = _store.filter(n => !n.read).length

  return {
    notifications: [..._store].reverse(), // newest first
    unreadCount,
    addNotification,
    dismissNotification,
    clearAll,
    markAllRead,
  }
}

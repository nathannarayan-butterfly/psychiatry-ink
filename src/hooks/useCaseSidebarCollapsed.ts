import { useCallback, useEffect, useState } from 'react'

/**
 * Persists whether the global case left sidebar is fully hidden (floating
 * expand control only) vs expanded. State lives in `localStorage` so the
 * choice survives navigation, hard refreshes, and case switches; the `storage`
 * event keeps other tabs in the same browser session in sync without prop
 * drilling.
 */
const STORAGE_KEY = 'psychiatryink:case-sidebar-collapsed'

function readInitial(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writePersisted(next: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    /* noop — persistence is best-effort (private mode, quota, etc.) */
  }
}

export function useCaseSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial)

  const setAndPersist = useCallback((next: boolean) => {
    setCollapsed(next)
    writePersisted(next)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      writePersisted(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      setCollapsed(event.newValue === '1')
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return { collapsed, setCollapsed: setAndPersist, toggle }
}

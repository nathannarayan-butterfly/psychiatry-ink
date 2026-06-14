import { useCallback, useEffect, useState } from 'react'
import {
  KB_ADMIN_USERS_STORAGE_KEY,
  readLocalKbAdminAllowlist,
  writeLocalKbAdminAllowlist,
} from '../utils/kbAdminAccess'

export function useKbAdminUsersSettings() {
  const [allowlist, setAllowlist] = useState<string[]>(() => readLocalKbAdminAllowlist())

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === KB_ADMIN_USERS_STORAGE_KEY) {
        setAllowlist(readLocalKbAdminAllowlist())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setAllowlistEntries = useCallback((entries: string[]) => {
    writeLocalKbAdminAllowlist(entries)
    setAllowlist(readLocalKbAdminAllowlist())
  }, [])

  const addEntry = useCallback(
    (entry: string) => {
      const trimmed = entry.trim()
      if (!trimmed) return
      const next = [...new Set([...allowlist, trimmed])]
      setAllowlistEntries(next)
    },
    [allowlist, setAllowlistEntries],
  )

  const removeEntry = useCallback(
    (entry: string) => {
      setAllowlistEntries(allowlist.filter((item) => item !== entry))
    },
    [allowlist, setAllowlistEntries],
  )

  return { allowlist, addEntry, removeEntry, setAllowlistEntries }
}

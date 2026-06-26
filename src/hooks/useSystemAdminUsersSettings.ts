import { useCallback, useEffect, useState } from 'react'
import {
  SYSTEM_ADMIN_USERS_STORAGE_KEY,
  readLocalSystemAdminAllowlist,
  writeLocalSystemAdminAllowlist,
} from '../utils/kbAdminAccess'

export function useSystemAdminUsersSettings() {
  const [allowlist, setAllowlist] = useState<string[]>(() => readLocalSystemAdminAllowlist())

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SYSTEM_ADMIN_USERS_STORAGE_KEY) {
        setAllowlist(readLocalSystemAdminAllowlist())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setAllowlistEntries = useCallback((entries: string[]) => {
    writeLocalSystemAdminAllowlist(entries)
    setAllowlist(readLocalSystemAdminAllowlist())
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

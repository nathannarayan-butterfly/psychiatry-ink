import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CalendarItem } from '../types/calendar'
import { useCalendarItem } from '../hooks/useCalendar'

interface ActiveAppointmentContextValue {
  activeAppointmentId: string | null
  setActiveAppointmentId: (id: string | null) => void
  activeAppointment: CalendarItem | null
  loading: boolean
}

const ActiveAppointmentContext = createContext<ActiveAppointmentContextValue | null>(null)

const SESSION_KEY = 'psychiatry-ink:active-appointment'

export function ActiveAppointmentProvider({ children }: { children: ReactNode }) {
  const [activeAppointmentId, setActiveAppointmentIdState] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      return raw?.trim() || null
    } catch {
      return null
    }
  })

  const setActiveAppointmentId = useCallback((id: string | null) => {
    setActiveAppointmentIdState(id)
    try {
      if (id) sessionStorage.setItem(SESSION_KEY, id)
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
  }, [])

  const { item: activeAppointment, loading } = useCalendarItem(activeAppointmentId)

  const value = useMemo(
    () => ({
      activeAppointmentId,
      setActiveAppointmentId,
      activeAppointment,
      loading,
    }),
    [activeAppointmentId, setActiveAppointmentId, activeAppointment, loading],
  )

  return (
    <ActiveAppointmentContext.Provider value={value}>{children}</ActiveAppointmentContext.Provider>
  )
}

export function useActiveAppointment(): ActiveAppointmentContextValue {
  const ctx = useContext(ActiveAppointmentContext)
  if (!ctx) {
    throw new Error('useActiveAppointment must be used within ActiveAppointmentProvider')
  }
  return ctx
}

/** Sync appointment id from URL ?appointment= param */
export function useSyncAppointmentFromUrl(search: string) {
  const { setActiveAppointmentId, activeAppointmentId } = useActiveAppointment()
  useEffect(() => {
    const param = new URLSearchParams(search).get('appointment')?.trim()
    if (param && param !== activeAppointmentId) {
      setActiveAppointmentId(param)
    }
  }, [search, activeAppointmentId, setActiveAppointmentId])
}

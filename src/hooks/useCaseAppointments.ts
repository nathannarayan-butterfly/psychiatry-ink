import { useMemo } from 'react'
import { useCalendar } from './useCalendar'
import type { CalendarItem } from '../types/calendar'

export interface CaseAppointments {
  upcoming: CalendarItem[]
  past: CalendarItem[]
  next: CalendarItem | null
  lastContact: CalendarItem | null
  loading: boolean
}

/**
 * Patient-scoped view over the (user/org-scoped) calendar. The calendar API is
 * not scoped by caseId, so we fetch a wide window once and filter client-side
 * on `item.caseId` — mirroring the pattern used elsewhere in the app.
 */
export function useCaseAppointments(caseId: string): CaseAppointments {
  const range = useMemo(() => {
    const now = Date.now()
    const year = 365 * 24 * 60 * 60 * 1000
    return {
      from: new Date(now - year).toISOString(),
      to: new Date(now + year).toISOString(),
    }
  }, [])

  const { items, loading } = useCalendar(range)

  return useMemo(() => {
    const now = Date.now()
    const mine = items.filter((item) => item.caseId === caseId && item.status !== 'cancelled')

    const upcoming = mine
      .filter(
        (item) =>
          item.status === 'scheduled' && new Date(item.startTime).getTime() >= now,
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const past = mine
      .filter(
        (item) =>
          item.status === 'completed' || new Date(item.endTime).getTime() < now,
      )
      .sort((a, b) => b.endTime.localeCompare(a.endTime))

    return {
      upcoming,
      past,
      next: upcoming[0] ?? null,
      lastContact: past[0] ?? null,
      loading,
    }
  }, [items, caseId, loading])
}

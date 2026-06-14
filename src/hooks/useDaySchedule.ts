import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import type { CalendarItem } from '../types/calendar'
import { endOfDayIso, isSameDay, startOfDayIso } from '../utils/calendarLabels'
import { useCalendar } from './useCalendar'

const ACTIVE_STATUSES = new Set(['scheduled', 'in_progress', 'completed'])

export function useDaySchedule(selectedDate: Date = new Date()) {
  const { user } = useAuth()

  const filters = useMemo(
    () => ({
      from: startOfDayIso(selectedDate),
      to: endOfDayIso(selectedDate),
      assignedUserId: user?.id,
    }),
    [selectedDate, user?.id],
  )

  const { items, loading, error, reload, complete, reschedule, cancel } = useCalendar(filters)

  const dayItems = useMemo(
    () =>
      items
        .filter((item) => isSameDay(new Date(item.startTime), selectedDate))
        .filter((item) => ACTIVE_STATUSES.has(item.status) || item.status === 'cancelled' || item.status === 'no_show')
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [items, selectedDate],
  )

  const nextScheduled = useMemo((): CalendarItem | null => {
    const now = Date.now()
    return (
      dayItems.find(
        (item) =>
          item.status === 'scheduled' &&
          item.assignedUserId === user?.id &&
          new Date(item.startTime).getTime() >= now,
      ) ??
      dayItems.find((item) => item.status === 'scheduled' && item.assignedUserId === user?.id) ??
      null
    )
  }, [dayItems, user?.id])

  return {
    items: dayItems,
    loading,
    error,
    reload,
    complete,
    reschedule,
    cancel,
    nextScheduled,
  }
}

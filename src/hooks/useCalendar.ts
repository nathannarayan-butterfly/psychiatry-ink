import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CalendarItem,
  CalendarListFilters,
  CreateCalendarItemInput,
  RescheduleCalendarInput,
  UpdateCalendarItemInput,
} from '../types/calendar'
import {
  cancelCalendarItemApi,
  completeCalendarItemApi,
  createCalendarItemApi,
  listCalendarItemsApi,
  rescheduleCalendarItemApi,
  updateCalendarItemApi,
} from '../services/calendarApi'
import { CALENDAR_CHANGED_EVENT } from '../utils/calendarStore'
import { useCalendarScope } from './useCalendarScope'

export function useCalendar(filters: CalendarListFilters) {
  const scope = useCalendarScope()
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listCalendarItemsApi(scope, filters)
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kalender konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [filters.from, filters.to, filters.assignedUserId, scope])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onChange = () => void reload()
    window.addEventListener(CALENDAR_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CALENDAR_CHANGED_EVENT, onChange)
  }, [reload])

  const create = useCallback(
    async (input: CreateCalendarItemInput) => {
      const item = await createCalendarItemApi(scope, input)
      await reload()
      return item
    },
    [reload, scope],
  )

  const update = useCallback(
    async (id: string, input: UpdateCalendarItemInput) => {
      const item = await updateCalendarItemApi(scope, id, input)
      await reload()
      return item
    },
    [reload, scope],
  )

  const reschedule = useCallback(
    async (id: string, input: RescheduleCalendarInput) => {
      const item = await rescheduleCalendarItemApi(scope, id, input)
      await reload()
      return item
    },
    [reload, scope],
  )

  const complete = useCallback(
    async (id: string) => {
      const item = await completeCalendarItemApi(scope, id)
      await reload()
      return item
    },
    [reload, scope],
  )

  const cancel = useCallback(
    async (id: string) => {
      const item = await cancelCalendarItemApi(scope, id)
      await reload()
      return item
    },
    [reload, scope],
  )

  return useMemo(
    () => ({ items, loading, error, reload, create, update, reschedule, complete, cancel }),
    [items, loading, error, reload, create, update, reschedule, complete, cancel],
  )
}

export function useCalendarItem(itemId: string | null | undefined, dayRange?: CalendarListFilters) {
  const range = dayRange ?? {
    from: new Date(0).toISOString(),
    to: new Date('2099-12-31').toISOString(),
  }
  const { items, loading } = useCalendar(range)
  const item = useMemo(
    () => (itemId ? items.find((entry) => entry.id === itemId) ?? null : null),
    [items, itemId],
  )
  return { item, loading }
}

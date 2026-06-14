import { useCallback } from 'react'
import type { CalendarItem } from '../types/calendar'
import { endOfDayIso, isSameDay, startOfDayIso } from '../utils/calendarLabels'
import { completeCalendarItemApi, listCalendarItemsApi } from '../services/calendarApi'
import { useCalendarScope } from './useCalendarScope'

interface NextPatientWorkflowOptions {
  onNavigateToCase: (caseId: string, appointmentId: string) => void
  setActiveAppointmentId: (id: string | null) => void
}

export function useNextPatientWorkflow({
  onNavigateToCase,
  setActiveAppointmentId,
}: NextPatientWorkflowOptions) {
  const scope = useCalendarScope()

  const completeAndGoToNext = useCallback(
    async (currentItem: CalendarItem) => {
      const day = new Date(currentItem.startTime)
      const filters = {
        from: startOfDayIso(day),
        to: endOfDayIso(day),
        assignedUserId: scope.userId,
      }

      await completeCalendarItemApi(scope, currentItem.id)

      const items = await listCalendarItemsApi(scope, filters)

      const next = items
        .filter(
          (item) =>
            item.id !== currentItem.id &&
            item.status === 'scheduled' &&
            item.assignedUserId === scope.userId &&
            isSameDay(new Date(item.startTime), day),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

      if (next?.caseId) {
        setActiveAppointmentId(next.id)
        onNavigateToCase(next.caseId, next.id)
      } else {
        setActiveAppointmentId(null)
      }

      return next ?? null
    },
    [onNavigateToCase, scope, setActiveAppointmentId],
  )

  return { completeAndGoToNext }
}

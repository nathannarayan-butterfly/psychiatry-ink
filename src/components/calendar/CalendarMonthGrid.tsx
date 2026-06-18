import { useMemo } from 'react'
import type { CalendarItem } from '../../types/calendar'
import {
  dayKey,
  getMonthGridCells,
  getMonthStart,
  isSameDay,
} from '../../utils/calendarLabels'

interface CalendarMonthGridProps {
  monthAnchor: Date
  items: CalendarItem[]
  variant: 'main' | 'mini'
  selectedDay: Date
  today: Date
  onSelectDay: (day: Date) => void
  weekdayLabels: string[]
  monthLabel?: string
  ariaLabel: string
}

export function CalendarMonthGrid({
  monthAnchor,
  items,
  variant,
  selectedDay,
  today,
  onSelectDay,
  weekdayLabels,
  monthLabel,
  ariaLabel,
}: CalendarMonthGridProps) {
  const cells = useMemo(() => getMonthGridCells(monthAnchor), [monthAnchor])
  const monthStart = getMonthStart(monthAnchor)

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const d = new Date(item.startTime)
      const key = dayKey(d)
      const list = map.get(key)
      if (list) list.push(item)
      else map.set(key, [item])
    }
    return map
  }, [items])

  const isMini = variant === 'mini'

  return (
    <div
      className={`calendar-month-view calendar-month-view--${variant}`}
      role="grid"
      aria-label={ariaLabel}
    >
      {monthLabel ? (
        <p className="calendar-month-view__label">{monthLabel}</p>
      ) : null}
      <div className="calendar-month-view__weekdays" role="row">
        {weekdayLabels.map((label) => (
          <span key={label} className="calendar-month-view__weekday" role="columnheader">
            {label}
          </span>
        ))}
      </div>
      <div className="calendar-month-view__cells">
        {cells.map((day) => {
          const inMonth = day.getMonth() === monthStart.getMonth()
          const dayItems = itemsByDay.get(dayKey(day)) ?? []
          const activeCount = dayItems.filter(
            (item) => item.status !== 'cancelled' && item.status !== 'no_show',
          ).length
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDay)

          return (
            <button
              key={day.toISOString()}
              type="button"
              role="gridcell"
              className={[
                'calendar-month-view__cell',
                inMonth ? '' : 'calendar-month-view__cell--outside',
                isToday ? 'calendar-month-view__cell--today' : '',
                isSelected ? 'calendar-month-view__cell--selected' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => onSelectDay(day)}
              aria-label={day.toLocaleDateString()}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
            >
              <span className="calendar-month-view__day">{day.getDate()}</span>
              {!isMini && activeCount > 0 ? (
                <span className="calendar-month-view__events" aria-hidden>
                  {dayItems.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={`calendar-month-view__dot calendar-type--${item.type}`}
                    />
                  ))}
                  {activeCount > 3 ? (
                    <span className="calendar-month-view__count">+{activeCount - 3}</span>
                  ) : null}
                </span>
              ) : null}
              {isMini && activeCount > 0 ? (
                <span className="calendar-month-view__mini-dot" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

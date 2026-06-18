import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import type { CalendarItem } from '../../types/calendar'
import {
  addDays,
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  formatCalendarTime,
  formatDayHeader,
  isSameDay,
  localeForUiLanguage,
  statusDotClass,
  typeAccentClass,
} from '../../utils/calendarLabels'

interface CalendarSidePanelsProps {
  items: CalendarItem[]
  selectedDay: Date
  today: Date
  cases: DashboardCase[]
  onSelectDay: (day: Date) => void
  onQuickAdd: () => void
  onOpenCase?: (caseId: string, appointmentId?: string) => void
}

function resolvePatientName(cases: DashboardCase[], caseId?: string): string {
  if (!caseId) return '—'
  return cases.find((c) => c.caseId === caseId)?.displayTitle ?? caseId.slice(0, 8)
}

export function CalendarSidePanels({
  items,
  selectedDay,
  today,
  cases,
  onSelectDay,
  onQuickAdd,
  onOpenCase,
}: CalendarSidePanelsProps) {
  const { language, t } = useTranslation()
  const locale = localeForUiLanguage(language)

  const selectedDayItems = useMemo(
    () =>
      items
        .filter((item) => isSameDay(new Date(item.startTime), selectedDay))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [items, selectedDay],
  )

  const todayItems = useMemo(
    () =>
      items
        .filter((item) => isSameDay(new Date(item.startTime), today))
        .filter((item) => item.status !== 'cancelled' && item.status !== 'no_show')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [items, today],
  )

  const upcomingStrip = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i)
      const dayItems = items
        .filter((item) => isSameDay(new Date(item.startTime), day))
        .filter((item) => item.status !== 'cancelled' && item.status !== 'no_show')
      return { day, count: dayItems.length, first: dayItems[0] ?? null }
    })
  }, [items, today])

  const nextTodayAppointment = useMemo(() => {
    const now = Date.now()
    return todayItems.find((item) => new Date(item.startTime).getTime() >= now) ?? todayItems[0] ?? null
  }, [todayItems])

  const selectedLabel = formatDayHeader(selectedDay, locale)

  return (
    <aside className="calendar-side-panels" aria-label={t('calendarSidePanelsLabel')}>
      <section className="calendar-side-panel cm-section">
        <div className="calendar-side-panel__head">
          <span className="cm-eyebrow">{t('calendarTodaySummary')}</span>
        </div>
        <div className="calendar-side-panel__body">
          <p className="calendar-side-panel__stat">
            <span className="calendar-side-panel__stat-value">{todayItems.length}</span>
            <span className="calendar-side-panel__stat-label">{t('calendarSessionsToday')}</span>
          </p>
          {nextTodayAppointment ? (
            <p className="calendar-side-panel__next">
              <span className="calendar-side-panel__next-label">{t('calendarNextUp')}</span>
              <span className="calendar-side-panel__next-time">
                {formatCalendarTime(nextTodayAppointment.startTime)}
              </span>
              <span className="calendar-side-panel__next-title">{nextTodayAppointment.title}</span>
            </p>
          ) : (
            <p className="clinical-empty-state clinical-empty-state--compact">{t('calendarNoSessionsToday')}</p>
          )}
        </div>
      </section>

      <section className="calendar-side-panel cm-section">
        <div className="calendar-side-panel__head">
          <span className="cm-eyebrow">{t('calendarUpcomingWeek')}</span>
        </div>
        <ul className="calendar-upcoming-strip">
          {upcomingStrip.map(({ day, count, first }) => {
            const isToday = isSameDay(day, today)
            const isSelected = isSameDay(day, selectedDay)
            return (
              <li key={day.toISOString()}>
                <button
                  type="button"
                  className={[
                    'calendar-upcoming-strip__day',
                    isToday ? 'calendar-upcoming-strip__day--today' : '',
                    isSelected ? 'calendar-upcoming-strip__day--selected' : '',
                  ]
                    .join(' ')
                    .trim()}
                  onClick={() => onSelectDay(day)}
                >
                  <span className="calendar-upcoming-strip__weekday">
                    {day.toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <span className="calendar-upcoming-strip__date">{day.getDate()}</span>
                  <span className="calendar-upcoming-strip__count">
                    {count > 0 ? count : '·'}
                  </span>
                  {first ? (
                    <span className="calendar-upcoming-strip__hint">{formatCalendarTime(first.startTime)}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="calendar-side-panel cm-section">
        <div className="calendar-side-panel__head">
          <span className="cm-eyebrow">{t('calendarDayAgenda')}</span>
          <button type="button" className="cm-section__action" onClick={onQuickAdd}>
            <Plus className="h-3 w-3" aria-hidden />
            {t('calendarQuickAdd')}
          </button>
        </div>
        <p className="calendar-side-panel__date-label">{selectedLabel}</p>
        {selectedDayItems.length === 0 ? (
          <p className="clinical-empty-state clinical-empty-state--compact">{t('calendarNoAppointmentsDay')}</p>
        ) : (
          <ul className="calendar-agenda-list">
            {selectedDayItems.map((item) => (
              <li
                key={item.id}
                className={`calendar-agenda-row calendar-agenda-row--${item.status} ${typeAccentClass(item.type)}`}
              >
                <span className={`calendar-status-dot ${statusDotClass(item.status)}`} aria-hidden />
                <span className="calendar-agenda-row__time">{formatCalendarTime(item.startTime)}</span>
                <span className="calendar-agenda-row__title">{item.title}</span>
                <span className="calendar-agenda-row__meta">
                  <span className="calendar-type-badge">{CALENDAR_TYPE_LABELS[item.type]}</span>
                  {item.caseId ? ` · ${resolvePatientName(cases, item.caseId)}` : ''}
                </span>
                <span className="calendar-agenda-row__status">{CALENDAR_STATUS_LABELS[item.status]}</span>
                {item.caseId && onOpenCase ? (
                  <button
                    type="button"
                    className="calendar-btn calendar-btn--xs"
                    onClick={() => onOpenCase(item.caseId!, item.id)}
                  >
                    {t('calendarOpenCase')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

import { Calendar, Check, ChevronLeft, ChevronRight, ListTodo, Printer } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { useDaySchedule } from '../../hooks/useDaySchedule'
import { useNextPatientWorkflow } from '../../hooks/useNextPatientWorkflow'
import { useActiveAppointment } from '../../contexts/ActiveAppointmentContext'
import { useTranslation } from '../../context/TranslationContext'
import { useTodos } from '../../hooks/useTodos'
import {
  CALENDAR_STATUS_LABELS,
  CALENDAR_TYPE_LABELS,
  formatCalendarTime,
  statusDotClass,
  typeAccentClass,
} from '../../utils/calendarLabels'
import { printDaySchedule } from '../../utils/calendar/printDaySchedule'
import { filterTodos, isOverdue, sortTodos } from '../../utils/todos/todoFilters'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface DaySchedulePanelProps {
  cases: DashboardCase[]
  onOpenCase: (caseId: string, appointmentId?: string) => void
}

function resolvePatientName(cases: DashboardCase[], caseId?: string): string {
  if (!caseId) return 'Ohne Patient'
  return cases.find((c) => c.caseId === caseId)?.displayTitle ?? caseId.slice(0, 8)
}

export function DaySchedulePanel({ cases, onOpenCase }: DaySchedulePanelProps) {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [printIncludeNotes, setPrintIncludeNotes] = useState(false)
  const { items, loading, error, complete } = useDaySchedule(selectedDate)
  const { todos, toggle, loading: todosLoading } = useTodos()
  const { setActiveAppointmentId } = useActiveAppointment()

  const { completeAndGoToNext } = useNextPatientWorkflow({
    setActiveAppointmentId,
    onNavigateToCase: (caseId, appointmentId) => onOpenCase(caseId, appointmentId),
  })

  const dayTodos = useMemo(() => {
    const filtered = filterTodos(todos, { view: 'day', reference: selectedDate })
    return sortTodos(filtered)
  }, [todos, selectedDate])

  const openDayTodos = useMemo(() => dayTodos.filter((todo) => !todo.done), [dayTodos])

  const dateLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }),
    [selectedDate],
  )

  const shiftDay = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta)
      return next
    })
  }

  const handlePrint = useCallback(() => {
    printDaySchedule(items, selectedDate, {
      includeNotes: printIncludeNotes,
      resolvePatientName: (caseId) => resolvePatientName(cases, caseId),
    })
  }, [cases, items, printIncludeNotes, selectedDate])

  const scheduleLoading = loading || todosLoading
  const hasAppointments = items.length > 0
  const hasTodos = dayTodos.length > 0
  const isEmpty = !scheduleLoading && !hasAppointments && !hasTodos

  return (
    <section className="day-schedule-panel" aria-labelledby="day-schedule-title">
      <div className="day-schedule-panel__header">
        <div className="day-schedule-panel__title-row">
          <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          <h2 id="day-schedule-title" className="day-schedule-panel__title">
            Tagesplan
          </h2>
        </div>
        <div className="day-schedule-panel__nav">
          <button type="button" className="day-schedule-panel__nav-btn" onClick={() => shiftDay(-1)} aria-label="Vorheriger Tag">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="day-schedule-panel__date">{dateLabel}</span>
          <button type="button" className="day-schedule-panel__nav-btn" onClick={() => shiftDay(1)} aria-label="Nächster Tag">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!loading ? (
            <>
              <label className="calendar-print-notes-toggle">
                <input
                  type="checkbox"
                  checked={printIncludeNotes}
                  onChange={(event) => setPrintIncludeNotes(event.target.checked)}
                />
                Notizen
              </label>
              <button
                type="button"
                className="calendar-btn calendar-btn--ghost calendar-btn--xs"
                onClick={handlePrint}
                disabled={items.length === 0}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Drucken
              </button>
            </>
          ) : null}
        </div>
      </div>

      {scheduleLoading ? <ClinicalLoading variant="compact" label="Tagesplan wird geladen…" /> : null}
      {error ? <p className="clinical-muted">{error}</p> : null}

      {isEmpty ? (
        <p className="clinical-empty-state clinical-empty-state--compact">{t('dayScheduleEmpty')}</p>
      ) : null}

      {hasAppointments ? (
        <>
          <h3 className="day-schedule-panel__section-label">{t('dayScheduleSectionAppointments')}</h3>
          <ul className="day-schedule-list">
            {items.map((item) => (
              <li key={item.id} className={`day-schedule-row day-schedule-row--${item.status} ${typeAccentClass(item.type)}`}>
                <span className={`calendar-status-dot ${statusDotClass(item.status)}`} aria-hidden />
                <span className="day-schedule-row__time">{formatCalendarTime(item.startTime)}</span>
                <span className="day-schedule-row__patient">{resolvePatientName(cases, item.caseId)}</span>
                <span className="day-schedule-row__type calendar-type-badge">{CALENDAR_TYPE_LABELS[item.type]}</span>
                {item.reason ? <span className="day-schedule-row__reason">{item.reason}</span> : null}
                <span className="day-schedule-row__badge">{CALENDAR_STATUS_LABELS[item.status]}</span>
                <div className="day-schedule-row__actions">
                  {item.caseId ? (
                    <button
                      type="button"
                      className="calendar-btn calendar-btn--xs"
                      onClick={() => {
                        setActiveAppointmentId(item.id)
                        onOpenCase(item.caseId!, item.id)
                      }}
                    >
                      Fall öffnen
                    </button>
                  ) : null}
                  {item.status === 'scheduled' || item.status === 'in_progress' ? (
                    <>
                      <button type="button" className="calendar-btn calendar-btn--xs" onClick={() => void complete(item.id)}>
                        Abschließen
                      </button>
                      <button
                        type="button"
                        className="calendar-btn calendar-btn--xs calendar-btn--accent"
                        onClick={() => void completeAndGoToNext(item)}
                      >
                        Abschließen → Nächster
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {hasTodos ? (
        <>
          <h3 className="day-schedule-panel__section-label day-schedule-panel__section-label--todos">
            <ListTodo className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('dayScheduleSectionTodos')}
            {openDayTodos.length > 0 ? (
              <span className="day-schedule-panel__section-count">{openDayTodos.length}</span>
            ) : null}
          </h3>
          <ul className="day-schedule-list day-schedule-list--todos">
            {dayTodos.map((todo) => {
              const overdue = isOverdue(todo, selectedDate)
              return (
                <li
                  key={todo.id}
                  className={`day-schedule-row day-schedule-row--todo${todo.done ? ' day-schedule-row--todo-done' : ''}${overdue ? ' day-schedule-row--todo-overdue' : ''}`}
                >
                  <button
                    type="button"
                    className={`day-schedule-todo-check${todo.done ? ' day-schedule-todo-check--on' : ''}`}
                    onClick={() => void toggle(todo.id, !todo.done)}
                    aria-label={todo.done ? t('todoMarkOpen') : t('todoMarkDone')}
                  >
                    {todo.done ? <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> : null}
                  </button>
                  <span className="day-schedule-row__time day-schedule-row__time--todo">
                    {todo.dueDate ? t('todoDueDate') : t('todoNoDueDate')}
                  </span>
                  <span className="day-schedule-row__patient day-schedule-row__todo-text">{todo.text}</span>
                  {todo.patientLabel ? (
                    <span className="day-schedule-row__type calendar-type-badge">{todo.patientLabel}</span>
                  ) : null}
                  {overdue && !todo.done ? (
                    <span className="day-schedule-row__badge day-schedule-row__badge--overdue">{t('todoOverdue')}</span>
                  ) : null}
                  {todo.priority === 'high' && !todo.done ? (
                    <span className="day-schedule-row__badge">{t('todoPriorityHigh')}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </section>
  )
}

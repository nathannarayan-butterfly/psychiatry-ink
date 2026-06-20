import { ArrowLeft, ChevronLeft, ChevronRight, ListTodo, Printer } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useTodos } from '../../hooks/useTodos'
import {
  countOpenTodos,
  filterTodos,
  isOverdue,
  sortTodos,
  startOfWeek,
  toDateKey,
} from '../../utils/todos/todoFilters'
import { printTodos, type TodoPrintLabels } from '../../utils/todos/printTodos'
import type { TodoView } from '../../types/todo'
import { TodoComposer } from './TodoComposer'
import { TodoItemRow } from './TodoItemRow'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { localeForUiLanguage } from '../../utils/calendarLabels'

interface TodoPageProps {
  onBack: () => void
}

const VIEWS: { id: TodoView; labelKey: 'todoViewDay' | 'todoViewWeek' | 'todoViewOpen' | 'todoViewAll' }[] = [
  { id: 'day', labelKey: 'todoViewDay' },
  { id: 'week', labelKey: 'todoViewWeek' },
  { id: 'open', labelKey: 'todoViewOpen' },
  { id: 'all', labelKey: 'todoViewAll' },
]

function shiftDate(date: Date, deltaDays: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + deltaDays)
  return next
}

export function TodoPage({ onBack }: TodoPageProps) {
  const { t, language } = useTranslation()
  const locale = localeForUiLanguage(language)
  const [view, setView] = useState<TodoView>('day')
  const [referenceDate, setReferenceDate] = useState(() => new Date())

  const { todos, assignableMembers, loading, error, scope, create, update, toggle, remove } =
    useTodos()

  const isOrgOwner = scope.role === 'org_owner' || scope.role === 'single_owner'
  const showDateNav = view === 'day' || view === 'week'

  const visibleTodos = useMemo(() => {
    const filtered = filterTodos(todos, { view, reference: referenceDate })
    return sortTodos(filtered)
  }, [todos, view, referenceDate])

  const openCount = useMemo(() => countOpenTodos(todos), [todos])
  const todayCount = useMemo(
    () =>
      filterTodos(todos, { view: 'day', reference: new Date() }).filter((todo) => !todo.done).length,
    [todos],
  )
  const overdueCount = useMemo(
    () => todos.filter((todo) => isOverdue(todo, new Date())).length,
    [todos],
  )

  const dateLabel = useMemo(() => {
    if (view === 'day') {
      return referenceDate.toLocaleDateString(locale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: referenceDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      })
    }
    if (view === 'week') {
      const weekStart = startOfWeek(referenceDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const fmt = (d: Date) =>
        d.toLocaleDateString(locale, {
          day: '2-digit',
          month: 'short',
        })
      return `${fmt(weekStart)} – ${fmt(weekEnd)}`
    }
    return null
  }, [view, referenceDate, locale])

  const goToToday = useCallback(() => {
    setReferenceDate(new Date())
  }, [])

  const handlePrint = useCallback(() => {
    const labels: TodoPrintLabels = {
      title: `${t('todoSectionTitle')} — ${t(VIEWS.find((v) => v.id === view)!.labelKey)}`,
      generated: t('todoPrintGenerated'),
      done: t('todoMarkDone'),
      open: t('todoViewOpen'),
      dueDate: t('todoDueDate'),
      priority: t('todoPriority'),
      patient: t('todoPatient'),
      assignedTo: t('todoAssignedTo'),
      assignedBy: t('todoAssignedByLabel'),
      noDueDate: t('todoNoDueDate'),
      empty: t('todoEmpty'),
      priorityLow: t('todoPriorityLow'),
      priorityNormal: t('todoPriorityNormal'),
      priorityHigh: t('todoPriorityHigh'),
    }
    printTodos(visibleTodos, labels, { locale: language })
  }, [t, view, visibleTodos, language])

  const isToday =
    showDateNav && toDateKey(referenceDate) === toDateKey(new Date())

  return (
    <div className="todo-page cm-workspace text-ink">
      <header className="todo-page__header">
        <button type="button" className="clinical-back-link" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Dashboard
        </button>
        <div className="cm-page-eyebrow todo-page__eyebrow">
          <span className="todo-page__title-icon" aria-hidden>
            <ListTodo strokeWidth={1.75} />
          </span>
          <h1 className="cm-page-eyebrow__label">{t('todoSectionTitle')}</h1>
          <hr className="cm-page-eyebrow__rule" />
        </div>
      </header>

      <div className="todo-page__stats" aria-label={t('todoPageStatsLabel')}>
        <div className="todo-stat-pill todo-stat-pill--open">
          <span className="todo-stat-pill__value">{openCount}</span>
          <span className="todo-stat-pill__label">{t('todoViewOpen')}</span>
        </div>
        <div className="todo-stat-pill todo-stat-pill--today">
          <span className="todo-stat-pill__value">{todayCount}</span>
          <span className="todo-stat-pill__label">{t('todoViewDay')}</span>
        </div>
        <div
          className={`todo-stat-pill todo-stat-pill--overdue${
            overdueCount > 0 ? ' todo-stat-pill--overdue-active' : ''
          }`}
        >
          <span className="todo-stat-pill__value">{overdueCount}</span>
          <span className="todo-stat-pill__label">{t('todoOverdue')}</span>
        </div>
      </div>

      <div className="todo-toolbar">
        <div className="calendar-view-toggle" role="group" aria-label={t('todoSectionTitle')}>
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`calendar-view-toggle__btn${
                view === entry.id ? ' calendar-view-toggle__btn--active' : ''
              }`}
              onClick={() => setView(entry.id)}
              aria-pressed={view === entry.id}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </div>

        <div className="calendar-nav">
          {showDateNav ? (
            <>
              <button
                type="button"
                className="calendar-nav__btn"
                onClick={() => setReferenceDate((prev) => shiftDate(prev, view === 'week' ? -7 : -1))}
                aria-label={t('calendarNavBack')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="calendar-nav__label">{dateLabel}</span>
              <button
                type="button"
                className="calendar-nav__btn"
                onClick={() => setReferenceDate((prev) => shiftDate(prev, view === 'week' ? 7 : 1))}
                aria-label={t('calendarNavForward')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isToday ? (
                <button type="button" className="calendar-btn calendar-btn--ghost calendar-btn--xs" onClick={goToToday}>
                  {t('calendarToday')}
                </button>
              ) : null}
            </>
          ) : (
            <span className="todo-toolbar__view-hint">
              <ListTodo className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {visibleTodos.length} {t('todoPageEntries')}
            </span>
          )}
          {!loading ? (
            <button
              type="button"
              className="calendar-btn calendar-btn--ghost calendar-btn--xs"
              onClick={handlePrint}
              disabled={visibleTodos.length === 0}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              {t('todoPrint')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="todo-page__composer-panel">
        <TodoComposer
          assignableMembers={scope.canAssign ? assignableMembers : []}
          submitLabel={t('todoAdd')}
          onSubmit={(values) => create(values)}
          autoFocus={false}
        />
      </div>

      {loading ? <ClinicalLoading variant="compact" label={t('dashboardLoading')} /> : null}
      {error ? (
        <p className="todo-page__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && visibleTodos.length === 0 ? (
        <div className="todo-page__empty">
          <span className="todo-page__empty-icon-wrap" aria-hidden>
            <ListTodo className="todo-page__empty-icon" strokeWidth={1.5} />
          </span>
          <p className="todo-page__empty-title">{t('todoEmpty')}</p>
          <p className="todo-page__empty-hint">{t('todoAddPlaceholder')}</p>
        </div>
      ) : null}

      {!loading && visibleTodos.length > 0 ? (
        <ul className="todo-list todo-list--page" aria-label={t('todoSectionTitle')}>
          {visibleTodos.map((todo) => (
            <TodoItemRow
              key={todo.id}
              todo={todo}
              currentUserId={scope.userId}
              isOrgOwner={isOrgOwner}
              onToggle={toggle}
              onUpdate={update}
              onDelete={remove}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

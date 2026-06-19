import { ArrowRight, ListTodo } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useTodos } from '../../hooks/useTodos'
import { countOpenTodos, filterTodos, sortTodos } from '../../utils/todos/todoFilters'

interface TodoWidgetProps {
  onOpen: () => void
}

export function TodoWidget({ onOpen }: TodoWidgetProps) {
  const { t } = useTranslation()
  const { todos, loading } = useTodos()
  const today = useMemo(() => new Date(), [])

  const openCount = useMemo(() => countOpenTodos(todos), [todos])
  const todayCount = useMemo(
    () => filterTodos(todos, { view: 'day', reference: today }).filter((todo) => !todo.done).length,
    [todos, today],
  )

  const nextDueLabel = useMemo(() => {
    const open = sortTodos(todos.filter((todo) => !todo.done && todo.dueDate))
    const next = open[0]
    if (!next?.dueDate) return null
    const trimmed = next.text.trim()
    const preview = trimmed.length > 36 ? `${trimmed.slice(0, 36)}…` : trimmed
    return preview
  }, [todos])

  const subtitle = useMemo(() => {
    if (loading) return t('dashboardLoading')
    if (openCount === 0) return t('todoEmpty')
    const parts = [t('dashboardTodoCardOpen').replace('{count}', String(openCount))]
    if (todayCount > 0) {
      parts.push(t('dashboardTodoCardToday').replace('{count}', String(todayCount)))
    }
    return parts.join(' · ')
  }, [loading, openCount, todayCount, t])

  return (
    <button
      type="button"
      className="dashboard-nav-card dashboard-nav-card--todos clinical-card clinical-card--interactive"
      onClick={onOpen}
    >
      <span className="dashboard-nav-card__icon-wrap" aria-hidden>
        <ListTodo className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="dashboard-nav-card__body">
        <span className="dashboard-nav-card__title">{t('dashboardTodoCardTitle')}</span>
        <span className="dashboard-nav-card__subtitle">{subtitle}</span>
        {nextDueLabel && openCount > 0 ? (
          <span className="dashboard-nav-card__hint">{nextDueLabel}</span>
        ) : null}
      </span>
      <ArrowRight className="dashboard-nav-card__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  )
}

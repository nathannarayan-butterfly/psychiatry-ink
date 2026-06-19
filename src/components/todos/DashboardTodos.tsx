import { useMemo, useState } from 'react'
import { ListTodo, Printer } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useTodos } from '../../hooks/useTodos'
import { countOpenTodos, filterTodos, sortTodos } from '../../utils/todos/todoFilters'
import { printTodos, type TodoPrintLabels } from '../../utils/todos/printTodos'
import type { TodoView } from '../../types/todo'
import { TodoComposer } from './TodoComposer'
import { TodoItemRow } from './TodoItemRow'

const VIEWS: { id: TodoView; labelKey: 'todoViewDay' | 'todoViewWeek' | 'todoViewOpen' | 'todoViewAll' }[] = [
  { id: 'day', labelKey: 'todoViewDay' },
  { id: 'week', labelKey: 'todoViewWeek' },
  { id: 'open', labelKey: 'todoViewOpen' },
  { id: 'all', labelKey: 'todoViewAll' },
]

export function DashboardTodos() {
  const { t, language } = useTranslation()
  const { todos, assignableMembers, loading, error, scope, create, update, toggle, remove } =
    useTodos()
  const [view, setView] = useState<TodoView>('day')

  const isOrgOwner = scope.role === 'org_owner' || scope.role === 'single_owner'

  const visibleTodos = useMemo(() => {
    const filtered = filterTodos(todos, { view })
    return sortTodos(filtered)
  }, [todos, view])

  const openCount = useMemo(() => countOpenTodos(todos), [todos])

  const handlePrint = () => {
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
  }

  return (
    <section className="dashboard-section dashboard-todos" aria-labelledby="dashboard-section-todos">
      <div className="dashboard-section__header-row">
        <h2 id="dashboard-section-todos" className="dashboard-section__heading">
          <ListTodo className="dashboard-todos__heading-icon" strokeWidth={1.75} aria-hidden />
          {t('todoSectionTitle')}
          {openCount > 0 ? (
            <span className="dashboard-todos__count">{openCount}</span>
          ) : null}
        </h2>
        <div className="dashboard-todos__toolbar">
          <div className="dashboard-todos__views" role="group" aria-label={t('todoSectionTitle')}>
            {VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`dashboard-todos__view-btn${
                  view === entry.id ? ' dashboard-todos__view-btn--active' : ''
                }`}
                onClick={() => setView(entry.id)}
                aria-pressed={view === entry.id}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-action-btn"
            onClick={handlePrint}
            title={t('todoPrint')}
            aria-label={t('todoPrint')}
            disabled={visibleTodos.length === 0}
          >
            <Printer aria-hidden />
          </button>
        </div>
      </div>

      <TodoComposer
        assignableMembers={scope.canAssign ? assignableMembers : []}
        submitLabel={t('todoAdd')}
        onSubmit={(values) => create(values)}
        autoFocus={false}
      />

      {error ? (
        <p className="dashboard-page__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="dashboard-page__status">{t('dashboardLoading')}</p>
      ) : visibleTodos.length === 0 ? (
        <p className="dashboard-page__status">{t('todoEmpty')}</p>
      ) : (
        <ul className="todo-list" aria-label={t('todoSectionTitle')}>
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
      )}
    </section>
  )
}

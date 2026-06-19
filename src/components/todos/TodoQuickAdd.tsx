import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useTodos } from '../../hooks/useTodos'
import { filterTodos, sortTodos } from '../../utils/todos/todoFilters'
import { TodoComposer } from './TodoComposer'
import { TodoItemRow } from './TodoItemRow'

interface TodoQuickAddProps {
  /** Real patient case id, or null for a general (workspace) to-do. */
  caseId?: string | null
  patientLabel?: string | null
  onClose: () => void
}

export function TodoQuickAdd({ caseId, patientLabel, onClose }: TodoQuickAddProps) {
  const { t } = useTranslation()
  const { todos, assignableMembers, scope, create, update, toggle, remove } = useTodos(
    caseId ? { caseId } : {},
  )

  const isOrgOwner = scope.role === 'org_owner' || scope.role === 'single_owner'
  const linkedCaseId = caseId ?? null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const openTodos = useMemo(
    () => sortTodos(filterTodos(todos, { view: 'open' })).slice(0, 6),
    [todos],
  )

  return (
    <div className="todo-quickadd-overlay" role="presentation" onClick={onClose}>
      <div
        className="todo-quickadd"
        role="dialog"
        aria-modal="true"
        aria-label={t('todoQuickAddTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="todo-quickadd__header">
          <span className="todo-quickadd__title">{t('todoQuickAddTitle')}</span>
          <button
            type="button"
            className="todo-quickadd__close"
            onClick={onClose}
            aria-label={t('todoCancel')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <p className="todo-quickadd__context">
          {linkedCaseId && patientLabel
            ? `${t('todoPatient')}: ${patientLabel}`
            : t('todoGeneral')}
        </p>

        <TodoComposer
          assignableMembers={scope.canAssign ? assignableMembers : []}
          submitLabel={t('todoAdd')}
          onSubmit={(values) =>
            create({
              ...values,
              caseId: linkedCaseId,
              patientLabel: linkedCaseId ? patientLabel ?? null : null,
            })
          }
          compact
        />

        {openTodos.length > 0 ? (
          <ul className="todo-list todo-list--compact" aria-label={t('todoViewOpen')}>
            {openTodos.map((todo) => (
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
    </div>
  )
}

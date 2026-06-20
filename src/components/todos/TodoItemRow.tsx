import { useState } from 'react'
import { Check, Pencil, Trash2, User } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { isOverdue } from '../../utils/todos/todoFilters'
import type { CreateTodoInput, TodoWithLabels, UpdateTodoInput } from '../../types/todo'
import { TodoComposer } from './TodoComposer'

interface TodoItemRowProps {
  todo: TodoWithLabels
  currentUserId: string
  isOrgOwner: boolean
  onToggle: (id: string, done: boolean) => Promise<unknown> | void
  onUpdate: (id: string, patch: UpdateTodoInput) => Promise<unknown> | void
  onDelete: (id: string) => Promise<unknown> | void
}

export function TodoItemRow({
  todo,
  currentUserId,
  isOrgOwner,
  onToggle,
  onUpdate,
  onDelete,
}: TodoItemRowProps) {
  const { t, language } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const isOwner = todo.ownerUserId === currentUserId
  const canEditDelete = isOwner || isOrgOwner
  const overdue = isOverdue(todo, new Date())

  const priorityLabel =
    todo.priority === 'high'
      ? t('todoPriorityHigh')
      : todo.priority === 'low'
        ? t('todoPriorityLow')
        : null

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onToggle(todo.id, !todo.done)
    } finally {
      setBusy(false)
    }
  }

  const handleUpdate = async (values: CreateTodoInput) => {
    await onUpdate(todo.id, {
      text: values.text,
      dueDate: values.dueDate,
      priority: values.priority,
    } satisfies UpdateTodoInput)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="todo-item todo-item--editing">
        <TodoComposer
          initial={{
            text: todo.text,
            dueDate: todo.dueDate ?? '',
            priority: todo.priority ?? null,
          }}
          allowAssignment={false}
          submitLabel={t('todoSave')}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          compact
        />
      </li>
    )
  }

  const itemClassName = [
    'todo-item',
    todo.done && 'todo-item--done',
    !todo.done && overdue && 'todo-item--overdue',
    !todo.done && !overdue && todo.priority === 'high' && 'todo-item--prio-high',
    !todo.done && todo.priority === 'low' && 'todo-item--prio-low',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={itemClassName}>
      <button
        type="button"
        className={`todo-item__check${todo.done ? ' todo-item__check--on' : ''}`}
        onClick={handleToggle}
        disabled={busy}
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? t('todoMarkOpen') : t('todoMarkDone')}
        title={todo.done ? t('todoMarkOpen') : t('todoMarkDone')}
      >
        {todo.done ? <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> : null}
      </button>

      <div className="todo-item__body">
        <span className="todo-item__text">{todo.text}</span>
        <div className="todo-item__meta">
          {todo.dueDate ? (
            <span
              className={`todo-chip${overdue ? ' todo-chip--overdue' : ''}`}
            >
              {overdue ? `${t('todoOverdue')} · ` : ''}
              {formatSiteLocaleDate(todo.dueDate, language)}
            </span>
          ) : null}
          {priorityLabel ? (
            <span className={`todo-chip todo-chip--prio-${todo.priority}`}>{priorityLabel}</span>
          ) : null}
          {todo.patientLabel ? (
            <span className="todo-chip todo-chip--patient">
              <User className="h-3 w-3" strokeWidth={1.75} aria-hidden /> {todo.patientLabel}
            </span>
          ) : null}
          {todo.assignedTo && todo.assignedTo !== todo.ownerUserId && todo.assignedToLabel ? (
            <span className="todo-chip todo-chip--assigned">
              {t('todoAssignedTo')}: {todo.assignedToLabel}
            </span>
          ) : null}
          {todo.assignedBy && todo.assignedTo === currentUserId && todo.assignedByLabel ? (
            <span className="todo-chip todo-chip--assigned">
              {t('todoAssignedBy').replace('{name}', todo.assignedByLabel)}
            </span>
          ) : null}
        </div>
      </div>

      {canEditDelete ? (
        <div className="todo-item__actions">
          <button
            type="button"
            className="icon-action-btn"
            onClick={() => setEditing(true)}
            title={t('todoEdit')}
            aria-label={t('todoEdit')}
          >
            <Pencil aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--danger"
            onClick={() => void onDelete(todo.id)}
            title={t('todoDelete')}
            aria-label={t('todoDelete')}
          >
            <Trash2 aria-hidden />
          </button>
        </div>
      ) : null}
    </li>
  )
}

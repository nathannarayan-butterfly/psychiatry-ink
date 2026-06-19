import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { AssignableMember, CreateTodoInput, TodoPriority } from '../../types/todo'

export interface TodoComposerValues {
  text: string
  dueDate: string | null
  priority: TodoPriority | null
  assignedTo: string | null
}

interface TodoComposerProps {
  initial?: Partial<TodoComposerValues>
  assignableMembers?: AssignableMember[]
  /** When false, hides the assignment selector (e.g. when editing). */
  allowAssignment?: boolean
  submitLabel: string
  onSubmit: (values: CreateTodoInput) => Promise<unknown>
  onCancel?: () => void
  compact?: boolean
  autoFocus?: boolean
}

function memberLabel(member: AssignableMember): string {
  return member.displayName?.trim() || member.email?.trim() || member.userId.slice(0, 8)
}

export function TodoComposer({
  initial,
  assignableMembers = [],
  allowAssignment = true,
  submitLabel,
  onSubmit,
  onCancel,
  compact = false,
  autoFocus = true,
}: TodoComposerProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(initial?.text ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [priority, setPriority] = useState<TodoPriority | ''>(initial?.priority ?? '')
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showAssignment = allowAssignment && assignableMembers.length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        text: trimmed,
        dueDate: dueDate.trim() || null,
        priority: priority || null,
        assignedTo: showAssignment && assignedTo ? assignedTo : null,
      })
      if (!initial) {
        setText('')
        setDueDate('')
        setPriority('')
        setAssignedTo('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('todoCreateError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className={`todo-composer${compact ? ' todo-composer--compact' : ''}`}
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        className="todo-composer__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('todoAddPlaceholder')}
        aria-label={t('todoAddPlaceholder')}
        autoFocus={autoFocus}
      />

      <div className="todo-composer__controls">
        <label className="todo-composer__field">
          <span className="todo-composer__field-label">{t('todoDueDate')}</span>
          <input
            type="date"
            className="todo-composer__date"
            value={dueDate ?? ''}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label={t('todoDueDate')}
          />
        </label>

        <label className="todo-composer__field">
          <span className="todo-composer__field-label">{t('todoPriority')}</span>
          <select
            className="todo-composer__select"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TodoPriority | '')}
            aria-label={t('todoPriority')}
          >
            <option value="">{t('todoPriorityNormal')}</option>
            <option value="high">{t('todoPriorityHigh')}</option>
            <option value="normal">{t('todoPriorityNormal')}</option>
            <option value="low">{t('todoPriorityLow')}</option>
          </select>
        </label>

        {showAssignment ? (
          <label className="todo-composer__field">
            <span className="todo-composer__field-label">{t('todoAssignTo')}</span>
            <select
              className="todo-composer__select"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              aria-label={t('todoAssignTo')}
            >
              <option value="">{t('todoAssignNone')}</option>
              {assignableMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <p className="todo-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="todo-composer__actions">
        {onCancel ? (
          <button type="button" className="todo-composer__cancel" onClick={onCancel}>
            {t('todoCancel')}
          </button>
        ) : null}
        <button
          type="submit"
          className="todo-composer__submit"
          disabled={!text.trim() || submitting}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

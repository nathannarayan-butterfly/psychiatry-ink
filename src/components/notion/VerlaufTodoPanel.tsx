import { memo, useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { VerlaufAnnotation, TodoPriority } from '../../utils/verlaufFeed'
import { verlaufTodoPriorityColor } from '../../utils/verlaufAnnotationHelpers'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'

export interface VerlaufTodoItem extends VerlaufAnnotation {
  type: 'todo'
  todoText: string
}

export interface VerlaufTodoEditPayload {
  todoText: string
  priority: TodoPriority
  dueDate: string | null
}

interface VerlaufTodoPanelProps {
  todos: VerlaufTodoItem[]
  activeId: string | null
  /** Pinned or hovered todo — highlights the index entry. */
  linkedId?: string | null
  onSelect: (id: string) => void
  onToggleDone: (id: string, done: boolean) => void
  onRemove: (id: string) => void
  onEdit: (id: string, payload: VerlaufTodoEditPayload) => void
  /** Hover feedback so the feed anchor + bubble can track the index entry. */
  onHover?: (id: string | null) => void
}

const PRIORITY_KEYS: {
  value: TodoPriority
  labelKey: 'verlaufTodoPriorityHigh' | 'verlaufTodoPriorityNormal' | 'verlaufTodoPriorityLow'
}[] = [
  { value: 'high', labelKey: 'verlaufTodoPriorityHigh' },
  { value: 'normal', labelKey: 'verlaufTodoPriorityNormal' },
  { value: 'low', labelKey: 'verlaufTodoPriorityLow' },
]

function priorityLabel(
  priority: TodoPriority | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const entry = PRIORITY_KEYS.find((p) => p.value === (priority ?? 'normal'))
  return t(entry?.labelKey ?? 'verlaufTodoPriorityNormal')
}

interface PanelTodoItemProps {
  item: VerlaufTodoItem
  isActive: boolean
  isLinked: boolean
  activeRef: React.Ref<HTMLLIElement>
  onSelect: (id: string) => void
  onToggleDone: (id: string, done: boolean) => void
  onRemove: (id: string) => void
  onEdit: (id: string, payload: VerlaufTodoEditPayload) => void
  onHover?: (id: string | null) => void
}

function PanelTodoItem({
  item,
  isActive,
  isLinked,
  activeRef,
  onSelect,
  onToggleDone,
  onRemove,
  onEdit,
  onHover,
}: PanelTodoItemProps) {
  const { t, language } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(item.todoText)
  const [draftPriority, setDraftPriority] = useState<TodoPriority>(item.priority ?? 'normal')
  const [draftDueDate, setDraftDueDate] = useState(item.dueDate ?? '')

  const priority = item.priority ?? 'normal'
  const accent = verlaufTodoPriorityColor(priority)

  function startEdit() {
    setDraftText(item.todoText)
    setDraftPriority(item.priority ?? 'normal')
    setDraftDueDate(item.dueDate ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraftText(item.todoText)
    setDraftPriority(item.priority ?? 'normal')
    setDraftDueDate(item.dueDate ?? '')
  }

  function saveEdit() {
    const next = draftText.trim()
    if (!next) return
    onEdit(item.id, {
      todoText: next,
      priority: draftPriority,
      dueDate: draftDueDate.trim() || null,
    })
    setEditing(false)
  }

  return (
    <li
      ref={isActive ? activeRef : undefined}
      data-verlauf-todo-panel-id={item.id}
      className={`verlauf-todo-panel__item${
        isActive ? ' verlauf-todo-panel__item--active' : ''
      }${isLinked && !isActive ? ' verlauf-todo-panel__item--linked' : ''}${
        item.done ? ' verlauf-todo-panel__item--done' : ''
      }`}
      style={{ '--verlauf-todo-accent': accent } as React.CSSProperties}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="verlauf-todo-panel__item-head">
        <button
          type="button"
          className={`verlauf-todo-panel__check${item.done ? ' verlauf-todo-panel__check--on' : ''}`}
          style={{ '--verlauf-todo-accent': accent } as React.CSSProperties}
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.done ? t('verlaufTodoMarkOpen') : t('verlaufTodoMarkDone')}
          title={item.done ? t('verlaufTodoMarkOpen') : t('verlaufTodoMarkDone')}
          onClick={() => onToggleDone(item.id, !item.done)}
        >
          {item.done ? <Check strokeWidth={2.5} aria-hidden /> : null}
        </button>
        <span className="verlauf-todo-panel__priority" style={{ color: accent }}>
          {priorityLabel(item.priority, t)}
        </span>
        {!editing ? (
          <span className="verlauf-todo-panel__item-actions">
            <button
              type="button"
              className="icon-action-btn"
              title={t('verlaufTodoEdit')}
              aria-label={t('verlaufTodoEdit')}
              onClick={startEdit}
            >
              <Pencil strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--danger"
              title={t('verlaufTodoRemove')}
              aria-label={t('verlaufTodoRemove')}
              onClick={() => onRemove(item.id)}
            >
              <Trash2 strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        ) : null}
      </div>

      {editing ? (
        <div className="verlauf-todo-panel__editor">
          <textarea
            className="verlauf-todo-panel__editor-textarea"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={Math.max(2, draftText.split('\n').length)}
            // biome-ignore lint/a11y/noAutofocus: editing a single card in place
            autoFocus
          />
          <div className="verlauf-todo-panel__editor-fields">
            <label className="verlauf-todo-panel__editor-field">
              <span className="verlauf-todo-panel__editor-label">{t('verlaufTodoPriority')}</span>
              <select
                className="verlauf-todo-panel__editor-select"
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value as TodoPriority)}
              >
                {PRIORITY_KEYS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="verlauf-todo-panel__editor-field">
              <span className="verlauf-todo-panel__editor-label">{t('verlaufTodoDueDate')}</span>
              <input
                type="date"
                className="verlauf-todo-panel__editor-date"
                value={draftDueDate}
                onChange={(e) => setDraftDueDate(e.target.value)}
              />
            </label>
          </div>
          <div className="verlauf-todo-panel__editor-actions">
            <button
              type="button"
              className="icon-action-btn"
              title={t('verlaufEntryCancel')}
              aria-label={t('verlaufEntryCancel')}
              onClick={cancelEdit}
            >
              <X strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--success"
              title={t('verlaufEntrySave')}
              aria-label={t('verlaufEntrySave')}
              onClick={saveEdit}
              disabled={!draftText.trim()}
            >
              <Check strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="verlauf-todo-panel__item-btn"
          onClick={() => onSelect(item.id)}
          onFocus={() => onHover?.(item.id)}
          onBlur={() => onHover?.(null)}
        >
          <blockquote className="verlauf-todo-panel__quote">{item.rangeText || '…'}</blockquote>
          <p className="verlauf-todo-panel__text">{item.todoText}</p>
          {item.dueDate ? (
            <span className="verlauf-todo-panel__due">
              {t('verlaufTodoDueDate')}: {formatSiteLocaleDate(item.dueDate, language)}
            </span>
          ) : null}
        </button>
      )}
    </li>
  )
}

export const VerlaufTodoPanel = memo(function VerlaufTodoPanel({
  todos,
  activeId,
  linkedId,
  onSelect,
  onToggleDone,
  onRemove,
  onEdit,
  onHover,
}: VerlaufTodoPanelProps) {
  const { t } = useTranslation()
  const activeRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!activeId || !activeRef.current) return
    activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  return (
    <aside className="verlauf-todo-panel" aria-label={t('verlaufTodoPanelTitle')}>
      <header className="verlauf-todo-panel__header">
        <h3 className="verlauf-todo-panel__title">{t('verlaufTodoPanelTitle')}</h3>
        <span className="verlauf-todo-panel__count">{todos.length}</span>
      </header>

      {todos.length === 0 ? (
        <p className="verlauf-todo-panel__empty">{t('verlaufTodoPanelEmpty')}</p>
      ) : (
        <ul className="verlauf-todo-panel__list">
          {todos.map((item) => (
            <PanelTodoItem
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              isLinked={item.id === linkedId}
              activeRef={activeRef}
              onSelect={onSelect}
              onToggleDone={onToggleDone}
              onRemove={onRemove}
              onEdit={onEdit}
              onHover={onHover}
            />
          ))}
        </ul>
      )}
    </aside>
  )
})

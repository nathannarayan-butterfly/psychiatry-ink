import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import {
  resolveCommentBubblePlacement,
  verlaufTodoPriorityColor,
} from '../../utils/verlaufAnnotationHelpers'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import type { TodoPriority } from '../../utils/verlaufFeed'
import type { VerlaufTodoEditPayload, VerlaufTodoItem } from './VerlaufTodoPanel'

interface VerlaufTodoHoverBubbleProps {
  todoId: string | null
  todo: VerlaufTodoItem | undefined
  onToggleDone: (id: string, done: boolean) => void
  onRemove: (id: string) => void
  onEdit: (id: string, payload: VerlaufTodoEditPayload) => void
  onHover: (id: string | null) => void
  cancelHoverClear: () => void
  scheduleHoverClear: () => void
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

export function VerlaufTodoHoverBubble({
  todoId,
  todo,
  onToggleDone,
  onRemove,
  onEdit,
  onHover,
  cancelHoverClear,
  scheduleHoverClear,
}: VerlaufTodoHoverBubbleProps) {
  const { t, language } = useTranslation()
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0, ready: false, placeable: false })
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftPriority, setDraftPriority] = useState<TodoPriority>('normal')
  const [draftDueDate, setDraftDueDate] = useState('')

  useEffect(() => {
    setEditing(false)
    setDraftText(todo?.todoText ?? '')
    setDraftPriority(todo?.priority ?? 'normal')
    setDraftDueDate(todo?.dueDate ?? '')
  }, [todoId, todo?.todoText, todo?.priority, todo?.dueDate])

  const measure = useCallback(() => {
    if (!todoId || !todo) {
      setPlacement((prev) => (prev.ready ? { ...prev, ready: false, placeable: false } : prev))
      return
    }
    const anchor = document.querySelector<HTMLElement>(
      `[data-verlauf-annotation-id="${todoId}"][data-verlauf-annot-type="todo"]`,
    )
    const bubble = bubbleRef.current
    if (!anchor || !bubble) return

    const anchorRect = anchor.getBoundingClientRect()
    const { width, height } = bubble.getBoundingClientRect()
    const next = resolveCommentBubblePlacement(
      anchorRect,
      width,
      height,
      window.innerWidth,
      window.innerHeight,
    )
    setPlacement({ top: next.top, left: next.left, ready: true, placeable: next.placeable })
  }, [todo, todoId])

  useLayoutEffect(() => {
    if (!todoId || !todo) {
      setPlacement({ top: 0, left: 0, ready: false, placeable: false })
      return
    }
    measure()
  }, [todo, todoId, measure])

  useEffect(() => {
    if (!todoId || !todo) return

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        measure()
      })
    }

    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    const anchor = document.querySelector<HTMLElement>(
      `[data-verlauf-annotation-id="${todoId}"][data-verlauf-annot-type="todo"]`,
    )
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (anchor) observer?.observe(anchor)
    if (bubbleRef.current) observer?.observe(bubbleRef.current)

    return () => {
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [todo, todoId, measure])

  if (!todoId || !todo) return null

  const priority = todo.priority ?? 'normal'
  const accent = verlaufTodoPriorityColor(priority)

  function startEdit() {
    setDraftText(todo?.todoText ?? '')
    setDraftPriority(todo?.priority ?? 'normal')
    setDraftDueDate(todo?.dueDate ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraftText(todo?.todoText ?? '')
    setDraftPriority(todo?.priority ?? 'normal')
    setDraftDueDate(todo?.dueDate ?? '')
  }

  function saveEdit() {
    if (!todoId) return
    const next = draftText.trim()
    if (!next) return
    onEdit(todoId, {
      todoText: next,
      priority: draftPriority,
      dueDate: draftDueDate.trim() || null,
    })
    setEditing(false)
  }

  return createPortal(
    <div
      ref={bubbleRef}
      className={`verlauf-todo-bubble${todo.done ? ' verlauf-todo-bubble--done' : ''}`}
      role="tooltip"
      data-verlauf-todo-bubble-id={todoId}
      style={
        {
          position: 'fixed',
          top: placement.top,
          left: placement.left,
          visibility: placement.ready && placement.placeable ? 'visible' : 'hidden',
          pointerEvents: placement.ready && placement.placeable ? 'auto' : 'none',
          '--verlauf-todo-accent': accent,
        } as React.CSSProperties
      }
      onMouseEnter={() => {
        cancelHoverClear()
        onHover(todoId)
      }}
      onMouseLeave={() => {
        if (!editing) scheduleHoverClear()
      }}
      onFocusCapture={() => {
        cancelHoverClear()
        onHover(todoId)
      }}
      onBlurCapture={(e) => {
        if (editing) return
        const related = e.relatedTarget as Node | null
        if (related) {
          const anchor = document.querySelector(
            `[data-verlauf-annotation-id="${todoId}"][data-verlauf-annot-type="todo"]`,
          )
          if (anchor?.contains(related)) return
        }
        scheduleHoverClear()
      }}
    >
      <div className="verlauf-todo-bubble__head">
        <button
          type="button"
          className={`verlauf-todo-panel__check${todo.done ? ' verlauf-todo-panel__check--on' : ''}`}
          style={{ '--verlauf-todo-accent': accent } as React.CSSProperties}
          role="checkbox"
          aria-checked={todo.done}
          aria-label={todo.done ? t('verlaufTodoMarkOpen') : t('verlaufTodoMarkDone')}
          title={todo.done ? t('verlaufTodoMarkOpen') : t('verlaufTodoMarkDone')}
          onClick={() => onToggleDone(todoId, !todo.done)}
        >
          {todo.done ? <Check strokeWidth={2.5} aria-hidden /> : null}
        </button>
        <span className="verlauf-todo-bubble__priority" style={{ color: accent }}>
          {priorityLabel(todo.priority, t)}
        </span>
        {!editing ? (
          <span className="verlauf-todo-bubble__actions">
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
              onClick={() => onRemove(todoId)}
            >
              <Trash2 strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        ) : null}
      </div>

      <blockquote className="verlauf-todo-bubble__quote">{todo.rangeText || '…'}</blockquote>

      {editing ? (
        <div className="verlauf-todo-panel__editor">
          <textarea
            className="verlauf-todo-panel__editor-textarea"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={Math.max(2, draftText.split('\n').length)}
            // biome-ignore lint/a11y/noAutofocus: editing inside the revealed bubble
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
        <>
          <p className="verlauf-todo-bubble__text">{todo.todoText}</p>
          {todo.dueDate ? (
            <span className="verlauf-todo-bubble__due">
              {t('verlaufTodoDueDate')}: {formatSiteLocaleDate(todo.dueDate, language)}
            </span>
          ) : null}
        </>
      )}
    </div>,
    document.body,
  )
}

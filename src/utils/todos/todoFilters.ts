import type { Todo, TodoView } from '../../types/todo'

/** Local YYYY-MM-DD key for a Date (no timezone shift). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a stored due date (YYYY-MM-DD or ISO) to a local date key, or null. */
export function dueDateKey(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null
  const trimmed = dueDate.trim()
  if (!trimmed) return null
  // Already a plain date key.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return toDateKey(parsed)
}

/** Monday-based start of the ISO week containing `date`. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (result.getDay() + 6) % 7 // 0 = Monday
  result.setDate(result.getDate() - day)
  return result
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

export function isSameDay(dueDate: string | null | undefined, reference: Date): boolean {
  const key = dueDateKey(dueDate)
  return key !== null && key === toDateKey(reference)
}

export function isInWeek(dueDate: string | null | undefined, reference: Date): boolean {
  const key = dueDateKey(dueDate)
  if (key === null) return false
  return key >= toDateKey(startOfWeek(reference)) && key <= toDateKey(endOfWeek(reference))
}

/** True when the (open) todo's due date is strictly before `reference` day. */
export function isOverdue(todo: Todo, reference: Date): boolean {
  if (todo.done) return false
  const key = dueDateKey(todo.dueDate)
  return key !== null && key < toDateKey(reference)
}

export interface TodoFilterOptions {
  view: TodoView
  reference?: Date
  /** When set, only todos linked to this patient case. */
  caseId?: string | null
  /** Include completed entries (default: depends on view). */
  includeDone?: boolean
}

/**
 * Filter todos for a dashboard/print view.
 *
 * - `day`   → due today (+ overdue open items) or, for undated, only open ones.
 * - `week`  → due within the current week (+ overdue open).
 * - `open`  → all not-done entries.
 * - `all`   → everything.
 */
export function filterTodos(todos: Todo[], options: TodoFilterOptions): Todo[] {
  const reference = options.reference ?? new Date()
  const includeDone = options.includeDone ?? options.view === 'all'

  return todos.filter((todo) => {
    if (options.caseId !== undefined) {
      const linked = todo.caseId ?? null
      if (linked !== options.caseId) return false
    }

    if (!includeDone && todo.done) return false

    switch (options.view) {
      case 'all':
        return true
      case 'open':
        return !todo.done
      case 'day':
        if (isSameDay(todo.dueDate, reference)) return true
        if (isOverdue(todo, reference)) return true
        // Undated open todos surface in the day view as "to handle".
        return !todo.dueDate && !todo.done
      case 'week':
        if (isInWeek(todo.dueDate, reference)) return true
        if (isOverdue(todo, reference)) return true
        return !todo.dueDate && !todo.done
      default:
        return true
    }
  })
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 }

/** Sort: open first, then by due date (undated last), then priority, then createdAt. */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1

    const aKey = dueDateKey(a.dueDate)
    const bKey = dueDateKey(b.dueDate)
    if (aKey && bKey && aKey !== bKey) return aKey < bKey ? -1 : 1
    if (aKey && !bKey) return -1
    if (!aKey && bKey) return 1

    const aPrio = PRIORITY_ORDER[a.priority ?? 'normal'] ?? 1
    const bPrio = PRIORITY_ORDER[b.priority ?? 'normal'] ?? 1
    if (aPrio !== bPrio) return aPrio - bPrio

    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })
}

export function countOpenTodos(todos: Todo[]): number {
  return todos.reduce((acc, todo) => (todo.done ? acc : acc + 1), 0)
}

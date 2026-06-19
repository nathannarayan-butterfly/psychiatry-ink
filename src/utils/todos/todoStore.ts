import type { CreateTodoInput, Todo, UpdateTodoInput } from '../../types/todo'

/** Dispatched after any local todo mutation so open views can reload. */
export const TODOS_CHANGED_EVENT = 'psychiatry-ink:todos-changed'

const STORAGE_PREFIX = 'psychiatry-ink:todos'

export interface TodoStorageScope {
  userId: string
  /** Set only for small_praxis (shared/remote). Absent → local single-user. */
  orgId?: string
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function emitChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODOS_CHANGED_EVENT))
}

function readAll(userId: string): Todo[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is Todo => Boolean(entry && typeof entry === 'object'))
  } catch {
    return []
  }
}

function writeAll(userId: string, todos: Todo[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(todos))
  } catch {
    // Storage full / disabled — surface nothing; remote sync is the source of truth in shared mode.
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function listLocalTodos(scope: TodoStorageScope): Todo[] {
  return readAll(scope.userId)
}

export function createLocalTodo(scope: TodoStorageScope, input: CreateTodoInput): Todo {
  const timestamp = nowIso()
  const todo: Todo = {
    id: createId(),
    text: input.text.trim(),
    done: false,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? null,
    caseId: input.caseId ?? null,
    patientLabel: input.patientLabel ?? null,
    ownerUserId: scope.userId,
    assignedBy: null,
    assignedTo: null,
    assignedAt: null,
    orgId: scope.orgId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const todos = readAll(scope.userId)
  todos.push(todo)
  writeAll(scope.userId, todos)
  emitChange()
  return todo
}

export function updateLocalTodo(
  scope: TodoStorageScope,
  id: string,
  patch: UpdateTodoInput,
): Todo | null {
  const todos = readAll(scope.userId)
  const index = todos.findIndex((todo) => todo.id === id)
  if (index === -1) return null

  const current = todos[index]
  const next: Todo = {
    ...current,
    ...(patch.text !== undefined ? { text: patch.text.trim() } : {}),
    ...(patch.done !== undefined ? { done: patch.done } : {}),
    ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.caseId !== undefined ? { caseId: patch.caseId } : {}),
    ...(patch.patientLabel !== undefined ? { patientLabel: patch.patientLabel } : {}),
    updatedAt: nowIso(),
  }
  todos[index] = next
  writeAll(scope.userId, todos)
  emitChange()
  return next
}

export function toggleLocalTodo(scope: TodoStorageScope, id: string): Todo | null {
  const todos = readAll(scope.userId)
  const todo = todos.find((entry) => entry.id === id)
  if (!todo) return null
  return updateLocalTodo(scope, id, { done: !todo.done })
}

export function deleteLocalTodo(scope: TodoStorageScope, id: string): boolean {
  const todos = readAll(scope.userId)
  const next = todos.filter((todo) => todo.id !== id)
  if (next.length === todos.length) return false
  writeAll(scope.userId, next)
  emitChange()
  return true
}

import { beforeEach, describe, expect, it } from 'vitest'
import {
  createLocalTodo,
  deleteLocalTodo,
  listLocalTodos,
  toggleLocalTodo,
  updateLocalTodo,
  type TodoStorageScope,
} from '../todoStore'

const scope: TodoStorageScope = { userId: 'user-1' }

describe('local todo store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates a personal todo with sensible defaults', () => {
    const todo = createLocalTodo(scope, { text: '  Befund prüfen  ' })
    expect(todo.text).toBe('Befund prüfen')
    expect(todo.done).toBe(false)
    expect(todo.ownerUserId).toBe('user-1')
    expect(todo.assignedTo).toBeNull()
    expect(listLocalTodos(scope)).toHaveLength(1)
  })

  it('stores patient linkage (caseId + label)', () => {
    const todo = createLocalTodo(scope, {
      text: 'Rezept ausstellen',
      caseId: 'case-42',
      patientLabel: 'Mustermann, Max',
    })
    expect(todo.caseId).toBe('case-42')
    expect(todo.patientLabel).toBe('Mustermann, Max')
  })

  it('scopes todos per user', () => {
    createLocalTodo(scope, { text: 'A' })
    createLocalTodo({ userId: 'user-2' }, { text: 'B' })
    expect(listLocalTodos(scope)).toHaveLength(1)
    expect(listLocalTodos({ userId: 'user-2' })).toHaveLength(1)
  })

  it('updates fields and bumps updatedAt', async () => {
    const todo = createLocalTodo(scope, { text: 'Old' })
    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = updateLocalTodo(scope, todo.id, {
      text: 'New',
      priority: 'high',
      dueDate: '2026-06-20',
    })
    expect(updated?.text).toBe('New')
    expect(updated?.priority).toBe('high')
    expect(updated?.dueDate).toBe('2026-06-20')
    expect(updated?.updatedAt).not.toBe(todo.updatedAt)
  })

  it('toggles done state', () => {
    const todo = createLocalTodo(scope, { text: 'Toggle me' })
    const toggled = toggleLocalTodo(scope, todo.id)
    expect(toggled?.done).toBe(true)
    expect(toggleLocalTodo(scope, todo.id)?.done).toBe(false)
  })

  it('deletes a todo', () => {
    const todo = createLocalTodo(scope, { text: 'Remove me' })
    expect(deleteLocalTodo(scope, todo.id)).toBe(true)
    expect(listLocalTodos(scope)).toHaveLength(0)
    expect(deleteLocalTodo(scope, todo.id)).toBe(false)
  })

  it('returns null when updating a missing todo', () => {
    expect(updateLocalTodo(scope, 'missing', { done: true })).toBeNull()
  })
})

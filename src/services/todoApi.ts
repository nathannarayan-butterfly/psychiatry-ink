import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  AssignableMember,
  CreateTodoInput,
  TodoWithLabels,
  UpdateTodoInput,
} from '../types/todo'
import {
  createLocalTodo,
  deleteLocalTodo,
  listLocalTodos,
  updateLocalTodo,
  type TodoStorageScope,
} from '../utils/todos/todoStore'

export type { TodoStorageScope }

/** small_praxis → shared Supabase API; single_use → localStorage only. */
function usesRemoteTodos(scope: TodoStorageScope): boolean {
  return Boolean(scope.orgId?.trim())
}

async function remoteTodoFetch(
  organisationId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}/api/todos${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      'X-Organisation-Id': organisationId,
      ...init?.headers,
    },
  })
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(detail?.error ?? `${fallback} (${response.status})`)
}

export async function listTodosApi(
  scope: TodoStorageScope,
  filters: { caseId?: string | null } = {},
): Promise<TodoWithLabels[]> {
  if (!usesRemoteTodos(scope)) {
    const local = listLocalTodos(scope)
    if (filters.caseId !== undefined && filters.caseId !== null) {
      return local.filter((todo) => (todo.caseId ?? null) === filters.caseId)
    }
    return local
  }

  const orgId = scope.orgId!.trim()
  const params = new URLSearchParams()
  if (filters.caseId) params.set('caseId', filters.caseId)
  const suffix = params.toString() ? `/?${params}` : '/'

  const response = await remoteTodoFetch(orgId, suffix)
  if (!response.ok) await parseError(response, 'To-Dos konnten nicht geladen werden')
  const body = (await response.json()) as { todos: TodoWithLabels[] }
  return body.todos ?? []
}

export async function createTodoApi(
  scope: TodoStorageScope,
  input: CreateTodoInput,
): Promise<TodoWithLabels> {
  if (!usesRemoteTodos(scope)) {
    return createLocalTodo(scope, input)
  }

  const orgId = scope.orgId!.trim()
  const response = await remoteTodoFetch(orgId, '/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'To-Do konnte nicht erstellt werden')
  const body = (await response.json()) as { todo: TodoWithLabels }
  return body.todo
}

export async function updateTodoApi(
  scope: TodoStorageScope,
  id: string,
  patch: UpdateTodoInput,
): Promise<TodoWithLabels> {
  if (!usesRemoteTodos(scope)) {
    const todo = updateLocalTodo(scope, id, patch)
    if (!todo) throw new Error('To-Do nicht gefunden')
    return todo
  }

  const orgId = scope.orgId!.trim()
  const response = await remoteTodoFetch(orgId, `/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!response.ok) await parseError(response, 'To-Do konnte nicht aktualisiert werden')
  const body = (await response.json()) as { todo: TodoWithLabels }
  return body.todo
}

export async function toggleTodoApi(
  scope: TodoStorageScope,
  id: string,
  done: boolean,
): Promise<TodoWithLabels> {
  return updateTodoApi(scope, id, { done })
}

export async function deleteTodoApi(scope: TodoStorageScope, id: string): Promise<void> {
  if (!usesRemoteTodos(scope)) {
    const removed = deleteLocalTodo(scope, id)
    if (!removed) throw new Error('To-Do nicht gefunden')
    return
  }

  const orgId = scope.orgId!.trim()
  const response = await remoteTodoFetch(orgId, `/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!response.ok) await parseError(response, 'To-Do konnte nicht gelöscht werden')
}

export async function listAssignableMembersApi(
  scope: TodoStorageScope,
): Promise<AssignableMember[]> {
  if (!usesRemoteTodos(scope)) return []

  const orgId = scope.orgId!.trim()
  const response = await remoteTodoFetch(orgId, '/assignable-members')
  if (!response.ok) await parseError(response, 'Mitglieder konnten nicht geladen werden')
  const body = (await response.json()) as { members: AssignableMember[] }
  return body.members ?? []
}

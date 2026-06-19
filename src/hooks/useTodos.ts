import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AssignableMember,
  CreateTodoInput,
  TodoWithLabels,
  UpdateTodoInput,
} from '../types/todo'
import {
  createTodoApi,
  deleteTodoApi,
  listAssignableMembersApi,
  listTodosApi,
  toggleTodoApi,
  updateTodoApi,
} from '../services/todoApi'
import { TODOS_CHANGED_EVENT } from '../utils/todos/todoStore'
import { useTodoScope } from './useTodoScope'

interface UseTodosOptions {
  /** Restrict to a specific patient case. Omit for all visible todos. */
  caseId?: string | null
}

export function useTodos(options: UseTodosOptions = {}) {
  const scope = useTodoScope()
  const caseId = options.caseId ?? null
  const filterByCase = options.caseId !== undefined

  const [todos, setTodos] = useState<TodoWithLabels[]>([])
  const [assignableMembers, setAssignableMembers] = useState<AssignableMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listTodosApi(scope, filterByCase ? { caseId } : {})
      setTodos(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'To-Dos konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [scope, caseId, filterByCase])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!scope.canAssign) {
      setAssignableMembers([])
      return
    }
    let cancelled = false
    void listAssignableMembersApi(scope)
      .then((members) => {
        if (!cancelled) setAssignableMembers(members)
      })
      .catch(() => {
        if (!cancelled) setAssignableMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [scope])

  useEffect(() => {
    const onChange = () => void reload()
    window.addEventListener(TODOS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, onChange)
  }, [reload])

  const create = useCallback(
    async (input: CreateTodoInput) => {
      const todo = await createTodoApi(scope, input)
      await reload()
      return todo
    },
    [reload, scope],
  )

  const update = useCallback(
    async (id: string, patch: UpdateTodoInput) => {
      const todo = await updateTodoApi(scope, id, patch)
      await reload()
      return todo
    },
    [reload, scope],
  )

  const toggle = useCallback(
    async (id: string, done: boolean) => {
      const todo = await toggleTodoApi(scope, id, done)
      await reload()
      return todo
    },
    [reload, scope],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteTodoApi(scope, id)
      await reload()
    },
    [reload, scope],
  )

  return useMemo(
    () => ({
      todos,
      assignableMembers,
      loading,
      error,
      scope,
      reload,
      create,
      update,
      toggle,
      remove,
    }),
    [todos, assignableMembers, loading, error, scope, reload, create, update, toggle, remove],
  )
}

import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePermissionContext } from '../contexts/PermissionContext'
import { isTaskAssignerRole } from '../data/org/roleHierarchy'
import type { TodoStorageScope } from '../utils/todos/todoStore'

export interface TodoScope extends TodoStorageScope {
  /** Current org role (null when no org store). */
  role: string | null
  /** Whether the user may assign tasks to others (small_praxis + assigner role). */
  canAssign: boolean
}

/** Resolves storage scope: local for single_use, shared Supabase for small_praxis. */
export function useTodoScope(): TodoScope {
  const { user } = useAuth()
  const { organisation, role } = usePermissionContext()
  const userId = user?.id ?? 'default'

  return useMemo(() => {
    const orgId = organisation?.tier === 'small_praxis' ? organisation.id : undefined
    const canAssign = Boolean(orgId) && isTaskAssignerRole(role ?? null)
    return { userId, orgId, role: role ?? null, canAssign }
  }, [organisation?.id, organisation?.tier, role, userId])
}

import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePermissionContext } from '../contexts/PermissionContext'
import type { CalendarStorageScope } from '../utils/calendarStore'

function isOrgOwnerRole(role: string | null | undefined): boolean {
  return role === 'org_owner' || role === 'single_owner'
}

/** Resolves storage scope: local for single_use, encrypted remote for small_praxis. */
export function useCalendarScope(): CalendarStorageScope {
  const { user } = useAuth()
  const { organisation, role } = usePermissionContext()
  const userId = user?.id ?? 'default'

  return useMemo(
    () => ({
      userId,
      orgId: organisation?.tier === 'small_praxis' ? organisation.id : undefined,
      isOrgOwner: isOrgOwnerRole(role),
    }),
    [organisation?.id, organisation?.tier, role, userId],
  )
}

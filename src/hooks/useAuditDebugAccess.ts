import { useMemo } from 'react'
import { usePermissionContext } from '../contexts/PermissionContext'
import { useSystemAdminAccess } from './useSystemAdminAccess'
import { hasPermissionInContext } from '../utils/orgPermissions'
import type { OrganisationRole } from '../types/organisation'

const AUDITOR_ROLES = new Set<OrganisationRole>(['auditor', 'it_admin'])

export function useAuditDebugAccess(): boolean {
  const hasSystemAdmin = useSystemAdminAccess()
  const { organisation, role, permissions } = usePermissionContext()

  return useMemo(() => {
    if (import.meta.env.DEV) return true
    if (hasSystemAdmin) return true
    if (!organisation || !role) return false
    if (!AUDITOR_ROLES.has(role)) return false
    return hasPermissionInContext({ organisation, role, permissions }, 'audit.view')
  }, [hasSystemAdmin, organisation, permissions, role])
}

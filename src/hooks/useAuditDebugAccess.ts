import { useMemo } from 'react'
import { usePermissionContext } from '../contexts/PermissionContext'
import { useKbAdminAccess } from './useKbAdminAccess'
import { hasPermissionInContext } from '../utils/orgPermissions'
import type { OrganisationRole } from '../types/organisation'

const AUDITOR_ROLES = new Set<OrganisationRole>(['auditor', 'it_admin'])

export function useAuditDebugAccess(): boolean {
  const hasKbAdmin = useKbAdminAccess()
  const { organisation, role, permissions } = usePermissionContext()

  return useMemo(() => {
    if (import.meta.env.DEV) return true
    if (hasKbAdmin) return true
    if (!organisation || !role) return false
    if (!AUDITOR_ROLES.has(role)) return false
    return hasPermissionInContext({ organisation, role, permissions }, 'audit.view')
  }, [hasKbAdmin, organisation, permissions, role])
}

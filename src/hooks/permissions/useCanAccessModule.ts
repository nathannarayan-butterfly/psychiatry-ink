import { useMemo } from 'react'
import { usePermissionCheckContext, usePermissionContext } from '../../contexts/PermissionContext'
import { canAccessModule } from '../../services/permissionService'
import type { ModuleName } from '../../types/organisation'

/**
 * Module-level access for a case (or org-wide when caseId is null).
 */
export function useCanAccessModule(caseId: string | null, moduleName: ModuleName): boolean {
  const checkCtx = usePermissionCheckContext()
  const { signalDevWarning } = usePermissionContext()

  return useMemo(
    () => canAccessModule(checkCtx, caseId, moduleName, signalDevWarning),
    [caseId, checkCtx, moduleName, signalDevWarning],
  )
}

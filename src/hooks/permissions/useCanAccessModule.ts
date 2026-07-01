import { useEffect, useMemo } from 'react'
import { usePermissionCheckContext, usePermissionContext } from '../../contexts/PermissionContext'
import { canAccessModule } from '../../services/permissionService'
import type { ModuleName } from '../../types/organisation'

/**
 * Module-level access for a case (or org-wide when caseId is null).
 */
export function useCanAccessModule(caseId: string | null, moduleName: ModuleName): boolean {
  const checkCtx = usePermissionCheckContext()
  const { signalDevWarning } = usePermissionContext()

  const { result, warned } = useMemo(() => {
    let warned = false
    const result = canAccessModule(checkCtx, caseId, moduleName, () => {
      warned = true
    })
    return { result, warned }
  }, [caseId, checkCtx, moduleName])

  useEffect(() => {
    if (warned) signalDevWarning()
  }, [warned, signalDevWarning])

  return result
}

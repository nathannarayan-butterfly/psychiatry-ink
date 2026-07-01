import { useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePermissionCheckContext, usePermissionContext } from '../../contexts/PermissionContext'
import { useCaseAccessSnapshot } from '../useCaseAccessSnapshot'
import {
  buildCasePermissionContext,
  canEditCase,
  canEditDocument,
  canExportDocument,
  canFinalizeDocument,
  canUseAI,
  canViewCase,
  canViewClinicalContent,
  canViewPatientIdentity,
} from '../../services/permissionService'

export interface CaseAccessChecks {
  canView: boolean
  canEdit: boolean
  canViewPatientIdentity: boolean
  canViewClinicalContent: boolean
  canEditDocument: boolean
  canFinalizeDocument: boolean
  canExportDocument: boolean
  canUseAI: boolean
  canManageSharing: boolean
  isLoading: boolean
}

/**
 * Memoized case-scoped permission checks — merges org role with org_case_access rows.
 */
export function useCanAccessCase(caseId?: string): CaseAccessChecks {
  const checkCtx = usePermissionCheckContext()
  const { signalDevWarning } = usePermissionContext()
  const { user } = useAuth()
  const { snapshot, isLoading } = useCaseAccessSnapshot(caseId)

  const caseCtx = useMemo(
    () => buildCasePermissionContext(checkCtx, snapshot, user?.id),
    [checkCtx, snapshot, user?.id],
  )

  const { checks, warned } = useMemo(() => {
    let warned = false
    const onWarn = () => {
      warned = true
    }
    const checks: CaseAccessChecks = {
      canView: canViewCase(caseCtx, caseId, onWarn),
      canEdit: canEditCase(caseCtx, caseId, onWarn),
      canViewPatientIdentity: canViewPatientIdentity(caseCtx, caseId, onWarn),
      canViewClinicalContent: canViewClinicalContent(caseCtx, caseId, onWarn),
      canEditDocument: canEditDocument(caseCtx, caseId, onWarn),
      canFinalizeDocument: canFinalizeDocument(caseCtx, caseId, onWarn),
      canExportDocument: canExportDocument(caseCtx, caseId, onWarn),
      canUseAI: canUseAI(caseCtx, caseId, onWarn),
      canManageSharing: snapshot?.canManage ?? false,
      isLoading,
    }
    return { checks, warned }
  }, [caseCtx, caseId, isLoading, snapshot?.canManage])

  useEffect(() => {
    if (warned) signalDevWarning()
  }, [warned, signalDevWarning])

  return checks
}

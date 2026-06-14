import { useMemo } from 'react'
import { usePermissionCheckContext, usePermissionContext } from '../../contexts/PermissionContext'
import {
  canCreateTherapyEntry,
  canEditCase,
  canEditDocument,
  canExportDocument,
  canFinalizeDocument,
  canInviteUsers,
  canManageTemplates,
  canUseAI,
  canUseTherapyAI,
  canViewAuditLog,
  canViewCase,
  canViewClinicalContent,
  canViewPatientIdentity,
  canViewTherapy,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  permissionsFromContext,
  type PermissionCheckContext,
} from '../../services/permissionService'
import type { Permission } from '../../types/organisation'

function bindPermissionHelpers(
  ctx: PermissionCheckContext,
  signalDevWarning: () => void,
) {
  const onWarn = signalDevWarning

  return {
    hasPermission: (permission: Permission) => hasPermission(ctx, permission, onWarn),
    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(ctx, permissions, onWarn),
    hasAllPermissions: (permissions: Permission[]) =>
      hasAllPermissions(ctx, permissions, onWarn),
    canViewCase: (caseId?: string) => canViewCase(ctx, caseId, onWarn),
    canEditCase: (caseId?: string) => canEditCase(ctx, caseId, onWarn),
    canViewPatientIdentity: (caseId?: string) =>
      canViewPatientIdentity(ctx, caseId, onWarn),
    canViewClinicalContent: (caseId?: string) =>
      canViewClinicalContent(ctx, caseId, onWarn),
    canEditDocument: (caseId?: string) => canEditDocument(ctx, caseId, onWarn),
    canFinalizeDocument: (caseId?: string) =>
      canFinalizeDocument(ctx, caseId, onWarn),
    canExportDocument: (caseId?: string) => canExportDocument(ctx, caseId, onWarn),
    canUseAI: (caseId?: string) => canUseAI(ctx, caseId, onWarn),
    canViewTherapy: (caseId?: string) => canViewTherapy(ctx, caseId, onWarn),
    canCreateTherapyEntry: (caseId?: string) => canCreateTherapyEntry(ctx, caseId, onWarn),
    canUseTherapyAI: (caseId?: string) => canUseTherapyAI(ctx, caseId, onWarn),
    canManageTemplates: () => canManageTemplates(ctx, onWarn),
    canInviteUsers: () => canInviteUsers(ctx, onWarn),
    canViewAuditLog: () => canViewAuditLog(ctx, onWarn),
  }
}

export type PermissionHelpers = ReturnType<typeof bindPermissionHelpers>

/**
 * Permission set and named helpers bound to the current user/org.
 * Prefer this over scattering role checks in components.
 */
export function usePermissions(): PermissionHelpers & {
  permissions: Permission[]
  isLoading: boolean
  error: string | null
  devWarning: boolean
} {
  const checkCtx = usePermissionCheckContext()
  const { permissions, isLoading, error, devWarning, signalDevWarning } =
    usePermissionContext()

  const helpers = useMemo(
    () => bindPermissionHelpers(checkCtx, signalDevWarning),
    [checkCtx, signalDevWarning],
  )

  const resolvedPermissions = useMemo(
    () => permissionsFromContext(checkCtx),
    [checkCtx],
  )

  return {
    permissions: resolvedPermissions.length ? resolvedPermissions : permissions,
    isLoading,
    error,
    devWarning,
    ...helpers,
  }
}

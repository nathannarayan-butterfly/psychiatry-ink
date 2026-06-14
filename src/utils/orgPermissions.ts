import type { ModuleName, OrganisationRole, Permission } from '../types/organisation'
import { permissionsForRole } from '../data/org/rolePermissions'
import {
  canAccessCase as canAccessCaseService,
  canAccessModule as canAccessModuleService,
  canEditCase,
  canEditDocument,
  canExportDocument,
  canFinalizeDocument,
  canInviteUsers,
  canManageTemplates,
  canUseAI,
  canViewAuditLog,
  canViewCase,
  canViewClinicalContent,
  canViewPatientIdentity,
  hasAllPermissions as hasAllPermissionsService,
  hasAnyPermission as hasAnyPermissionService,
  hasPermission as hasPermissionService,
  type PermissionCheckContext,
} from '../services/permissionService'
import type { OrganisationContext } from '../types/organisation'

function toCtx(context: OrganisationContext | null | undefined): PermissionCheckContext {
  if (!context) return {}
  return {
    organisation: context.organisation,
    role: context.role,
    permissions: context.permissions,
  }
}

/** @deprecated Import from `../services/permissionService` instead. */
export function hasPermissionInContext(
  context: OrganisationContext | null | undefined,
  permission: Permission,
): boolean {
  return hasPermissionService(toCtx(context), permission)
}

export function permissionsForContextRole(role: OrganisationRole | null | undefined) {
  if (!role) return []
  return permissionsForRole(role)
}

/** Client-side mirror — default allow when context not loaded (Step 1). */
export function canAccessCaseInContext(
  context: OrganisationContext | null | undefined,
  caseId: string,
  permission: Permission,
): boolean {
  return canAccessCaseService(toCtx(context), caseId, permission)
}

/** Client-side mirror — default allow when context not loaded (Step 1). */
export function canAccessModuleInContext(
  context: OrganisationContext | null | undefined,
  caseId: string | null,
  moduleName: ModuleName,
  permission: Permission,
): boolean {
  void permission
  return canAccessModuleService(toCtx(context), caseId, moduleName)
}

export function isSingleUseOrganisation(context: OrganisationContext | null | undefined): boolean {
  return context?.organisation.tier === 'single_use' && context.organisation.isPersonal === true
}

export function isOrgOwnerRole(role: OrganisationRole | null | undefined): boolean {
  return role === 'single_owner' || role === 'org_owner'
}

export {
  canEditCase,
  canEditDocument,
  canExportDocument,
  canFinalizeDocument,
  canInviteUsers,
  canManageTemplates,
  canUseAI,
  canViewAuditLog,
  canViewCase,
  canViewClinicalContent,
  canViewPatientIdentity,
  hasAllPermissionsService as hasAllPermissions,
  hasAnyPermissionService as hasAnyPermission,
  hasPermissionService as hasPermission,
  type PermissionCheckContext,
}

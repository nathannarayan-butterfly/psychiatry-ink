import { permissionsForMember } from '../data/org/memberPermissions'
import { permissionsForRole, roleHasPermission } from '../data/org/rolePermissions'
import {
  effectiveCasePermission,
  isTherapistRole,
  therapistRequiresCaseAssignment,
} from '../data/org/therapistCaseAccess'
import {
  isOrgWideCaseBypassRole,
  permissionsForCaseAccessLevel,
  type CaseAccessLevel,
} from '../data/org/caseAccessLevels'
import { isEnterpriseOrgHierarchyEnabled } from '../utils/featureFlags'
import type {
  ModuleAccess,
  ModuleName,
  Organisation,
  OrganisationMember,
  OrganisationRole,
  Permission,
} from '../types/organisation'

/** Input for permission checks — role + optional pre-resolved permission set. */
export interface PermissionCheckContext {
  organisation?: Organisation | null
  member?: OrganisationMember | null
  role?: OrganisationRole | null
  permissions?: Permission[] | null
  /** Per-case access level from org_case_access (Small Praxis). */
  caseAccessLevel?: CaseAccessLevel | null
  /** True when case has any org_case_access rows (restricted mode). */
  caseAccessRestricted?: boolean
  /** Enterprise module access rows from org context API. */
  moduleAccess?: ModuleAccess[] | null
}

export type PermissionWarnFn = (message: string) => void

const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

let devWarnEmitted = false

export function resetPermissionDevWarnings(): void {
  devWarnEmitted = false
}

/** Controlled dev-only warning — at most once per session unless reset. */
export function warnPermissionFallback(
  reason: string,
  onWarn?: PermissionWarnFn,
): void {
  if (!isDev) return
  const message = `[permissions] ${reason} — defaulting to allow (backward compat)`
  if (onWarn) {
    onWarn(message)
    return
  }
  if (!devWarnEmitted) {
    console.warn(message)
    devWarnEmitted = true
  }
}

function contextUnavailable(ctx: PermissionCheckContext | null | undefined): boolean {
  return !ctx?.role && !(ctx?.permissions && ctx.permissions.length > 0)
}

/** In production, missing org context denies access; dev keeps backward-compat allow. */
function resolveWhenContextUnavailable(onWarn?: PermissionWarnFn): boolean {
  if (isProd) return false
  warnPermissionFallback('Organisation permission context unavailable', onWarn)
  return true
}

function resolveHasPermission(
  ctx: PermissionCheckContext,
  permission: Permission,
): boolean {
  const { role, permissions } = ctx
  if (role === 'single_owner' || role === 'org_owner') return true
  if (permissions && permissions.length > 0) {
    return permissions.includes(permission)
  }
  if (role) return roleHasPermission(role, permission)
  return true
}

export function hasPermission(
  ctx: PermissionCheckContext | null | undefined,
  permission: Permission,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  return resolveHasPermission(ctx!, permission)
}

export function hasAnyPermission(
  ctx: PermissionCheckContext | null | undefined,
  permissions: Permission[],
  onWarn?: PermissionWarnFn,
): boolean {
  if (permissions.length === 0) return true
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  return permissions.some((p) => resolveHasPermission(ctx!, p))
}

export function hasAllPermissions(
  ctx: PermissionCheckContext | null | undefined,
  permissions: Permission[],
  onWarn?: PermissionWarnFn,
): boolean {
  if (permissions.length === 0) return true
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  return permissions.every((p) => resolveHasPermission(ctx!, p))
}

function resolveCaseScopedPermission(
  ctx: PermissionCheckContext,
  permission: Permission,
): boolean {
  const role = ctx.role
  if (!role) return true

  const effective = effectiveCasePermission(role, permission)
  const roleAllowed = resolveHasPermission(ctx, effective)
  if (!roleAllowed) return false

  const org = ctx.organisation
  if (org?.tier === 'single_use' && !ctx.caseAccessRestricted && !isTherapistRole(role)) {
    return true
  }
  if (role && isOrgWideCaseBypassRole(role)) return true

  if (isTherapistRole(role)) {
    const level = ctx.caseAccessLevel ?? 'no_access'
    if (level === 'no_access') return false
    return true
  }

  if (!ctx.caseAccessRestricted) return true

  const level = ctx.caseAccessLevel ?? 'no_access'
  if (level === 'no_access') return false
  return permissionsForCaseAccessLevel(level).includes(permission)
}

export function canViewCase(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (isTherapistRole(ctx!.role)) {
    if (!ctx!.caseAccessRestricted) return false
    return resolveCaseScopedPermission(ctx!, 'cases.view')
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'cases.view')
  }
  return hasPermission(ctx, 'cases.view', onWarn)
}

export function canEditCase(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'cases.edit')
  }
  return hasPermission(ctx, 'cases.edit', onWarn)
}

export function canViewPatientIdentity(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'patientIdentity.view')
  }
  return hasPermission(ctx, 'patientIdentity.view', onWarn)
}

export function canViewClinicalContent(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (isTherapistRole(ctx!.role)) {
    if (!ctx!.caseAccessRestricted) return false
    return resolveCaseScopedPermission(ctx!, 'clinicalContent.view')
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'clinicalContent.view')
  }
  return hasPermission(ctx, 'clinicalContent.view', onWarn)
}

export function canEditDocument(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return (
      resolveCaseScopedPermission(ctx!, 'documents.editOwn') ||
      resolveCaseScopedPermission(ctx!, 'documents.editAll')
    )
  }
  return hasAnyPermission(ctx, ['documents.editOwn', 'documents.editAll'], onWarn)
}

export function canFinalizeDocument(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'documents.finalize')
  }
  return hasPermission(ctx, 'documents.finalize', onWarn)
}

export function canExportDocument(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'documents.export')
  }
  return hasPermission(ctx, 'documents.export', onWarn)
}

export function canUseAI(
  ctx: PermissionCheckContext | null | undefined,
  _caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, 'ai.use')
  }
  return hasPermission(ctx, 'ai.use', onWarn)
}

export function canManageTemplates(
  ctx: PermissionCheckContext | null | undefined,
  onWarn?: PermissionWarnFn,
): boolean {
  return hasAnyPermission(ctx, ['templates.manageOwn', 'templates.manageOrg'], onWarn)
}

export function canInviteUsers(
  ctx: PermissionCheckContext | null | undefined,
  onWarn?: PermissionWarnFn,
): boolean {
  return hasPermission(ctx, 'users.invite', onWarn)
}

export function canViewAuditLog(
  ctx: PermissionCheckContext | null | undefined,
  onWarn?: PermissionWarnFn,
): boolean {
  return hasPermission(ctx, 'audit.view', onWarn)
}

/** Minimum permission required to open a module (Step 2 may add case-level overrides). */
export const MODULE_VIEW_PERMISSION: Record<ModuleName, Permission> = {
  workspace: 'cases.view',
  dokumente: 'clinicalContent.view',
  diagnostik: 'labs.view',
  discussion: 'discussion.create',
  consultation: 'consultation.create',
  medication: 'medication.view',
  ai: 'ai.use',
  templates: 'templates.use',
  therapy: 'therapy.view',
}

export function canAccessCase(
  ctx: PermissionCheckContext | null | undefined,
  _caseId: string,
  permission: Permission,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (ctx!.caseAccessRestricted) {
    return resolveCaseScopedPermission(ctx!, permission)
  }
  return hasPermission(ctx, permission, onWarn)
}

export function buildCasePermissionContext(
  base: PermissionCheckContext,
  snapshot: {
    grants: { userId: string; level: CaseAccessLevel }[]
    caseOwnerUserId: string | null
  } | null,
  currentUserId: string | null | undefined,
): PermissionCheckContext {
  if (!currentUserId) {
    return { ...base, caseAccessRestricted: false, caseAccessLevel: null }
  }

  const therapist = therapistRequiresCaseAssignment(base.role)
  if (!snapshot) {
    return {
      ...base,
      caseAccessRestricted: therapist,
      caseAccessLevel: therapist ? 'no_access' : null,
    }
  }

  const hasRows = snapshot.grants.length > 0 || snapshot.caseOwnerUserId !== null
  const userGrant = snapshot.grants.find((g) => g.userId === currentUserId)
  const level = userGrant?.level ?? (hasRows || therapist ? 'no_access' : null)

  return {
    ...base,
    caseAccessRestricted: hasRows || therapist,
    caseAccessLevel: level,
  }
}

export function canViewTherapy(
  ctx: PermissionCheckContext | null | undefined,
  caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (!hasPermission(ctx, 'therapy.view', onWarn)) return false
  if (isTherapistRole(ctx!.role)) {
    return canViewCase(ctx, caseId, onWarn)
  }
  return true
}

export function canCreateTherapyEntry(
  ctx: PermissionCheckContext | null | undefined,
  caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (!hasAnyPermission(ctx, ['therapy.create', 'complementaryTherapies.editOwn'], onWarn)) {
    return false
  }
  if (isTherapistRole(ctx!.role)) {
    return canViewCase(ctx, caseId, onWarn)
  }
  return true
}

export function canUseTherapyAI(
  ctx: PermissionCheckContext | null | undefined,
  caseId?: string,
  onWarn?: PermissionWarnFn,
): boolean {
  if (contextUnavailable(ctx)) {
    return resolveWhenContextUnavailable(onWarn)
  }
  if (!hasPermission(ctx, 'ai.useTherapyDocumentation', onWarn)) return false
  if (isTherapistRole(ctx!.role)) {
    return canViewCase(ctx, caseId, onWarn)
  }
  return hasPermission(ctx, 'ai.use', onWarn)
}

/**
 * Enterprise module grant evaluation (client-side mirror of server logic).
 * Returns null when no applicable rows — caller defaults to allow.
 */
function evaluateEnterpriseModuleGrant(
  ctx: PermissionCheckContext,
  caseId: string | null,
  moduleName: ModuleName,
): boolean | null {
  const rows = ctx.moduleAccess
  if (!rows || rows.length === 0) return null

  const relevant = rows.filter(
    (r) =>
      r.moduleName === moduleName &&
      (r.caseId === null || r.caseId === caseId || caseId === null),
  )
  if (relevant.length === 0) return null

  const userId = ctx.member?.userId
  if (userId) {
    const userRow = relevant.find((r) => r.userId === userId)
    if (userRow) {
      const denied =
        userRow.permissions.denied === true || userRow.permissions.view === false
      return !denied
    }
  }

  const orgWideAllow = relevant.some(
    (r) => r.userId === null && r.teamId === null && r.permissions.denied !== true,
  )
  if (orgWideAllow) return true

  return false
}

export function canAccessModule(
  ctx: PermissionCheckContext | null | undefined,
  caseId: string | null,
  moduleName: ModuleName,
  onWarn?: PermissionWarnFn,
): boolean {
  const required = MODULE_VIEW_PERMISSION[moduleName]
  if (!hasPermission(ctx, required, onWarn)) return false

  // Default allow when flag off or non-enterprise tier (single_use / small_praxis unchanged).
  if (!isEnterpriseOrgHierarchyEnabled() || ctx?.organisation?.tier !== 'enterprise') {
    return true
  }

  const grant = evaluateEnterpriseModuleGrant(ctx!, caseId, moduleName)
  if (grant === null) return true
  return grant
}

/** Build a synthetic member record when API returns role but not full member row. */
export function buildSyntheticMember(
  organisationId: string,
  userId: string,
  role: OrganisationRole,
  fields?: Pick<OrganisationMember, 'therapyDiscipline' | 'therapyDisciplineCustom'>,
): OrganisationMember {
  return {
    id: `synthetic-${organisationId}-${userId}`,
    organisationId,
    userId,
    role,
    status: 'active',
    joinedAt: new Date(0).toISOString(),
    invitedBy: null,
    therapyDiscipline: fields?.therapyDiscipline ?? null,
    therapyDisciplineCustom: fields?.therapyDisciplineCustom ?? null,
  }
}

export function permissionsFromContext(
  ctx: PermissionCheckContext | null | undefined,
): Permission[] {
  if (ctx?.permissions && ctx.permissions.length > 0) return ctx.permissions
  if (ctx?.member) return permissionsForMember(ctx.member)
  if (ctx?.role) return permissionsForRole(ctx.role)
  return []
}

export function toPermissionCheckContext(value: {
  organisation?: Organisation | null
  member?: OrganisationMember | null
  role?: OrganisationRole | null
  permissions?: Permission[] | null
  moduleAccess?: ModuleAccess[] | null
}): PermissionCheckContext {
  return {
    organisation: value.organisation ?? null,
    member: value.member ?? null,
    role: value.role ?? value.member?.role ?? null,
    permissions: value.permissions ?? null,
    moduleAccess: value.moduleAccess ?? null,
  }
}

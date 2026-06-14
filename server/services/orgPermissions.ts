import type { ModuleName, Permission } from '../../src/types/organisation'
import {
  isOrgWideCaseBypassRole,
  parseCaseAccessLevel,
  permissionsForCaseAccessLevel,
} from '../../src/data/org/caseAccessLevels'
import { permissionsForMember } from '../../src/data/org/memberPermissions'
import { roleHasPermission } from '../../src/data/org/rolePermissions'
import {
  effectiveCasePermission,
  isTherapistRole,
} from '../../src/data/org/therapistCaseAccess'
import {
  countCaseAccessRows,
  ensurePersonalOrganisation,
  evaluateModuleAccessGrant,
  getCaseAccessRowForUser,
  getMember,
  getOrganisationById,
  getPersonalOrganisation,
  isOrgStoreConfigured,
} from './orgStore'
import { isEnterpriseOrgHierarchyEnabled, isEnterpriseTier } from '../utils/featureFlags'
import type { Organisation, OrganisationMember, OrganisationRole } from '../../src/types/organisation'

export interface OrgPermissionContext {
  organisation: Organisation | null
  member: OrganisationMember | null
  role: OrganisationRole | null
  permissions: Permission[]
}

type ServerPermissionCtx = {
  role: OrganisationRole | null
  permissions: Permission[]
}

function toServerCtx(member: OrganisationMember | null, permissions: Permission[]): ServerPermissionCtx {
  return {
    role: member?.role ?? null,
    permissions,
  }
}

async function resolveMemberContext(
  userId: string,
  organisationId: string | null | undefined,
): Promise<{ member: OrganisationMember | null; permissions: Permission[]; organisation: Organisation | null }> {
  if (!isOrgStoreConfigured() || !organisationId) {
    return { member: null, permissions: [], organisation: null }
  }
  const organisation = await getOrganisationById(organisationId)
  const member = await getMember(userId, organisationId)
  if (!member) return { member: null, permissions: [], organisation }
  return { member, permissions: permissionsForMember(member), organisation }
}

function serverHasPermission(ctx: ServerPermissionCtx, permission: Permission): boolean {
  if (!isOrgStoreConfigured()) return true
  if (!ctx.role) return true
  if (ctx.role === 'single_owner' || ctx.role === 'org_owner') return true
  if (ctx.permissions.length > 0) return ctx.permissions.includes(permission)
  return roleHasPermission(ctx.role, permission)
}

function serverHasAnyPermission(ctx: ServerPermissionCtx, permissions: Permission[]): boolean {
  if (!isOrgStoreConfigured()) return true
  if (!ctx.role) return true
  if (permissions.length === 0) return true
  return permissions.some((p) => serverHasPermission(ctx, p))
}

function serverHasAllPermissions(ctx: ServerPermissionCtx, permissions: Permission[]): boolean {
  if (!isOrgStoreConfigured()) return true
  if (!ctx.role) return true
  if (permissions.length === 0) return true
  return permissions.every((p) => serverHasPermission(ctx, p))
}

const ORG_HEADER = 'x-organisation-id'

function resolveOrganisationIdFromHeader(headerValue: string | string[] | undefined): string | null {
  if (!headerValue) return null
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue
  const trimmed = raw?.trim()
  return trimmed || null
}

/**
 * Resolve the active organisation for a user.
 * Defaults to personal org; optional X-Organisation-Id header for future multi-org.
 */
export async function getCurrentOrganisation(
  userId: string,
  organisationIdHeader?: string | string[] | undefined,
): Promise<Organisation | null> {
  if (!isOrgStoreConfigured()) return null

  const requestedOrgId = resolveOrganisationIdFromHeader(organisationIdHeader)
  if (requestedOrgId) {
    const org = await getOrganisationById(requestedOrgId)
    if (!org) return null
    const member = await getMember(userId, org.id)
    if (!member) return null
    return org
  }

  const personal = await getPersonalOrganisation(userId)
  if (personal) return personal

  // Unmigrated user — no org row yet (backward compat).
  return null
}

export async function getCurrentMemberRole(
  userId: string,
  organisationId: string,
): Promise<OrganisationRole | null> {
  if (!isOrgStoreConfigured()) return null
  const member = await getMember(userId, organisationId)
  return member?.role ?? null
}

export async function hasPermission(
  userId: string,
  organisationId: string | null | undefined,
  permission: Permission,
): Promise<boolean> {
  const { member, permissions } = await resolveMemberContext(userId, organisationId)
  return serverHasPermission(toServerCtx(member, permissions), permission)
}

export async function hasAnyPermission(
  userId: string,
  organisationId: string | null | undefined,
  permissions: Permission[],
): Promise<boolean> {
  const { member, perms } = await resolveMemberContext(userId, organisationId).then((r) => ({
    member: r.member,
    perms: r.permissions,
  }))
  return serverHasAnyPermission(toServerCtx(member, perms), permissions)
}

export async function hasAllPermissions(
  userId: string,
  organisationId: string | null | undefined,
  permissions: Permission[],
): Promise<boolean> {
  const { member, permissions: perms } = await resolveMemberContext(userId, organisationId)
  return serverHasAllPermissions(toServerCtx(member, perms), permissions)
}

async function resolveCasePermission(
  userId: string,
  caseId: string,
  permission: Permission,
  organisationId?: string | null,
): Promise<boolean> {
  if (!isOrgStoreConfigured()) return true

  let orgId = organisationId ?? null
  let organisation: Organisation | null = null
  if (orgId) {
    organisation = await getOrganisationById(orgId)
  } else {
    organisation = await getPersonalOrganisation(userId)
    orgId = organisation?.id ?? null
  }
  if (!orgId || !organisation) return true

  const member = await getMember(userId, orgId)
  if (!member) return false

  const memberPermissions = permissionsForMember(member)
  const effective = effectiveCasePermission(member.role, permission)
  const roleAllowed =
    member.role === 'single_owner' || member.role === 'org_owner'
      ? true
      : memberPermissions.includes(effective)
  if (!roleAllowed) return false

  // Personal single-use: no per-case enforcement when no rows exist (non-therapist).
  const rowCount = await countCaseAccessRows(orgId, caseId)
  if (organisation.tier === 'single_use' && rowCount === 0 && !isTherapistRole(member.role)) {
    return true
  }

  // Org-wide admins bypass case ACL.
  if (isOrgWideCaseBypassRole(member.role)) return true

  // Therapist: must have explicit org_case_access row (any level except no_access).
  if (isTherapistRole(member.role)) {
    const userRow = await getCaseAccessRowForUser(orgId, caseId, userId)
    if (!userRow) return false
    const level = parseCaseAccessLevel(userRow.grantedPermissions)
    return level !== 'no_access'
  }

  // No grants configured — role defaults apply.
  if (rowCount === 0) return true

  const userRow = await getCaseAccessRowForUser(orgId, caseId, userId)
  if (!userRow) return false

  const level = parseCaseAccessLevel(userRow.grantedPermissions)
  if (level === 'no_access') return false

  const casePerms = permissionsForCaseAccessLevel(level)
  return casePerms.includes(permission)
}

export async function canViewCase(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'cases.view')
  return resolveCasePermission(userId, caseId, 'cases.view', organisationId)
}

export async function canEditCase(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'cases.edit')
  return resolveCasePermission(userId, caseId, 'cases.edit', organisationId)
}

export async function canViewPatientIdentity(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'patientIdentity.view')
  return resolveCasePermission(userId, caseId, 'patientIdentity.view', organisationId)
}

export async function canViewClinicalContent(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'clinicalContent.view')
  return resolveCasePermission(userId, caseId, 'clinicalContent.view', organisationId)
}

export async function canEditDocument(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) {
    return hasAnyPermission(userId, organisationId, ['documents.editOwn', 'documents.editAll'])
  }
  return (
    (await resolveCasePermission(userId, caseId, 'documents.editOwn', organisationId)) ||
    (await resolveCasePermission(userId, caseId, 'documents.editAll', organisationId))
  )
}

export async function canFinalizeDocument(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'documents.finalize')
  return resolveCasePermission(userId, caseId, 'documents.finalize', organisationId)
}

export async function canExportDocument(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'documents.export')
  return resolveCasePermission(userId, caseId, 'documents.export', organisationId)
}

export async function canUseAI(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'ai.use')
  return resolveCasePermission(userId, caseId, 'ai.use', organisationId)
}

export async function canManageTemplates(
  userId: string,
  organisationId: string | null | undefined,
): Promise<boolean> {
  return hasAnyPermission(userId, organisationId, ['templates.manageOwn', 'templates.manageOrg'])
}

export async function canInviteUsers(
  userId: string,
  organisationId: string | null | undefined,
): Promise<boolean> {
  return hasPermission(userId, organisationId, 'users.invite')
}

export async function canViewAuditLog(
  userId: string,
  organisationId: string | null | undefined,
): Promise<boolean> {
  return hasPermission(userId, organisationId, 'audit.view')
}

export async function canViewTherapy(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) return hasPermission(userId, organisationId, 'therapy.view')
  const canView = await resolveCasePermission(userId, caseId, 'cases.view', organisationId)
  if (!canView) return false
  return hasPermission(userId, organisationId, 'therapy.view')
}

export async function canCreateTherapyEntry(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  const allowed = await hasAnyPermission(userId, organisationId, [
    'therapy.create',
    'complementaryTherapies.editOwn',
  ])
  if (!allowed) return false
  if (!caseId) return true
  return resolveCasePermission(userId, caseId, 'cases.view', organisationId)
}

export async function canUseTherapyAI(
  userId: string,
  organisationId: string | null | undefined,
  caseId?: string,
): Promise<boolean> {
  if (!caseId) {
    return hasAnyPermission(userId, organisationId, ['ai.useTherapyDocumentation', 'ai.use'])
  }
  const canView = await resolveCasePermission(userId, caseId, 'cases.view', organisationId)
  if (!canView) return false
  return hasPermission(userId, organisationId, 'ai.useTherapyDocumentation')
}

/**
 * Case access — single_use with no rows defaults allow; small_praxis evaluates org_case_access.
 */
export async function canAccessCase(
  userId: string,
  caseId: string,
  permission: Permission,
  organisationId?: string | null,
): Promise<boolean> {
  return resolveCasePermission(userId, caseId, permission, organisationId)
}

/**
 * Module access — default allow when no org_module_access rows exist.
 * When ENABLE_ENTERPRISE_ORG_HIERARCHY=true and tier=enterprise, evaluates org_module_access grants.
 */
export async function canAccessModule(
  userId: string,
  caseId: string | null,
  moduleName: ModuleName,
  permission: Permission,
  organisationId?: string | null,
): Promise<boolean> {
  if (!isOrgStoreConfigured()) return true

  let orgId = organisationId ?? null
  let orgTier: string | null = null
  if (!orgId) {
    const personal = await getPersonalOrganisation(userId)
    orgId = personal?.id ?? null
    orgTier = personal?.tier ?? null
  } else {
    const org = await getOrganisationById(orgId)
    orgTier = org?.tier ?? null
  }
  if (!orgId) return true

  const allowed = await hasPermission(userId, orgId, permission)
  if (!allowed) return false

  const useEnterpriseModuleAccess =
    isEnterpriseOrgHierarchyEnabled() && isEnterpriseTier(orgTier)

  if (!useEnterpriseModuleAccess) return true

  const grant = await evaluateModuleAccessGrant(userId, orgId, caseId, moduleName)
  if (grant === null) return true
  return grant
}

export async function buildOrganisationContext(
  userId: string,
  organisationIdHeader?: string | string[] | undefined,
  displayName?: string | null,
): Promise<OrgPermissionContext> {
  if (!isOrgStoreConfigured()) {
    return { organisation: null, member: null, role: null, permissions: [] }
  }

  const requestedOrgId = resolveOrganisationIdFromHeader(organisationIdHeader)
  if (requestedOrgId) {
    const org = await getOrganisationById(requestedOrgId)
    if (!org) {
      return { organisation: null, member: null, role: null, permissions: [] }
    }
    const member = await getMember(userId, org.id)
    if (!member) {
      return { organisation: org, member: null, role: null, permissions: [] }
    }
    return {
      organisation: org,
      member,
      role: member.role,
      permissions: permissionsForMember(member),
    }
  }

  const { organisation, member } = await ensurePersonalOrganisation(userId, displayName)
  return {
    organisation,
    member,
    role: member.role,
    permissions: permissionsForMember(member),
  }
}

export { ORG_HEADER }

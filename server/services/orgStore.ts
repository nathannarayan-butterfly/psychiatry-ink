import { parseMemberSettings } from '../../src/data/org/memberPermissions'
import type {
  Organisation,
  OrganisationMember,
  OrganisationRole,
  OrganisationTier,
} from '../../src/types/organisation'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

export function mapOrganisation(row: Record<string, unknown>): Organisation {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    tier: row.tier as OrganisationTier,
    isPersonal: Boolean(row.is_personal),
    personalOwnerUserId: row.personal_owner_user_id ? String(row.personal_owner_user_id) : null,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapMember(row: Record<string, unknown>): OrganisationMember {
  const settings = parseMemberSettings(row.settings)
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    role: row.role as OrganisationRole,
    status: row.status as OrganisationMember['status'],
    joinedAt: String(row.joined_at),
    invitedBy: row.invited_by ? String(row.invited_by) : null,
    therapyDiscipline: row.therapy_discipline
      ? (String(row.therapy_discipline) as OrganisationMember['therapyDiscipline'])
      : null,
    therapyDisciplineCustom: row.therapy_discipline_custom
      ? String(row.therapy_discipline_custom)
      : null,
    permissionOverrides: settings.permissionOverrides ?? null,
    aiQuotaMonthly:
      settings && typeof (row.settings as Record<string, unknown>) === 'object' &&
      'aiQuotaMonthly' in ((row.settings as Record<string, unknown>) ?? {})
        ? (settings.aiQuotaMonthly ?? null)
        : undefined,
    aiQuotaUsed: settings.aiQuotaUsed ?? 0,
    aiQuotaPeriodStart: settings.aiQuotaPeriodStart ?? null,
  }
}

export function isOrgStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

export async function provisionPersonalOrganisation(
  userId: string,
  displayName?: string | null,
): Promise<Organisation> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin.rpc('org_provision_personal_org', {
    p_user_id: userId,
    p_name: displayName ?? null,
  })

  if (error) throw new Error(error.message)

  const orgId = String(data)
  const org = await getOrganisationById(orgId)
  if (!org) throw new Error('Failed to load provisioned organisation')
  return org
}

export async function getPersonalOrganisation(userId: string): Promise<Organisation | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_organisations')
    .select('*')
    .eq('personal_owner_user_id', userId)
    .eq('is_personal', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapOrganisation(data)
}

export async function getOrganisationById(organisationId: string): Promise<Organisation | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_organisations')
    .select('*')
    .eq('id', organisationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapOrganisation(data)
}

export async function getMember(
  userId: string,
  organisationId: string,
): Promise<OrganisationMember | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_members')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapMember(data)
}

export async function countCaseAccessRows(
  organisationId: string,
  caseId: string,
): Promise<number> {
  const admin = getKbSupabaseAdmin()
  const { count, error } = await admin
    .from('org_case_access')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export interface CaseAccessRow {
  id: string
  organisationId: string
  caseId: string
  userId: string | null
  grantedPermissions: Record<string, unknown>
  grantedBy: string | null
  createdAt: string
}

function mapCaseAccessRow(row: Record<string, unknown>): CaseAccessRow {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    caseId: String(row.case_id),
    userId: row.user_id ? String(row.user_id) : null,
    grantedPermissions: (row.granted_permissions ?? {}) as Record<string, unknown>,
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    createdAt: String(row.created_at),
  }
}

export async function listCaseAccessRowsForCase(
  organisationId: string,
  caseId: string,
): Promise<CaseAccessRow[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapCaseAccessRow(row as Record<string, unknown>))
}

export async function getCaseAccessRowForUser(
  organisationId: string,
  caseId: string,
  userId: string,
): Promise<CaseAccessRow | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapCaseAccessRow(data as Record<string, unknown>)
}

export async function countModuleAccessRows(
  organisationId: string,
  caseId: string | null,
  moduleName: string,
): Promise<number> {
  const admin = getKbSupabaseAdmin()
  let query = admin
    .from('org_module_access')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .eq('module_name', moduleName)

  if (caseId === null) {
    query = query.is('case_id', null)
  } else {
    query = query.eq('case_id', caseId)
  }

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export interface ModuleAccessRow {
  id: string
  organisationId: string
  caseId: string | null
  moduleName: string
  userId: string | null
  teamId: string | null
  permissions: Record<string, unknown>
}

function mapModuleAccessRow(row: Record<string, unknown>): ModuleAccessRow {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    caseId: row.case_id ? String(row.case_id) : null,
    moduleName: String(row.module_name),
    userId: row.user_id ? String(row.user_id) : null,
    teamId: row.team_id ? String(row.team_id) : null,
    permissions: (row.permissions ?? {}) as Record<string, unknown>,
  }
}

/** Rows for org + module; includes org-wide (case_id null) and case-specific when caseId set. */
export async function listModuleAccessRows(
  organisationId: string,
  caseId: string | null,
  moduleName: string,
): Promise<ModuleAccessRow[]> {
  const admin = getKbSupabaseAdmin()
  let query = admin
    .from('org_module_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('module_name', moduleName)

  if (caseId === null) {
    query = query.is('case_id', null)
  } else {
    query = query.or(`case_id.is.null,case_id.eq.${caseId}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapModuleAccessRow(row as Record<string, unknown>))
}

/**
 * Enterprise module access evaluation.
 * Returns null when no rows exist (caller should default-allow).
 * Returns true/false when rows exist and user grant was evaluated.
 */
export async function evaluateModuleAccessGrant(
  userId: string,
  organisationId: string,
  caseId: string | null,
  moduleName: string,
): Promise<boolean | null> {
  const rows = await listModuleAccessRows(organisationId, caseId, moduleName)
  if (rows.length === 0) return null

  const userRow = rows.find((r) => r.userId === userId)
  if (userRow) {
    const denied = userRow.permissions.denied === true || userRow.permissions.view === false
    return !denied
  }

  // Org-wide allow row (no user/team target) — future: team membership lookup
  const orgWideAllow = rows.some(
    (r) => r.userId === null && r.teamId === null && r.permissions.denied !== true,
  )
  if (orgWideAllow) return true

  return false
}

/** Module access rows targeting a specific user (enterprise evaluation). */
export async function listModuleAccessForUser(
  userId: string,
  organisationId: string,
): Promise<ModuleAccessRow[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_module_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapModuleAccessRow(row as Record<string, unknown>))
}

export async function ensurePersonalOrganisation(
  userId: string,
  displayName?: string | null,
): Promise<{ organisation: Organisation; member: OrganisationMember }> {
  let organisation = await getPersonalOrganisation(userId)
  if (!organisation) {
    organisation = await provisionPersonalOrganisation(userId, displayName)
  }

  let member = await getMember(userId, organisation.id)
  if (!member) {
    await provisionPersonalOrganisation(userId, displayName)
    member = await getMember(userId, organisation.id)
  }

  if (!member) throw new Error('Failed to resolve organisation membership')
  return { organisation, member }
}

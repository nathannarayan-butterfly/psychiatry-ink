import { createHash, randomBytes } from 'node:crypto'
import type {
  CaseAccess,
  Organisation,
  OrganisationInvitation,
  OrganisationMember,
  OrganisationRole,
} from '../../src/types/organisation'
import {
  normalizePermissionOverrides,
  parseMemberSettings,
  validatePermissionOverrides,
} from '../../src/data/org/memberPermissions'
import {
  isGrantLevelAllowed,
  isOrgWideCaseBypassRole,
  normalizeCaseAccessLevel,
  parseCaseAccessLevel,
  parseCaseOwnerFlag,
  type CaseAccessLevel,
} from '../../src/data/org/caseAccessLevels'
import {
  isSmallPraxisInviteRole,
  isSmallPraxisUiRole,
  SMALL_PRAXIS_MAX_USERS,
} from '../../src/data/org/teamRoles'
import {
  validateTherapyDisciplineForRole,
  type TherapyDisciplineInput,
} from '../../src/data/org/therapyDiscipline'
import type { TherapyDiscipline } from '../../src/types/organisation'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { getOrganisationById, mapOrganisation, mapMember, getCaseAccessRowForUser } from './orgStore'

export interface TeamMemberProfile {
  id: string
  userId: string
  role: OrganisationRole
  status: OrganisationMember['status']
  joinedAt: string
  invitedBy: string | null
  email: string | null
  displayName: string | null
  therapyDiscipline?: TherapyDiscipline | null
  therapyDisciplineCustom?: string | null
  permissionOverrides?: OrganisationMember['permissionOverrides']
  aiQuotaMonthly?: number | null
  aiQuotaUsed?: number
}

export interface TeamInvitationView {
  id: string
  email: string
  invitedName: string | null
  role: OrganisationRole
  status: OrganisationInvitation['status']
  expiresAt: string | null
  invitedBy: string
  createdAt: string
  emailDeliveryStatus: OrganisationInvitation['emailDeliveryStatus']
}

export interface CreateInvitationResult {
  invitation: TeamInvitationView
  /** Raw token — only returned once at creation; never stored. */
  inviteUrl: string
}

export interface TeamSnapshot {
  organisation: Organisation
  members: TeamMemberProfile[]
  invitations: TeamInvitationView[]
  memberCount: number
  maxMembers: number
  occupiedSlots: number
}

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function mapInvitation(row: Record<string, unknown>): OrganisationInvitation {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    email: String(row.email),
    invitedName: row.invited_name ? String(row.invited_name) : null,
    role: row.role as OrganisationRole,
    tokenHash: String(row.token_hash),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    status: row.status as OrganisationInvitation['status'],
    invitedBy: String(row.invited_by),
    acceptedByUserId: row.accepted_by_user_id ? String(row.accepted_by_user_id) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    emailDeliveryStatus: (row.email_delivery_status ??
      'not_configured') as OrganisationInvitation['emailDeliveryStatus'],
    createdAt: String(row.created_at),
  }
}

function mapInvitationView(invite: OrganisationInvitation): TeamInvitationView {
  return {
    id: invite.id,
    email: invite.email,
    invitedName: invite.invitedName,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    invitedBy: invite.invitedBy,
    createdAt: invite.createdAt,
    emailDeliveryStatus: invite.emailDeliveryStatus,
  }
}

function mapCaseAccess(row: Record<string, unknown>): CaseAccess {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    caseId: String(row.case_id),
    userId: row.user_id ? String(row.user_id) : null,
    teamId: row.team_id ? String(row.team_id) : null,
    grantedPermissions: (row.granted_permissions ?? {}) as Record<string, unknown>,
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    createdAt: String(row.created_at),
  }
}

export async function getUserProfiles(
  userIds: string[],
): Promise<Record<string, { email: string | null; displayName: string | null }>> {
  const admin = getKbSupabaseAdmin()
  const unique = [...new Set(userIds.filter(Boolean))]
  const result: Record<string, { email: string | null; displayName: string | null }> = {}

  await Promise.all(
    unique.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      if (error || !data?.user) {
        result[userId] = { email: null, displayName: null }
        return
      }
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
      const displayName =
        typeof meta.display_name === 'string'
          ? meta.display_name
          : typeof meta.full_name === 'string'
            ? meta.full_name
            : typeof meta.name === 'string'
              ? meta.name
              : null
      result[userId] = { email: data.user.email ?? null, displayName }
    }),
  )

  return result
}

export async function listOrganisationMembers(
  organisationId: string,
): Promise<OrganisationMember[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_members')
    .select('*')
    .eq('organisation_id', organisationId)
    .neq('status', 'removed')
    .order('joined_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapMember(row as Record<string, unknown>))
}

export async function listPendingInvitations(
  organisationId: string,
): Promise<OrganisationInvitation[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_invitations')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapInvitation(row as Record<string, unknown>))
}

export async function countOccupiedSlots(organisationId: string): Promise<number> {
  const admin = getKbSupabaseAdmin()

  const { count: activeCount, error: activeError } = await admin
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .in('status', ['active', 'invited'])

  if (activeError) throw new Error(activeError.message)

  const { count: inviteCount, error: inviteError } = await admin
    .from('org_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .eq('status', 'pending')

  if (inviteError) throw new Error(inviteError.message)

  return (activeCount ?? 0) + (inviteCount ?? 0)
}

function buildInviteUrl(token: string): string {
  const base = (process.env.APP_PUBLIC_URL ?? process.env.VITE_APP_URL ?? 'http://localhost:5173').replace(
    /\/+$/,
    '',
  )
  return `${base}/team/invite/${encodeURIComponent(token)}`
}

export async function getTeamSnapshot(
  organisationId: string,
  _appOrigin?: string,
): Promise<TeamSnapshot | null> {
  const organisation = await getOrganisationById(organisationId)
  if (!organisation) return null

  const members = await listOrganisationMembers(organisationId)
  const profiles = await getUserProfiles(members.map((m) => m.userId))
  const invitations = await listPendingInvitations(organisationId)
  const occupiedSlots = await countOccupiedSlots(organisationId)

  const memberProfiles: TeamMemberProfile[] = members.map((member) => ({
    id: member.id,
    userId: member.userId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    invitedBy: member.invitedBy,
    email: profiles[member.userId]?.email ?? null,
    displayName: profiles[member.userId]?.displayName ?? null,
    therapyDiscipline: member.therapyDiscipline ?? null,
    therapyDisciplineCustom: member.therapyDisciplineCustom ?? null,
    permissionOverrides: member.permissionOverrides ?? null,
    aiQuotaMonthly: member.aiQuotaMonthly ?? null,
    aiQuotaUsed: member.aiQuotaUsed ?? 0,
  }))

  const invitationViews: TeamInvitationView[] = invitations.map(mapInvitationView)

  const activeMembers = members.filter((m) => m.status === 'active').length

  return {
    organisation,
    members: memberProfiles,
    invitations: invitationViews,
    memberCount: activeMembers,
    maxMembers: SMALL_PRAXIS_MAX_USERS,
    occupiedSlots,
  }
}

export async function updateOrganisationName(
  organisationId: string,
  name: string,
): Promise<Organisation> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Organisation name required')

  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_organisations')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', organisationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapOrganisation(data as Record<string, unknown>)
}

export async function upgradeToSmallPraxis(
  organisationId: string,
  userId: string,
  name?: string | null,
): Promise<Organisation> {
  const org = await getOrganisationById(organisationId)
  if (!org) throw new Error('Organisation not found')
  if (org.tier === 'enterprise') throw new Error('Enterprise tier cannot use Small Praxis upgrade')
  if (org.tier === 'small_praxis') return org

  const admin = getKbSupabaseAdmin()
  const updates: Record<string, unknown> = {
    tier: 'small_praxis',
    updated_at: new Date().toISOString(),
  }
  if (name?.trim()) updates.name = name.trim()

  const { data, error } = await admin
    .from('org_organisations')
    .update(updates)
    .eq('id', organisationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await admin
    .from('org_members')
    .update({ role: 'org_owner' })
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)
    .eq('role', 'single_owner')

  return mapOrganisation(data as Record<string, unknown>)
}

/** Dev-only tier toggle for personal orgs — mirrors upgrade/downgrade without removing members. */
export async function setDevOrganisationTier(
  organisationId: string,
  userId: string,
  tier: 'single_use' | 'small_praxis',
): Promise<Organisation> {
  const org = await getOrganisationById(organisationId)
  if (!org) throw new Error('Organisation not found')
  if (!org.isPersonal) throw new Error('Dev tier toggle only applies to personal organisations')
  if (org.tier === 'enterprise') throw new Error('Enterprise tier cannot be changed via dev toggle')

  if (tier === 'small_praxis') {
    return upgradeToSmallPraxis(organisationId, userId)
  }

  if (org.tier === 'single_use') return org

  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_organisations')
    .update({ tier: 'single_use', updated_at: new Date().toISOString() })
    .eq('id', organisationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await admin
    .from('org_members')
    .update({ role: 'single_owner' })
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)
    .eq('role', 'org_owner')

  return mapOrganisation(data as Record<string, unknown>)
}

export async function createInvitation(
  organisationId: string,
  email: string,
  role: OrganisationRole,
  invitedBy: string,
  appOrigin?: string,
  options: {
    invitedName?: string | null
    discipline?: TherapyDisciplineInput
  } = {},
): Promise<CreateInvitationResult> {
  const normalisedEmail = email.trim().toLowerCase()
  if (!normalisedEmail || !normalisedEmail.includes('@')) {
    throw new Error('Valid email required')
  }
  if (!isSmallPraxisInviteRole(role)) {
    throw new Error('Invalid invite role')
  }

  const discipline = options.discipline ?? {}
  const disciplineError = validateTherapyDisciplineForRole(role, discipline)
  if (disciplineError) throw new Error(disciplineError)

  const occupied = await countOccupiedSlots(organisationId)
  if (occupied >= SMALL_PRAXIS_MAX_USERS) {
    throw new Error(`Maximum ${SMALL_PRAXIS_MAX_USERS} users per organisation`)
  }

  const admin = getKbSupabaseAdmin()

  const { data: existingRow, error: existingError } = await admin
    .from('org_invitations')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('email', normalisedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  if (existingRow) {
    throw new Error('Pending invitation already exists for this email')
  }

  const rawToken = randomBytes(24).toString('hex')
  const tokenHash = hashInviteToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const invitedName = options.invitedName?.trim() || null

  const { data, error } = await admin
    .from('org_invitations')
    .insert({
      organisation_id: organisationId,
      email: normalisedEmail,
      invited_name: invitedName,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'pending',
      invited_by: invitedBy,
      email_delivery_status: 'not_configured',
      therapy_discipline: discipline.therapyDiscipline ?? null,
      therapy_discipline_custom: discipline.therapyDisciplineCustom?.trim() ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const invite = mapInvitation(data as Record<string, unknown>)
  const inviteUrl = appOrigin
    ? `${appOrigin.replace(/\/+$/, '')}/team/invite/${encodeURIComponent(rawToken)}`
    : buildInviteUrl(rawToken)

  return {
    invitation: mapInvitationView(invite),
    inviteUrl,
  }
}

export async function previewInvitation(token: string): Promise<{
  email: string
  role: OrganisationRole
  organisationId: string
  organisationName: string
} | null> {
  const admin = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(token)
  const { data, error } = await admin
    .from('org_invitations')
    .select('email, role, status, expires_at, organisation_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data || data.status !== 'pending') return null

  if (data.expires_at && new Date(String(data.expires_at)) < new Date()) {
    await admin.from('org_invitations').update({ status: 'expired' }).eq('token_hash', tokenHash)
    return null
  }

  const organisation = await getOrganisationById(String(data.organisation_id))
  return {
    email: String(data.email),
    role: data.role as OrganisationRole,
    organisationId: String(data.organisation_id),
    organisationName: organisation?.name ?? 'Organisation',
  }
}

export async function revokeInvitation(
  organisationId: string,
  invitationId: string,
): Promise<void> {
  const admin = getKbSupabaseAdmin()
  const { error } = await admin
    .from('org_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('organisation_id', organisationId)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string | null,
): Promise<{ organisation: Organisation; member: OrganisationMember }> {
  if (!userEmail?.trim()) {
    throw new Error('Signed-in account must have a verified email')
  }

  const admin = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(token)
  const { data: inviteRow, error: inviteError } = await admin
    .from('org_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle()

  if (inviteError) throw new Error(inviteError.message)
  if (!inviteRow) throw new Error('Invitation not found or already used')

  const invite = mapInvitation(inviteRow as Record<string, unknown>)
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    await admin.from('org_invitations').update({ status: 'expired' }).eq('id', invite.id)
    throw new Error('Invitation expired')
  }

  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    throw new Error('Invitation email does not match signed-in account')
  }

  const occupied = await countOccupiedSlots(invite.organisationId)
  if (occupied >= SMALL_PRAXIS_MAX_USERS) {
    throw new Error(`Maximum ${SMALL_PRAXIS_MAX_USERS} users per organisation`)
  }

  const acceptedAt = new Date().toISOString()
  const { data: memberRow, error: memberError } = await admin
    .from('org_members')
    .upsert(
      {
        organisation_id: invite.organisationId,
        user_id: userId,
        role: invite.role,
        status: 'active',
        joined_at: acceptedAt,
        invited_by: invite.invitedBy,
        therapy_discipline: (inviteRow as Record<string, unknown>).therapy_discipline ?? null,
        therapy_discipline_custom:
          (inviteRow as Record<string, unknown>).therapy_discipline_custom ?? null,
      },
      { onConflict: 'organisation_id,user_id' },
    )
    .select('*')
    .single()

  if (memberError) throw new Error(memberError.message)

  await admin
    .from('org_invitations')
    .update({
      status: 'accepted',
      accepted_by_user_id: userId,
      accepted_at: acceptedAt,
    })
    .eq('id', invite.id)

  const organisation = await getOrganisationById(invite.organisationId)
  if (!organisation) throw new Error('Organisation not found')

  return {
    organisation,
    member: mapMember(memberRow as Record<string, unknown>),
  }
}

export interface UpdateMemberInput {
  role?: OrganisationRole
  therapyDiscipline?: TherapyDiscipline | null
  therapyDisciplineCustom?: string | null
  permissionOverrides?: OrganisationMember['permissionOverrides']
  aiQuotaMonthly?: number | null
  resetAiQuotaMonthly?: boolean
}

function mergeMemberSettingsRow(
  existing: Record<string, unknown>,
  patch: {
    permissionOverrides?: OrganisationMember['permissionOverrides']
    aiQuotaMonthly?: number | null
    resetAiQuotaMonthly?: boolean
  },
): Record<string, unknown> {
  const current = parseMemberSettings(existing)
  const next = { ...current }

  if (patch.permissionOverrides !== undefined) {
    next.permissionOverrides = patch.permissionOverrides
  }
  if (patch.resetAiQuotaMonthly) {
    delete next.aiQuotaMonthly
  } else if (patch.aiQuotaMonthly !== undefined) {
    next.aiQuotaMonthly = patch.aiQuotaMonthly
  }
  if (next.aiQuotaUsed === undefined) next.aiQuotaUsed = 0

  return next as Record<string, unknown>
}

export async function updateMember(
  organisationId: string,
  memberId: string,
  input: UpdateMemberInput,
): Promise<OrganisationMember> {
  const admin = getKbSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('org_members')
    .select('*')
    .eq('id', memberId)
    .eq('organisation_id', organisationId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!existing) throw new Error('Member not found')

  const current = mapMember(existing as Record<string, unknown>)
  const role = input.role ?? current.role

  if (input.role && !isSmallPraxisUiRole(input.role)) {
    throw new Error('Invalid role for Small Praxis')
  }

  const resolvedDiscipline: TherapyDisciplineInput = {
    therapyDiscipline: input.therapyDiscipline ?? current.therapyDiscipline ?? null,
    therapyDisciplineCustom:
      input.therapyDisciplineCustom ?? current.therapyDisciplineCustom ?? null,
  }
  const resolvedDisciplineError = validateTherapyDisciplineForRole(role, resolvedDiscipline)
  if (resolvedDisciplineError) throw new Error(resolvedDisciplineError)

  let permissionOverrides = current.permissionOverrides ?? null
  if (input.permissionOverrides !== undefined) {
    permissionOverrides = normalizePermissionOverrides(input.permissionOverrides)
    const validationError = validatePermissionOverrides(role, permissionOverrides)
    if (validationError) throw new Error(validationError)
  }

  if (input.aiQuotaMonthly !== undefined && input.aiQuotaMonthly !== null) {
    if (typeof input.aiQuotaMonthly !== 'number' || !Number.isFinite(input.aiQuotaMonthly)) {
      throw new Error('Invalid aiQuotaMonthly')
    }
    if (input.aiQuotaMonthly < 0) throw new Error('aiQuotaMonthly must be >= 0')
  }

  if (current.role === 'org_owner' || current.role === 'single_owner') {
    if (role !== current.role) {
      const { count, error: ownerCountError } = await admin
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', organisationId)
        .in('role', ['org_owner', 'single_owner'])
        .eq('status', 'active')

      if (ownerCountError) throw new Error(ownerCountError.message)
      if ((count ?? 0) <= 1 && role !== 'org_owner' && role !== 'single_owner') {
        throw new Error('Cannot change role of the last owner')
      }
    }
  }

  if (role === 'org_owner' && current.role !== 'org_owner') {
    const { count, error: ownerCountError } = await admin
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .in('role', ['org_owner', 'single_owner'])
      .eq('status', 'active')
      .neq('id', memberId)

    if (ownerCountError) throw new Error(ownerCountError.message)
    if ((count ?? 0) > 0) {
      throw new Error('Organisation already has an owner')
    }
  }

  const updates: Record<string, unknown> = {}
  if (input.role) updates.role = role
  if (input.role || input.therapyDiscipline !== undefined || input.therapyDisciplineCustom !== undefined) {
    if (role === 'therapist') {
      updates.therapy_discipline = resolvedDiscipline.therapyDiscipline ?? null
      updates.therapy_discipline_custom = resolvedDiscipline.therapyDisciplineCustom?.trim() ?? null
    } else if (input.role) {
      updates.therapy_discipline = null
      updates.therapy_discipline_custom = null
    }
  }

  if (
    input.permissionOverrides !== undefined ||
    input.aiQuotaMonthly !== undefined ||
    input.resetAiQuotaMonthly
  ) {
    updates.settings = mergeMemberSettingsRow(
      (existing as Record<string, unknown>).settings as Record<string, unknown>,
      {
        permissionOverrides,
        ...(input.resetAiQuotaMonthly ? { resetAiQuotaMonthly: true } : {}),
        ...(input.aiQuotaMonthly !== undefined ? { aiQuotaMonthly: input.aiQuotaMonthly } : {}),
      },
    )
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided')
  }

  const { data, error } = await admin
    .from('org_members')
    .update(updates)
    .eq('id', memberId)
    .eq('organisation_id', organisationId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapMember(data as Record<string, unknown>)
}

export async function updateMemberRole(
  organisationId: string,
  memberId: string,
  role: OrganisationRole,
  discipline?: TherapyDisciplineInput,
): Promise<OrganisationMember> {
  if (!isSmallPraxisUiRole(role)) {
    throw new Error('Invalid role for Small Praxis')
  }

  return updateMember(organisationId, memberId, {
    role,
    therapyDiscipline: discipline?.therapyDiscipline ?? null,
    therapyDisciplineCustom: discipline?.therapyDisciplineCustom ?? null,
  })
}

export async function deactivateMember(
  organisationId: string,
  memberId: string,
  actorUserId: string,
): Promise<void> {
  const admin = getKbSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('org_members')
    .select('*')
    .eq('id', memberId)
    .eq('organisation_id', organisationId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!existing) throw new Error('Member not found')

  const current = mapMember(existing as Record<string, unknown>)
  if (current.userId === actorUserId) {
    throw new Error('Cannot deactivate yourself')
  }

  if (current.role === 'org_owner' || current.role === 'single_owner') {
    const { count, error: ownerCountError } = await admin
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .in('role', ['org_owner', 'single_owner'])
      .eq('status', 'active')

    if (ownerCountError) throw new Error(ownerCountError.message)
    if ((count ?? 0) <= 1) {
      throw new Error('Cannot remove the last owner')
    }
  }

  const { error } = await admin
    .from('org_members')
    .update({ status: 'suspended' })
    .eq('id', memberId)
    .eq('organisation_id', organisationId)

  if (error) throw new Error(error.message)
}

export interface CaseAccessMemberGrant {
  userId: string
  level: CaseAccessLevel
  isOwner: boolean
  grantedBy: string | null
  email: string | null
  displayName: string | null
  role: OrganisationRole | null
}

export interface CaseAccessSnapshot {
  caseId: string
  caseOwnerUserId: string | null
  canManage: boolean
  grants: CaseAccessMemberGrant[]
}

export async function getCaseOwnerUserId(
  organisationId: string,
  caseId: string,
): Promise<string | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_access')
    .select('user_id, granted_permissions')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .not('user_id', 'is', null)

  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    const perms = (row.granted_permissions ?? {}) as Record<string, unknown>
    if (perms.isOwner === true && row.user_id) {
      return String(row.user_id)
    }
  }
  return null
}

export async function isCaseOwner(
  organisationId: string,
  caseId: string,
  userId: string,
): Promise<boolean> {
  const ownerId = await getCaseOwnerUserId(organisationId, caseId)
  return ownerId === userId
}

export async function canManageCaseAccess(
  organisationId: string,
  caseId: string,
  userId: string,
  role: OrganisationRole,
): Promise<boolean> {
  if (isOrgWideCaseBypassRole(role)) return true
  return isCaseOwner(organisationId, caseId, userId)
}

export async function claimCaseOwner(
  organisationId: string,
  caseId: string,
  userId: string,
): Promise<CaseAccess> {
  const existingOwner = await getCaseOwnerUserId(organisationId, caseId)
  if (existingOwner && existingOwner !== userId) {
    throw new Error('Case owner already assigned')
  }

  return (
    (await setCaseAccessGrant(organisationId, caseId, userId, 'full_access', userId, {
      isOwner: true,
    })) ?? (() => {
      throw new Error('Failed to claim case owner')
    })()
  )
}

export async function getCaseAccessSnapshot(
  organisationId: string,
  caseId: string,
  actorUserId: string,
  actorRole: OrganisationRole,
): Promise<CaseAccessSnapshot> {
  const admin = getKbSupabaseAdmin()
  const { data: rows, error } = await admin
    .from('org_case_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const members = await listOrganisationMembers(organisationId)
  const activeMembers = members.filter((m) => m.status === 'active')
  const roleByUserId = new Map(activeMembers.map((m) => [m.userId, m.role]))

  const userIds = (rows ?? [])
    .map((r) => (r.user_id ? String(r.user_id) : null))
    .filter(Boolean) as string[]
  const profiles = await getUserProfiles(userIds)

  let caseOwnerUserId: string | null = null
  const grants: CaseAccessMemberGrant[] = []

  for (const row of rows ?? []) {
    const uid = row.user_id ? String(row.user_id) : null
    if (!uid) continue
    const grantedPermissions = (row.granted_permissions ?? {}) as Record<string, unknown>
    const level = parseCaseAccessLevel(grantedPermissions)
    const isOwner = parseCaseOwnerFlag(grantedPermissions)
    if (isOwner) caseOwnerUserId = uid
    if (level === 'no_access') continue
    grants.push({
      userId: uid,
      level,
      isOwner,
      grantedBy: row.granted_by ? String(row.granted_by) : null,
      email: profiles[uid]?.email ?? null,
      displayName: profiles[uid]?.displayName ?? null,
      role: roleByUserId.get(uid) ?? null,
    })
  }

  const canManage = await canManageCaseAccess(organisationId, caseId, actorUserId, actorRole)

  return { caseId, caseOwnerUserId, canManage, grants }
}

export async function listCaseAccessGrants(organisationId: string): Promise<CaseAccess[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_access')
    .select('*')
    .eq('organisation_id', organisationId)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapCaseAccess(row as Record<string, unknown>))
}

export async function setCaseAccessGrant(
  organisationId: string,
  caseId: string,
  userId: string,
  level: CaseAccessLevel,
  grantedBy: string,
  extra: { isOwner?: boolean } = {},
): Promise<CaseAccess | null> {
  const normalized = normalizeCaseAccessLevel(level)

  const admin = getKbSupabaseAdmin()

  if (normalized === 'no_access') {
    const { data: existing, error: fetchError } = await admin
      .from('org_case_access')
      .select('granted_permissions')
      .eq('organisation_id', organisationId)
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (existing && parseCaseOwnerFlag(existing.granted_permissions as Record<string, unknown>)) {
      throw new Error('Cannot revoke case owner access — transfer ownership first')
    }

    const { error } = await admin
      .from('org_case_access')
      .delete()
      .eq('organisation_id', organisationId)
      .eq('case_id', caseId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    return null
  }

  const grantedPermissions: Record<string, unknown> = { level: normalized }
  if (extra.isOwner) grantedPermissions.isOwner = true

  const { data: existing, error: fetchError } = await admin
    .from('org_case_access')
    .select('id, granted_permissions')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)

  if (existing?.id) {
    const prev = (existing.granted_permissions ?? {}) as Record<string, unknown>
    if (prev.isOwner === true) grantedPermissions.isOwner = true

    const { data, error } = await admin
      .from('org_case_access')
      .update({ granted_permissions: grantedPermissions, granted_by: grantedBy })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return mapCaseAccess(data as Record<string, unknown>)
  }

  const { data, error } = await admin
    .from('org_case_access')
    .insert({
      organisation_id: organisationId,
      case_id: caseId,
      user_id: userId,
      granted_permissions: grantedPermissions,
      granted_by: grantedBy,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCaseAccess(data as Record<string, unknown>)
}

export async function setCaseAccessGrantValidated(
  organisationId: string,
  caseId: string,
  targetUserId: string,
  level: CaseAccessLevel,
  actorUserId: string,
  actorRole: OrganisationRole,
): Promise<{ grant: CaseAccess | null; oldLevel: CaseAccessLevel }> {
  const canManage = await canManageCaseAccess(organisationId, caseId, actorUserId, actorRole)
  if (!canManage) throw new Error('Permission denied')

  const members = await listOrganisationMembers(organisationId)
  const targetMember = members.find((m) => m.userId === targetUserId && m.status === 'active')
  if (!targetMember) throw new Error('Target member not found')

  const normalized = normalizeCaseAccessLevel(level)
  if (normalized !== 'no_access' && !isGrantLevelAllowed(normalized, targetMember.role, actorRole)) {
    throw new Error('Access level not allowed for target member role')
  }

  const existing = await getCaseAccessRowForUser(organisationId, caseId, targetUserId)
  const oldLevel = existing ? parseCaseAccessLevel(existing.grantedPermissions) : 'no_access'

  const grant = await setCaseAccessGrant(
    organisationId,
    caseId,
    targetUserId,
    normalized,
    actorUserId,
  )

  return { grant, oldLevel }
}


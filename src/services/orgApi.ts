import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  CaseAccess,
  Organisation,
  OrganisationContext,
  OrganisationMember,
  OrganisationRole,
  PermissionOverrideSet,
  TherapyDiscipline,
} from '../types/organisation'
import type { CaseAccessLevel } from '../data/org/caseAccessLevels'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(detail?.error ?? `${fallback} (${response.status})`)
}

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
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string | null
  invitedBy: string
  createdAt: string
  emailDeliveryStatus: 'not_configured' | 'pending' | 'sent' | 'failed'
}

export interface CreateOrgInviteResult {
  inviteUrl: string
  invitation: TeamInvitationView
}

export function buildTeamInviteUrl(token: string): string {
  const base = window.location.origin.replace(/\/+$/, '')
  return `${base}/team/invite/${encodeURIComponent(token)}`
}

export interface TeamSnapshot {
  organisation: Organisation
  members: TeamMemberProfile[]
  invitations: TeamInvitationView[]
  memberCount: number
  maxMembers: number
  occupiedSlots: number
}

export interface InvitePreview {
  email: string
  role: OrganisationRole
  organisationName: string
}

export async function fetchOrganisationContext(
  organisationId?: string,
): Promise<OrganisationContext> {
  const headers: HeadersInit = {}
  if (organisationId) {
    headers['X-Organisation-Id'] = organisationId
  }

  const response = await apiFetch('/api/org/context', { headers })
  if (!response.ok) await parseError(response, 'Failed to load organisation context')
  return (await response.json()) as OrganisationContext
}

export async function provisionPersonalOrganisation(
  displayName?: string,
): Promise<OrganisationContext & { provisioned: boolean }> {
  const response = await apiFetch('/api/org/provision', {
    method: 'POST',
    body: JSON.stringify(displayName ? { displayName } : {}),
  })
  if (!response.ok) await parseError(response, 'Failed to provision organisation')
  return (await response.json()) as OrganisationContext & { provisioned: boolean }
}

export async function fetchTeamSnapshot(organisationId?: string): Promise<TeamSnapshot> {
  const headers: HeadersInit = {}
  if (organisationId) {
    headers['X-Organisation-Id'] = organisationId
  }
  const response = await apiFetch('/api/org/team', { headers })
  if (!response.ok) await parseError(response, 'Failed to load team settings')
  return (await response.json()) as TeamSnapshot
}

export async function updateOrganisationName(name: string): Promise<Organisation> {
  const response = await apiFetch('/api/org', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  if (!response.ok) await parseError(response, 'Failed to update organisation name')
  const data = (await response.json()) as { organisation: Organisation }
  return data.organisation
}

export async function upgradeToSmallPraxis(name?: string): Promise<OrganisationContext> {
  const response = await apiFetch('/api/org/upgrade-small-praxis', {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {}),
  })
  if (!response.ok) await parseError(response, 'Failed to activate Praxis mode')
  return (await response.json()) as OrganisationContext
}

/** Dev-only — POST /api/org/dev/set-tier (404 in production). */
export async function setDevOrganisationTier(
  tier: 'single_use' | 'small_praxis',
): Promise<OrganisationContext> {
  const response = await apiFetch('/api/org/dev/set-tier', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  })
  if (!response.ok) await parseError(response, 'Failed to switch dev tier')
  return (await response.json()) as OrganisationContext
}

export async function createOrgInvite(
  email: string,
  role: OrganisationRole,
  options?: {
    invitedName?: string | null
    therapyDiscipline?: TherapyDiscipline | null
    therapyDisciplineCustom?: string | null
  },
): Promise<CreateOrgInviteResult> {
  const response = await apiFetch('/api/org/invites', {
    method: 'POST',
    body: JSON.stringify({
      email,
      role,
      ...(options?.invitedName?.trim() ? { invitedName: options.invitedName.trim() } : {}),
      ...(options?.therapyDiscipline
        ? { therapyDiscipline: options.therapyDiscipline }
        : {}),
      ...(options?.therapyDisciplineCustom
        ? { therapyDisciplineCustom: options.therapyDisciplineCustom }
        : {}),
    }),
  })
  if (!response.ok) await parseError(response, 'Failed to create invitation')
  return (await response.json()) as CreateOrgInviteResult
}

export async function acceptOrgInvite(token: string): Promise<{
  organisation: Organisation
  member: OrganisationMember
}> {
  const response = await apiFetch('/api/org/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  if (!response.ok) await parseError(response, 'Failed to accept invitation')
  return (await response.json()) as { organisation: Organisation; member: OrganisationMember }
}

export async function revokeOrgInvite(invitationId: string): Promise<void> {
  const response = await apiFetch(`/api/org/invites/${encodeURIComponent(invitationId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) await parseError(response, 'Failed to revoke invitation')
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const response = await apiFetch(`/api/org/invites/preview/${encodeURIComponent(token)}`)
  if (!response.ok) await parseError(response, 'Invitation not found')
  return (await response.json()) as InvitePreview
}

export async function updateOrgMember(
  memberId: string,
  payload: {
    role?: OrganisationRole
    therapyDiscipline?: TherapyDiscipline | null
    therapyDisciplineCustom?: string | null
    permissionOverrides?: PermissionOverrideSet | null
    aiQuotaMonthly?: number | null
    resetAiQuotaMonthly?: boolean
  },
): Promise<OrganisationMember> {
  const response = await apiFetch(`/api/org/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!response.ok) await parseError(response, 'Failed to update member')
  const data = (await response.json()) as { member: OrganisationMember }
  return data.member
}

export async function updateOrgMemberRole(
  memberId: string,
  role: OrganisationRole,
  discipline?: {
    therapyDiscipline?: TherapyDiscipline | null
    therapyDisciplineCustom?: string | null
  },
): Promise<OrganisationMember> {
  const response = await apiFetch(`/api/org/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      role,
      ...(discipline?.therapyDiscipline
        ? { therapyDiscipline: discipline.therapyDiscipline }
        : {}),
      ...(discipline?.therapyDisciplineCustom
        ? { therapyDisciplineCustom: discipline.therapyDisciplineCustom }
        : {}),
    }),
  })
  if (!response.ok) await parseError(response, 'Failed to update member role')
  const data = (await response.json()) as { member: OrganisationMember }
  return data.member
}

export async function deactivateOrgMember(memberId: string): Promise<void> {
  const response = await apiFetch(`/api/org/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) await parseError(response, 'Failed to deactivate member')
}

export async function fetchCaseAccessGrants(): Promise<CaseAccess[]> {
  const response = await apiFetch('/api/org/case-access')
  if (!response.ok) await parseError(response, 'Failed to load case access')
  const data = (await response.json()) as { grants: CaseAccess[] }
  return data.grants
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

export async function fetchCaseAccessSnapshot(caseId: string): Promise<CaseAccessSnapshot> {
  const response = await apiFetch(`/api/org/case-access/${encodeURIComponent(caseId)}`)
  if (!response.ok) await parseError(response, 'Failed to load case access')
  return (await response.json()) as CaseAccessSnapshot
}

export async function setCaseAccessForCase(
  caseId: string,
  userId: string,
  level: CaseAccessLevel,
): Promise<{ grant: CaseAccess | null; snapshot: CaseAccessSnapshot }> {
  const response = await apiFetch(`/api/org/case-access/${encodeURIComponent(caseId)}`, {
    method: 'PUT',
    body: JSON.stringify({ userId, level }),
  })
  if (!response.ok) await parseError(response, 'Failed to set case access')
  return (await response.json()) as { grant: CaseAccess | null; snapshot: CaseAccessSnapshot }
}

export async function claimCaseOwner(caseId: string): Promise<{
  grant: CaseAccess
  snapshot: CaseAccessSnapshot
}> {
  const response = await apiFetch('/api/org/case-access/claim-owner', {
    method: 'POST',
    body: JSON.stringify({ caseId }),
  })
  if (!response.ok) await parseError(response, 'Failed to claim case owner')
  return (await response.json()) as { grant: CaseAccess; snapshot: CaseAccessSnapshot }
}

export async function setCaseAccessGrant(
  caseId: string,
  userId: string,
  level: CaseAccessLevel,
): Promise<CaseAccess | null> {
  const response = await apiFetch('/api/org/case-access', {
    method: 'PUT',
    body: JSON.stringify({ caseId, userId, level }),
  })
  if (!response.ok) await parseError(response, 'Failed to set case access')
  const data = (await response.json()) as { grant: CaseAccess | null }
  return data.grant
}

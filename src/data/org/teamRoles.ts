import type { OrganisationRole, OrganisationTier } from '../../types/organisation'
import type { UiTranslationKey } from '../uiTranslations'

/** Small Praxis UI roles — do not expose enterprise roles. */
export const SMALL_PRAXIS_UI_ROLES = [
  'org_owner',
  'org_admin',
  'clinician',
  'psychologist',
  'assistant',
  'therapist',
  'viewer',
] as const satisfies readonly OrganisationRole[]

export type SmallPraxisUiRole = (typeof SMALL_PRAXIS_UI_ROLES)[number]

/** Roles selectable when inviting — owner transfer deferred. */
export const SMALL_PRAXIS_INVITE_ROLES = [
  'org_admin',
  'clinician',
  'psychologist',
  'assistant',
  'therapist',
  'viewer',
] as const satisfies readonly OrganisationRole[]

export type SmallPraxisInviteRole = (typeof SMALL_PRAXIS_INVITE_ROLES)[number]

/** Enterprise tier roles surfaced in advanced RBAC stub UI. */
export const ENTERPRISE_ROLE_LIST: readonly OrganisationRole[] = [
  'org_owner',
  'org_admin',
  'site_admin',
  'department_admin',
  'clinical_lead',
  'clinician',
  'psychologist',
  'therapist',
  'nursing',
  'social_worker',
  'assistant',
  'viewer',
  'external_consultant',
  'auditor',
  'it_admin',
] as const

export const SMALL_PRAXIS_MAX_USERS = 4

export const TEAM_ROLE_LABEL_KEYS: Record<
  SmallPraxisUiRole | 'single_owner',
  UiTranslationKey
> = {
  single_owner: 'orgRoleSingleOwner',
  org_owner: 'orgRoleOrgOwner',
  org_admin: 'orgRoleOrgAdmin',
  clinician: 'orgRoleClinician',
  psychologist: 'orgRolePsychologist',
  assistant: 'orgRoleAssistant',
  therapist: 'orgRoleTherapist',
  viewer: 'orgRoleViewer',
}

/** @deprecated Use teamRoleLabelKey + translateUi — kept for DE-only call sites. */
export const TEAM_ROLE_LABELS_DE: Record<SmallPraxisUiRole | 'single_owner', string> = {
  single_owner: 'Owner',
  org_owner: 'Owner',
  org_admin: 'Admin',
  clinician: 'Arzt/Ärztin',
  psychologist: 'Psychologe/Psychologin',
  assistant: 'Assistent/in',
  therapist: 'Therapeut/in / Fachtherapeut/in',
  viewer: 'Leser/in',
}

export function teamRoleLabelKey(role: OrganisationRole): UiTranslationKey | null {
  if (role === 'single_owner') return TEAM_ROLE_LABEL_KEYS.single_owner
  if (role in TEAM_ROLE_LABEL_KEYS) {
    return TEAM_ROLE_LABEL_KEYS[role as SmallPraxisUiRole]
  }
  return null
}

export function teamRoleLabelDe(role: OrganisationRole): string {
  if (role === 'single_owner') return TEAM_ROLE_LABELS_DE.single_owner
  if (role in TEAM_ROLE_LABELS_DE) {
    return TEAM_ROLE_LABELS_DE[role as SmallPraxisUiRole]
  }
  return role
}

export function isSmallPraxisInviteRole(role: string): role is SmallPraxisInviteRole {
  return (SMALL_PRAXIS_INVITE_ROLES as readonly string[]).includes(role)
}

export function isSmallPraxisUiRole(role: string): role is SmallPraxisUiRole {
  return (SMALL_PRAXIS_UI_ROLES as readonly string[]).includes(role)
}

/**
 * Therapist is hidden on single_use unless the org already has >1 member.
 * Always shown for small_praxis / enterprise invite flows.
 */
export function isTherapistRoleVisible(
  tier: OrganisationTier,
  memberCount: number,
): boolean {
  if (tier === 'small_praxis' || tier === 'enterprise') return true
  if (tier === 'single_use' && memberCount > 1) return true
  return false
}

/** Invite dropdown roles filtered by tier and team visibility rules. */
export function resolveInviteRolesForOrg(
  tier: OrganisationTier,
  memberCount: number,
): readonly OrganisationRole[] {
  return SMALL_PRAXIS_INVITE_ROLES.filter((role) => {
    if (role === 'therapist') return isTherapistRoleVisible(tier, memberCount)
    return true
  })
}

/** UI role lists (member table) — same therapist visibility gate as invites. */
export function resolveUiRolesForOrg(
  tier: OrganisationTier,
  memberCount: number,
): readonly OrganisationRole[] {
  return SMALL_PRAXIS_UI_ROLES.filter((role) => {
    if (role === 'therapist') return isTherapistRoleVisible(tier, memberCount)
    return true
  })
}

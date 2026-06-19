import type { OrganisationRole } from '../../types/organisation'

/**
 * Authority ranking for organisation roles. Lower number = higher authority.
 *
 * Used for task assignment: a higher-order member may assign tasks to members
 * at or below their own level. This is intentionally separate from the
 * fine-grained `Permission` catalogue — it captures the org *chain of command*
 * for delegation, not feature access.
 */
export const ROLE_RANK: Record<OrganisationRole, number> = {
  single_owner: 0,
  org_owner: 0,
  org_admin: 10,
  it_admin: 15,
  site_admin: 20,
  department_admin: 30,
  clinical_lead: 40,
  clinician: 50,
  psychologist: 50,
  nursing: 60,
  social_worker: 60,
  therapist: 60,
  assistant: 70,
  auditor: 75,
  external_consultant: 78,
  viewer: 80,
}

const DEFAULT_RANK = 80

export function roleRank(role: OrganisationRole | null | undefined): number {
  if (!role) return DEFAULT_RANK
  return ROLE_RANK[role] ?? DEFAULT_RANK
}

/**
 * Roles allowed to *assign* tasks to others (the "higher-order" members).
 * Owners, admins, site/department leads and clinical leads can delegate.
 */
export function isTaskAssignerRole(role: OrganisationRole | null | undefined): boolean {
  return roleRank(role) <= ROLE_RANK.clinical_lead
}

/**
 * Whether an actor may assign a task to a target member.
 *
 * Rules:
 * - The actor must hold an assigner role (higher-order).
 * - The target must be at or below the actor's authority level
 *   (`roleRank(target) >= roleRank(actor)`), i.e. never assign *upward*.
 * - Owners (rank 0) may assign to anyone in the org.
 */
export function canAssignTaskTo(
  actorRole: OrganisationRole | null | undefined,
  targetRole: OrganisationRole | null | undefined,
): boolean {
  if (!isTaskAssignerRole(actorRole)) return false
  return roleRank(targetRole) >= roleRank(actorRole)
}

import type { OrganisationRole, Permission } from '../../types/organisation'

export function isTherapistRole(role: OrganisationRole | null | undefined): boolean {
  return role === 'therapist'
}

/** Map clinician-oriented checks to therapist-scoped permissions. */
export function effectiveCasePermission(
  role: OrganisationRole | null | undefined,
  permission: Permission,
): Permission {
  if (!isTherapistRole(role)) return permission
  if (permission === 'cases.view') return 'cases.viewAssigned'
  if (permission === 'clinicalContent.view') return 'clinicalSummary.viewLimited'
  if (permission === 'ai.use') return 'ai.useTherapyDocumentation'
  return permission
}

export function therapistRequiresCaseAssignment(role: OrganisationRole | null | undefined): boolean {
  return isTherapistRole(role)
}

import type { OrganisationRole, Permission } from '../../types/organisation'
import type { UiTranslationKey } from '../uiTranslations'

/** Per-case access level stored in org_case_access.granted_permissions.level */
export type CaseAccessLevel =
  | 'no_access'
  | 'admin_only'
  | 'read_only'
  | 'clinical_edit'
  | 'full_access'

/** Legacy levels from earlier MVP — mapped on read. */
export type LegacyCaseAccessLevel = 'none' | 'read_only' | 'edit_documents' | 'full'

export const CASE_ACCESS_LEVELS: readonly CaseAccessLevel[] = [
  'no_access',
  'admin_only',
  'read_only',
  'clinical_edit',
  'full_access',
] as const

/** Levels shown in grant UI (exclude explicit deny — use remove instead). */
export const CASE_ACCESS_GRANT_LEVELS: readonly CaseAccessLevel[] = [
  'admin_only',
  'read_only',
  'clinical_edit',
  'full_access',
] as const

/** @deprecated DE-only — use CASE_ACCESS_LABEL_KEYS + translateUi for localized labels. */
export const CASE_ACCESS_LABELS_DE: Record<CaseAccessLevel, string> = {
  no_access: 'Kein Zugriff',
  admin_only: 'Nur Verwaltung',
  read_only: 'Nur Lesen',
  clinical_edit: 'Klinisch bearbeiten',
  full_access: 'Vollzugriff',
}

export const CASE_ACCESS_LABEL_KEYS: Record<CaseAccessLevel, UiTranslationKey> = {
  no_access: 'caseAccessLevelNoAccess',
  admin_only: 'caseAccessLevelAdminOnly',
  read_only: 'caseAccessLevelReadOnly',
  clinical_edit: 'caseAccessLevelClinicalEdit',
  full_access: 'caseAccessLevelFullAccess',
}

/** Permission bundles per access level — enforced server-side when rows exist. */
export const CASE_ACCESS_PERMISSIONS: Record<CaseAccessLevel, Permission[]> = {
  no_access: [],
  admin_only: ['cases.view'],
  read_only: ['cases.view', 'clinicalContent.view', 'documents.export'],
  clinical_edit: [
    'cases.view',
    'clinicalContent.view',
    'patientIdentity.view',
    'documents.create',
    'documents.editOwn',
    'documents.export',
    'ai.use',
    'templates.use',
    'medication.view',
    'labs.view',
  ],
  full_access: [
    'cases.view',
    'cases.edit',
    'cases.archive',
    'clinicalContent.view',
    'patientIdentity.view',
    'documents.create',
    'documents.editOwn',
    'documents.editAll',
    'documents.finalize',
    'documents.export',
    'ai.use',
    'templates.use',
    'templates.manageOwn',
    'medication.view',
    'medication.propose',
    'labs.view',
    'labs.import',
    'discussion.create',
    'consultation.create',
  ],
}

const LEGACY_LEVEL_MAP: Record<LegacyCaseAccessLevel, CaseAccessLevel> = {
  none: 'no_access',
  read_only: 'read_only',
  edit_documents: 'clinical_edit',
  full: 'full_access',
}

export function isCaseAccessLevel(value: string): value is CaseAccessLevel {
  return (CASE_ACCESS_LEVELS as readonly string[]).includes(value)
}

export function normalizeCaseAccessLevel(value: string): CaseAccessLevel {
  if (isCaseAccessLevel(value)) return value
  if (value in LEGACY_LEVEL_MAP) {
    return LEGACY_LEVEL_MAP[value as LegacyCaseAccessLevel]
  }
  return 'no_access'
}

export function parseCaseAccessLevel(
  grantedPermissions: Record<string, unknown> | null | undefined,
): CaseAccessLevel {
  const level = grantedPermissions?.level
  return typeof level === 'string' ? normalizeCaseAccessLevel(level) : 'no_access'
}

export function parseCaseOwnerFlag(
  grantedPermissions: Record<string, unknown> | null | undefined,
): boolean {
  return grantedPermissions?.isOwner === true
}

/** Roles that bypass case-level ACL (org-wide management). */
export function isOrgWideCaseBypassRole(role: OrganisationRole): boolean {
  return role === 'single_owner' || role === 'org_owner' || role === 'org_admin'
}

/** Roles allowed to manage case sharing (org-wide or per-case owner). */
export function canManageCaseSharingByRole(role: OrganisationRole): boolean {
  return isOrgWideCaseBypassRole(role)
}

/** Maximum level a granter may assign to a target member role. */
export function maxGrantLevelForTargetRole(
  targetRole: OrganisationRole,
  granterRole: OrganisationRole,
): CaseAccessLevel {
  if (targetRole === 'viewer') return 'read_only'
  if (targetRole === 'therapist') return 'clinical_edit'
  if (targetRole === 'assistant') {
    return isOrgWideCaseBypassRole(granterRole) ? 'full_access' : 'clinical_edit'
  }
  return 'full_access'
}

export function isGrantLevelAllowed(
  level: CaseAccessLevel,
  targetRole: OrganisationRole,
  granterRole: OrganisationRole,
): boolean {
  if (level === 'no_access') return true
  const max = maxGrantLevelForTargetRole(targetRole, granterRole)
  const order: CaseAccessLevel[] = [
    'no_access',
    'admin_only',
    'read_only',
    'clinical_edit',
    'full_access',
  ]
  return order.indexOf(level) <= order.indexOf(max)
}

export function permissionsForCaseAccessLevel(level: CaseAccessLevel): Permission[] {
  return CASE_ACCESS_PERMISSIONS[level] ?? []
}

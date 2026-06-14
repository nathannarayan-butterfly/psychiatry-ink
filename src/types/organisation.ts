/** Organisation tier — schema only until Step 2 billing/UI. */
export type OrganisationTier = 'single_use' | 'small_praxis' | 'enterprise'

export type OrganisationMemberStatus = 'active' | 'invited' | 'suspended' | 'removed'

export type OrganisationInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type InvitationEmailDeliveryStatus =
  | 'not_configured'
  | 'pending'
  | 'sent'
  | 'failed'

/**
 * Organisation-scoped roles. Stored on org_members.role.
 * single_owner: personal org owner (Single Use mode).
 */
export type OrganisationRole =
  | 'single_owner'
  | 'org_owner'
  | 'org_admin'
  | 'site_admin'
  | 'department_admin'
  | 'clinical_lead'
  | 'clinician'
  | 'psychologist'
  | 'nursing'
  | 'social_worker'
  | 'assistant'
  | 'viewer'
  | 'external_consultant'
  | 'auditor'
  | 'it_admin'
  | 'therapist'

/** Allied therapy discipline — required on org_members when role is therapist. */
export type TherapyDiscipline =
  | 'ergotherapy'
  | 'sports_therapy'
  | 'music_therapy'
  | 'art_therapy'
  | 'physiotherapy'
  | 'occupational_therapy'
  | 'skills_group'
  | 'group_therapy'
  | 'custom'

/** Fine-grained permissions — enforced in Step 2; mapped from roles in rolePermissions.ts */
export type Permission =
  | 'org.manage'
  | 'billing.manage'
  | 'users.invite'
  | 'users.remove'
  | 'roles.manage'
  | 'departments.manage'
  | 'cases.create'
  | 'cases.view'
  | 'cases.edit'
  | 'cases.archive'
  | 'cases.delete'
  | 'patientIdentity.view'
  | 'clinicalContent.view'
  | 'documents.create'
  | 'documents.editOwn'
  | 'documents.editAll'
  | 'documents.finalize'
  | 'documents.sign'
  | 'documents.export'
  | 'ai.use'
  | 'templates.use'
  | 'templates.manageOwn'
  | 'templates.manageOrg'
  | 'medication.view'
  | 'medication.propose'
  | 'medication.approve'
  | 'labs.view'
  | 'labs.import'
  | 'discussion.create'
  | 'discussion.inviteInternal'
  | 'discussion.inviteExternal'
  | 'consultation.create'
  | 'consultation.respond'
  | 'audit.view'
  | 'integrations.manage'
  | 'security.manage'
  | 'cases.viewAssigned'
  | 'clinicalSummary.viewLimited'
  | 'therapy.view'
  | 'therapy.create'
  | 'therapy.editOwn'
  | 'therapy.sessionNote.create'
  | 'therapy.sessionNote.editOwn'
  | 'complementaryTherapies.view'
  | 'complementaryTherapies.editOwn'
  | 'verlauf.createTherapyEntry'
  | 'documents.contributeText'
  | 'ai.useTherapyDocumentation'

export type ModuleName =
  | 'workspace'
  | 'dokumente'
  | 'diagnostik'
  | 'discussion'
  | 'consultation'
  | 'medication'
  | 'ai'
  | 'templates'
  | 'therapy'

export interface Organisation {
  id: string
  name: string
  slug: string
  tier: OrganisationTier
  isPersonal: boolean
  personalOwnerUserId: string | null
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface PermissionOverrideSet {
  grant?: Permission[]
  revoke?: Permission[]
}

export interface OrganisationMember {
  id: string
  organisationId: string
  userId: string
  role: OrganisationRole
  status: OrganisationMemberStatus
  joinedAt: string
  invitedBy: string | null
  /** Required when role is therapist. */
  therapyDiscipline?: TherapyDiscipline | null
  therapyDisciplineCustom?: string | null
  /** Additional grants / revocations beyond role defaults (Small Praxis). */
  permissionOverrides?: PermissionOverrideSet | null
  /** null = org default or unlimited */
  aiQuotaMonthly?: number | null
  aiQuotaUsed?: number
  aiQuotaPeriodStart?: string | null
}

export interface TeamOrDepartment {
  id: string
  organisationId: string
  name: string
  parentId: string | null
  siteId: string | null
  teamType?: 'department' | 'unit' | 'team'
}

/** Enterprise org settings stored in org_organisations.settings.enterprise */
export interface EnterpriseSettings {
  externalConsultantMode?: boolean
  orgTemplatesEnabled?: boolean
  /** Org-defined custom therapy discipline labels (enterprise settings stub). */
  customTherapyDisciplines?: string[]
}

/** Advanced role assignment — API stub for enterprise RBAC UI. */
export interface EnterpriseRoleAssignment {
  userId: string
  role: OrganisationRole
  siteId?: string | null
  teamId?: string | null
  scope: 'organisation' | 'site' | 'department' | 'team'
}

export interface CaseAccess {
  id: string
  organisationId: string
  caseId: string
  userId: string | null
  teamId: string | null
  grantedPermissions: Record<string, unknown>
  grantedBy: string | null
  createdAt: string
}

export interface ModuleAccess {
  id: string
  organisationId: string
  caseId: string | null
  moduleName: ModuleName
  userId: string | null
  teamId: string | null
  permissions: Record<string, unknown>
}

export interface OrganisationInvitation {
  id: string
  organisationId: string
  email: string
  invitedName: string | null
  role: OrganisationRole
  tokenHash: string
  expiresAt: string | null
  status: OrganisationInvitationStatus
  invitedBy: string
  acceptedByUserId: string | null
  acceptedAt: string | null
  emailDeliveryStatus: InvitationEmailDeliveryStatus
  createdAt: string
}

export interface OrganisationAuditLog {
  id: string
  organisationId: string
  actorUserId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface OrganisationContext {
  organisation: Organisation
  role: OrganisationRole
  permissions: Permission[]
  member?: OrganisationMember | null
  /** Populated when enterprise hierarchy flag is on and tier=enterprise. */
  moduleAccess?: ModuleAccess[]
}

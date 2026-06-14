import type { OrganisationRole, Permission } from '../../types/organisation'

/** Complete permission catalogue — single source of truth for role mappings. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  'org.manage',
  'billing.manage',
  'users.invite',
  'users.remove',
  'roles.manage',
  'departments.manage',
  'cases.create',
  'cases.view',
  'cases.edit',
  'cases.archive',
  'cases.delete',
  'patientIdentity.view',
  'clinicalContent.view',
  'documents.create',
  'documents.editOwn',
  'documents.editAll',
  'documents.finalize',
  'documents.sign',
  'documents.export',
  'ai.use',
  'templates.use',
  'templates.manageOwn',
  'templates.manageOrg',
  'medication.view',
  'medication.propose',
  'medication.approve',
  'labs.view',
  'labs.import',
  'discussion.create',
  'discussion.inviteInternal',
  'discussion.inviteExternal',
  'consultation.create',
  'consultation.respond',
  'audit.view',
  'integrations.manage',
  'security.manage',
  'cases.viewAssigned',
  'clinicalSummary.viewLimited',
  'therapy.view',
  'therapy.create',
  'therapy.editOwn',
  'therapy.sessionNote.create',
  'therapy.sessionNote.editOwn',
  'complementaryTherapies.view',
  'complementaryTherapies.editOwn',
  'verlauf.createTherapyEntry',
  'documents.contributeText',
  'ai.useTherapyDocumentation',
] as const

const CLINICAL_READ: Permission[] = [
  'cases.view',
  'patientIdentity.view',
  'clinicalContent.view',
  'documents.export',
  'medication.view',
  'labs.view',
  'templates.use',
]

const CLINICAL_WRITE: Permission[] = [
  ...CLINICAL_READ,
  'cases.create',
  'cases.edit',
  'cases.archive',
  'documents.create',
  'documents.editOwn',
  'documents.finalize',
  'documents.sign',
  'ai.use',
  'templates.manageOwn',
  'medication.propose',
  'labs.import',
  'discussion.create',
  'discussion.inviteInternal',
  'consultation.create',
]

const ADMIN_ORG: Permission[] = [
  ...ALL_PERMISSIONS.filter((p) => p !== 'billing.manage'),
]

const SITE_ADMIN: Permission[] = [
  'org.manage',
  'users.invite',
  'users.remove',
  'roles.manage',
  'departments.manage',
  'cases.create',
  'cases.view',
  'cases.edit',
  'cases.archive',
  'patientIdentity.view',
  'clinicalContent.view',
  'documents.create',
  'documents.editOwn',
  'documents.editAll',
  'documents.finalize',
  'documents.sign',
  'documents.export',
  'ai.use',
  'templates.use',
  'templates.manageOwn',
  'templates.manageOrg',
  'medication.view',
  'medication.propose',
  'medication.approve',
  'labs.view',
  'labs.import',
  'discussion.create',
  'discussion.inviteInternal',
  'discussion.inviteExternal',
  'consultation.create',
  'consultation.respond',
  'audit.view',
]

/**
 * Default permission sets per role.
 * Step 2 will enforce these; Step 1 only exposes them via /api/org/context.
 */
export const ROLE_PERMISSIONS: Record<OrganisationRole, Permission[]> = {
  // Personal org owner — full access (Single Use mode).
  single_owner: [...ALL_PERMISSIONS],

  // Organisation owner — full access including billing.
  org_owner: [...ALL_PERMISSIONS],

  // Day-to-day admin: all except billing (reserved for org_owner).
  org_admin: ADMIN_ORG,

  // Enterprise site lead: user/dept management + full clinical within site.
  site_admin: SITE_ADMIN,

  // Department lead: team cases + clinical workflow, limited org admin.
  department_admin: [
    'departments.manage',
    'users.invite',
    'cases.create',
    'cases.view',
    'cases.edit',
    'cases.archive',
    'patientIdentity.view',
    'clinicalContent.view',
    'documents.create',
    'documents.editOwn',
    'documents.editAll',
    'documents.finalize',
    'documents.sign',
    'documents.export',
    'ai.use',
    'templates.use',
    'templates.manageOwn',
    'medication.view',
    'medication.propose',
    'medication.approve',
    'labs.view',
    'labs.import',
    'discussion.create',
    'discussion.inviteInternal',
    'consultation.create',
    'consultation.respond',
    'audit.view',
  ],

  // Senior clinician: oversight + approve medication, no org admin.
  clinical_lead: [
    ...CLINICAL_WRITE,
    'documents.editAll',
    'medication.approve',
    'discussion.inviteExternal',
    'consultation.respond',
    'audit.view',
  ],

  // Standard treating clinician — full clinical workflow defaults.
  clinician: CLINICAL_WRITE,

  // Psychologist — clinical minus medication approval.
  psychologist: CLINICAL_WRITE.filter((p) => p !== 'medication.approve'),

  // Nursing — view/edit cases, labs, own documents; no delete/archive.
  nursing: [
    'cases.view',
    'cases.edit',
    'patientIdentity.view',
    'clinicalContent.view',
    'documents.create',
    'documents.editOwn',
    'documents.export',
    'labs.view',
    'labs.import',
    'medication.view',
    'templates.use',
    'discussion.create',
    'consultation.create',
  ],

  // Social work — case view, discussion, limited documentation.
  social_worker: [
    'cases.view',
    'clinicalContent.view',
    'documents.create',
    'documents.editOwn',
    'documents.export',
    'discussion.create',
    'discussion.inviteInternal',
    'templates.use',
  ],

  // Admin assistant — scheduling/docs support, no clinical identity.
  assistant: [
    'cases.view',
    'clinicalContent.view',
    'documents.create',
    'documents.editOwn',
    'documents.export',
    'templates.use',
    'templates.manageOwn',
    'labs.view',
  ],

  // Read-only observer.
  viewer: CLINICAL_READ,

  // External specialist — respond to consultations only (+ minimal read).
  external_consultant: [
    'clinicalContent.view',
    'consultation.respond',
    'documents.export',
  ],

  // Compliance — audit trail + read-only clinical (no identity by default).
  auditor: [
    'audit.view',
    'clinicalContent.view',
    'cases.view',
    'documents.export',
  ],

  // IT — integrations and security, no clinical write.
  it_admin: [
    'integrations.manage',
    'security.manage',
    'users.invite',
    'users.remove',
    'audit.view',
  ],

  /**
   * Allied therapist — assigned cases only; therapy documentation without
   * medication approval, diagnosis confirm, document finalize/sign, or org admin.
   */
  therapist: [
    'cases.viewAssigned',
    'clinicalSummary.viewLimited',
    'therapy.view',
    'therapy.create',
    'therapy.editOwn',
    'therapy.sessionNote.create',
    'therapy.sessionNote.editOwn',
    'complementaryTherapies.view',
    'complementaryTherapies.editOwn',
    'verlauf.createTherapyEntry',
    'documents.contributeText',
    'ai.useTherapyDocumentation',
  ],
}

export function permissionsForRole(role: OrganisationRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function roleHasPermission(role: OrganisationRole, permission: Permission): boolean {
  if (role === 'single_owner' || role === 'org_owner') return true
  return permissionsForRole(role).includes(permission)
}

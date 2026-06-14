export const AUDIT_ACTIONS = [
  'user_login',
  'case_opened',
  'patient_identity_viewed',
  'clinical_document_viewed',
  'document_created',
  'document_edited',
  'document_finalized',
  'document_exported',
  'ai_generation_used',
  'user_invited',
  'invitation_accepted',
  'invitation_revoked',
  'member_deactivated',
  'permission_changed',
  'case_access_changed',
  'case_vault_key_granted',
  'case_vault_snapshot_saved',
  'external_consultant_invited',
  'consultation_packet_opened',
  'discussion_opened',
  'discussion_invite_external',
  'calendar_item_created',
  'calendar_item_completed',
  'calendar_item_rescheduled',
  'calendar_item_cancelled',
  'kb_admin_mutation',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLogEntry {
  id: string
  organisationId: string
  userId: string | null
  caseId: string | null
  documentId: string | null
  action: AuditAction
  createdAt: string
  metadata: Record<string, unknown>
  ip: string | null
  userAgent: string | null
}

export interface RecordAuditLogInput {
  organisationId: string
  userId: string
  action: AuditAction
  caseId?: string | null
  documentId?: string | null
  metadata?: Record<string, unknown>
}

export interface AuditLogFilters {
  action?: AuditAction
  caseId?: string
  userId?: string
  limit?: number
  offset?: number
}

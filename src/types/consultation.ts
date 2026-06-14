/** Konsil / External Consultant Mode types (separate from DiscussCase). */

export type ConsultationRole =
  | 'clinician'
  | 'internal_consultant'
  | 'external_consultant'
  | 'one_time_external_consultant'

export type ConsultationAccessType =
  | 'internal_consultant'
  | 'external_consultant'
  | 'one_time_external'

export type ConsultationUrgency = 'routine' | 'urgent' | 'emergency'

export type PatientIdentifierMode = 'full' | 'pseudonymized' | 'deidentified'

export type ConsultationRequestStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'in_progress'
  | 'more_info_requested'
  | 'submitted'
  | 'cancelled'
  | 'archived'

export type ConsultationReportStatus = 'draft' | 'submitted' | 'withdrawn'

export type PatientExamined = 'yes' | 'no' | 'not_applicable'

export type SharedItemType = 'section' | 'attachment' | 'befunde' | 'custom_text'

export type ConsultationMessageType =
  | 'message'
  | 'request_more_information'
  | 'clinician_response'

export type ConsultationAuditAction =
  | 'created'
  | 'sent'
  | 'opened'
  | 'attachment_viewed'
  | 'report_saved'
  | 'report_submitted'
  | 'more_info_requested'
  | 'access_revoked'
  | 'archived'
  | 'material_purged'

export type ConsultationInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

/** Section keys selectable when building shared material. */
export type ConsultationSectionKey =
  | 'diagnosis'
  | 'anamnesis'
  | 'therapie-verlauf'
  | 'investigations'
  | 'labs'
  | 'imaging'
  | 'current-therapy'
  | 'medication'
  | 'side-effects'
  | 'risk'
  | 'documents'
  | 'custom_text'

export interface ConsultationSharedItem {
  id: string
  requestId: string
  itemType: SharedItemType
  itemKey: string
  label: string
  content: string
  metadata: Record<string, unknown>
  sortOrder: number
  createdAt: string
}

export interface ConsultationRequest {
  id: string
  caseId: string
  clinicianUserId: string
  specialty: string
  consultantUserId: string | null
  consultantEmail: string | null
  consultantUsername: string | null
  accessType: ConsultationAccessType
  urgency: ConsultationUrgency
  title: string
  clinicalQuestion: string
  kurzanamnese: string
  examinationRequested: boolean
  deadline: string | null
  legalConsentNote: string | null
  patientIdentifierMode: PatientIdentifierMode
  status: ConsultationRequestStatus
  expiresAt: string | null
  revokedAt: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ConsultationReport {
  id: string
  requestId: string
  status: ConsultationReportStatus
  patientExamined: PatientExamined
  findings: string
  assessment: string
  recommendations: string
  limitations: string
  followUp: string
  submittedAt: string | null
  submittedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ConsultationMessage {
  id: string
  requestId: string
  authorUserId: string
  messageType: ConsultationMessageType
  body: string
  createdAt: string
}

export interface ConsultationParticipant {
  id: string
  requestId: string
  userId: string
  role: ConsultationRole
  inviteId: string | null
  joinedAt: string
}

export interface ConsultationInvite {
  id: string
  requestId: string
  invitedBy: string
  inviteeEmail: string
  status: ConsultationInviteStatus
  expiresAt: string | null
  revokedAt: string | null
  acceptedAt: string | null
  acceptedUserId: string | null
  createdAt: string
  inviteToken?: string
}

export interface ConsultationAuditLog {
  id: string
  requestId: string
  actorUserId: string | null
  action: ConsultationAuditAction
  details: Record<string, unknown>
  createdAt: string
}

export interface ConsultationSession {
  request: ConsultationRequest
  sharedItems: ConsultationSharedItem[]
  report: ConsultationReport | null
  participant: ConsultationParticipant
  messages: ConsultationMessage[]
}

export interface CreateConsultationInput {
  caseId: string
  specialty: string
  consultantUserId?: string
  consultantEmail?: string
  consultantUsername?: string
  accessType: ConsultationAccessType
  urgency: ConsultationUrgency
  title: string
  clinicalQuestion: string
  kurzanamnese: string
  examinationRequested: boolean
  deadline?: string | null
  legalConsentNote?: string | null
  patientIdentifierMode: PatientIdentifierMode
  sharedItems: Array<{
    itemType: SharedItemType
    itemKey: string
    label: string
    content: string
    metadata?: Record<string, unknown>
    sortOrder?: number
  }>
  saveAsDraft?: boolean
}

export interface SaveReportInput {
  patientExamined: PatientExamined
  findings: string
  assessment: string
  recommendations: string
  limitations: string
  followUp: string
}

export const CONSULTATION_SECTION_LABELS: Record<ConsultationSectionKey, string> = {
  diagnosis: 'Diagnosen',
  anamnesis: 'Anamnese',
  'therapie-verlauf': 'Verlauf-Auszüge',
  investigations: 'Befunde / Untersuchungen',
  labs: 'Labor / Laborwerte',
  imaging: 'Bildgebung',
  'current-therapy': 'Aktuelle Therapie',
  medication: 'Medikation',
  'side-effects': 'Nebenwirkungen',
  risk: 'Risiko',
  documents: 'Dokumente / Anhänge',
  custom_text: 'Freitext',
}

export const CONSULTATION_STATUS_LABELS: Record<ConsultationRequestStatus, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  viewed: 'Geöffnet',
  in_progress: 'In Bearbeitung',
  more_info_requested: 'Weitere Informationen angefordert',
  submitted: 'Bericht eingereicht',
  cancelled: 'Abgebrochen',
  archived: 'Archiviert',
}

export const ALL_CONSULTATION_SECTION_KEYS: ConsultationSectionKey[] = [
  'diagnosis',
  'anamnesis',
  'therapie-verlauf',
  'investigations',
  'labs',
  'imaging',
  'current-therapy',
  'medication',
  'side-effects',
  'risk',
  'documents',
]

export const EXTERNAL_CONSULTANT_ROLES: ConsultationRole[] = [
  'external_consultant',
  'one_time_external_consultant',
]

export function isExternalConsultantRole(role: ConsultationRole | null | undefined): boolean {
  return role != null && EXTERNAL_CONSULTANT_ROLES.includes(role)
}

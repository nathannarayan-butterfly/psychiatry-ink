/** DiscussCase collaboration workspace types. */

import type { EncryptedEnvelope } from '../utils/e2ee'

export type DiscussCasePermission =
  | 'view_package'
  | 'view_identified_data'
  | 'comment'
  | 'highlight'
  | 'send_message'
  | 'ask_ai'
  | 'copy_text'
  | 'download_package'
  | 'export_summary'
  | 'save_to_case'
  | 'invite_others'
  | 'manage_discussion'
  | 'join_voice'

export type DiscussCaseStatus = 'draft' | 'active' | 'archived' | 'revoked'
export type DiscussInviteType = 'internal' | 'external'
export type DiscussInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'
export type DiscussParticipantRole = 'owner' | 'internal' | 'external'
export type DiscussParticipantStatus = 'active' | 'revoked'

/** Section categories selectable when building a discussion package. */
export type DiscussPackageSectionKey =
  | 'diagnosis'
  | 'anamnesis'
  | 'therapie-verlauf'
  | 'investigations'
  | 'current-therapy'
  | 'medication'
  | 'side-effects'
  | 'risk'
  | 'documents'

export interface DiscussPackageSection {
  key: DiscussPackageSectionKey
  id: string
  label: string
  content: string
  documentTypeId?: string
}

export interface DiscussPackageContent {
  version: number
  builtAt: string
  caseId: string
  /** De-identified label for external viewers, e.g. "Patient A". */
  patientLabel: string
  sections: DiscussPackageSection[]
  /** Whether patient identifiers were stripped from section text. */
  isDeidentified: boolean
}

export interface DiscussCaseDiscussion {
  id: string
  caseId: string
  ownerUserId: string
  title: string
  status: DiscussCaseStatus
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

/** Discussion row in the case list — includes permission hints for list actions. */
export interface DiscussCaseListItem extends DiscussCaseDiscussion {
  canManage: boolean
  /** True when the current viewer created the discussion (owner_user_id match). */
  isOwner: boolean
}

export interface DiscussCasePackage {
  id: string
  discussionId: string
  version: number
  isDeidentified: boolean
  content: DiscussPackageContent
  createdBy: string
  createdAt: string
}

export interface DiscussCaseParticipant {
  id: string
  discussionId: string
  userId: string
  role: DiscussParticipantRole
  permissions: DiscussCasePermission[]
  inviteId: string | null
  joinedAt: string
  status: DiscussParticipantStatus
  revokedAt: string | null
  revokedBy: string | null
}

export interface DiscussCaseInvite {
  id: string
  discussionId: string
  invitedBy: string
  inviteeEmail: string | null
  inviteeUsername: string | null
  inviteType: DiscussInviteType
  status: DiscussInviteStatus
  permissions: DiscussCasePermission[]
  expiresAt: string | null
  revokedAt: string | null
  acceptedAt: string | null
  acceptedUserId: string | null
  createdAt: string
  /** Plain token returned only on create — not stored in DB. */
  inviteToken?: string
}

export interface DiscussCaseMessage {
  id: string
  discussionId: string
  authorUserId: string
  authorDisplayName: string | null
  body: string
  quoteExcerpt: DiscussQuoteExcerpt | null
  createdAt: string
  /** Set when the author has edited the message after posting. */
  editedAt: string | null
}

export interface DiscussQuoteExcerpt {
  sectionId: string
  sectionLabel: string
  text: string
  startOffset?: number
  endOffset?: number
}

export interface DiscussCaseAnnotation {
  id: string
  discussionId: string
  authorUserId: string
  sectionId: string
  startOffset: number
  endOffset: number
  highlightedText: string
  commentBody: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
}

export interface DiscussCaseAiRequest {
  id: string
  discussionId: string
  requesterUserId: string
  prompt: string
  contextScope: string
  responseText: string | null
  status: 'pending' | 'completed' | 'failed' | 'discarded'
  createdAt: string
}

export interface DiscussCaseAuditLog {
  id: string
  discussionId: string
  actorUserId: string | null
  action: string
  details: Record<string, unknown>
  createdAt: string
}

export interface DiscussCaseSession {
  discussion: DiscussCaseDiscussion
  package: DiscussCasePackage | null
  participant: DiscussCaseParticipant
  permissions: DiscussCasePermission[]
}

export interface CreateDiscussionInput {
  caseId: string
  title: string
  sections: DiscussPackageSectionKey[]
  /**
   * Identified package content, E2EE-encrypted client-side before upload. The
   * server only ever receives ciphertext for identified data.
   */
  packageContent: EncryptedEnvelope
  /** De-identified package — plaintext (no identifiers present). */
  deidentifiedPackageContent: DiscussPackageContent
  expiresAt?: string | null
}

export interface CreateInviteInput {
  discussionId: string
  inviteeEmail?: string
  inviteeUsername?: string
  inviteType: DiscussInviteType
  permissions?: DiscussCasePermission[]
  expiresAt?: string | null
}

export const INTERNAL_DEFAULT_PERMISSIONS: DiscussCasePermission[] = [
  'view_package',
  'view_identified_data',
  'comment',
  'highlight',
  'send_message',
  'ask_ai',
  'copy_text',
  'download_package',
  'export_summary',
  'invite_others',
  'join_voice',
]

export const EXTERNAL_DEFAULT_PERMISSIONS: DiscussCasePermission[] = [
  'view_package',
  'comment',
  'highlight',
  'send_message',
  'ask_ai',
  'copy_text',
]

export const OWNER_PERMISSIONS: DiscussCasePermission[] = [
  'view_package',
  'view_identified_data',
  'comment',
  'highlight',
  'send_message',
  'ask_ai',
  'copy_text',
  'download_package',
  'export_summary',
  'save_to_case',
  'invite_others',
  'manage_discussion',
  'join_voice',
]

export const DISCUSS_PACKAGE_SECTION_LABELS: Record<DiscussPackageSectionKey, string> = {
  diagnosis: 'Diagnose',
  anamnesis: 'Anamnese',
  'therapie-verlauf': 'Therapie und Verlauf',
  investigations: 'Untersuchungen',
  'current-therapy': 'Aktuelle Therapie',
  medication: 'Medikation',
  'side-effects': 'Nebenwirkungen',
  risk: 'Risiko',
  documents: 'Ausgewählte Dokumente',
}

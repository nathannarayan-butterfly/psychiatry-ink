import { createHash, randomBytes } from 'node:crypto'
import type {
  ConsultationAccessType,
  ConsultationAuditLog,
  ConsultationInvite,
  ConsultationMessage,
  ConsultationParticipant,
  ConsultationReport,
  ConsultationRequest,
  ConsultationRole,
  ConsultationSharedItem,
  PatientExamined,
  SaveReportInput,
} from '../../src/types/consultation'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { accessTypeToRole } from './consultationPermissions'

function mapRequest(row: Record<string, unknown>): ConsultationRequest {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    clinicianUserId: String(row.clinician_user_id),
    specialty: String(row.specialty),
    consultantUserId: row.consultant_user_id ? String(row.consultant_user_id) : null,
    consultantEmail: row.consultant_email ? String(row.consultant_email) : null,
    consultantUsername: row.consultant_username ? String(row.consultant_username) : null,
    accessType: row.access_type as ConsultationAccessType,
    urgency: row.urgency as ConsultationRequest['urgency'],
    title: String(row.title),
    clinicalQuestion: String(row.clinical_question),
    kurzanamnese: String(row.kurzanamnese ?? ''),
    examinationRequested: Boolean(row.examination_requested),
    deadline: row.deadline ? String(row.deadline) : null,
    legalConsentNote: row.legal_consent_note ? String(row.legal_consent_note) : null,
    patientIdentifierMode: row.patient_identifier_mode as ConsultationRequest['patientIdentifierMode'],
    status: row.status as ConsultationRequest['status'],
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapSharedItem(row: Record<string, unknown>): ConsultationSharedItem {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    itemType: row.item_type as ConsultationSharedItem['itemType'],
    itemKey: String(row.item_key),
    label: String(row.label),
    content: String(row.content ?? ''),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
  }
}

function mapReport(row: Record<string, unknown>): ConsultationReport {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    status: row.status as ConsultationReport['status'],
    patientExamined: row.patient_examined as PatientExamined,
    findings: String(row.findings ?? ''),
    assessment: String(row.assessment ?? ''),
    recommendations: String(row.recommendations ?? ''),
    limitations: String(row.limitations ?? ''),
    followUp: String(row.follow_up ?? ''),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    submittedBy: row.submitted_by ? String(row.submitted_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapMessage(row: Record<string, unknown>): ConsultationMessage {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    authorUserId: String(row.author_user_id),
    messageType: row.message_type as ConsultationMessage['messageType'],
    body: String(row.body),
    createdAt: String(row.created_at),
  }
}

function mapParticipant(row: Record<string, unknown>): ConsultationParticipant {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    userId: String(row.user_id),
    role: row.role as ConsultationRole,
    inviteId: row.invite_id ? String(row.invite_id) : null,
    joinedAt: String(row.joined_at),
  }
}

function mapInvite(row: Record<string, unknown>): ConsultationInvite {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    invitedBy: String(row.invited_by),
    inviteeEmail: String(row.invitee_email),
    status: row.status as ConsultationInvite['status'],
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    acceptedUserId: row.accepted_user_id ? String(row.accepted_user_id) : null,
    createdAt: String(row.created_at),
  }
}

function mapAuditLog(row: Record<string, unknown>): ConsultationAuditLog {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    action: row.action as ConsultationAuditLog['action'],
    details: (row.details ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
  }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function writeAuditLog(input: {
  requestId: string
  actorUserId?: string | null
  action: ConsultationAuditLog['action']
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from('ks_audit_logs').insert({
    request_id: input.requestId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    details: input.details ?? {},
  })
  if (error) throw error
}

export async function getParticipant(
  requestId: string,
  userId: string,
): Promise<ConsultationParticipant | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('ks_participants')
    .select('*')
    .eq('request_id', requestId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? mapParticipant(data as Record<string, unknown>) : null
}

export async function getRequest(id: string): Promise<ConsultationRequest | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase.from('ks_consultation_requests').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapRequest(data as Record<string, unknown>) : null
}

export async function listRequestsForCase(
  caseId: string,
  userId: string,
): Promise<ConsultationRequest[]> {
  const supabase = getKbSupabaseAdmin()
  const { data: memberships, error: memberError } = await supabase
    .from('ks_participants')
    .select('request_id')
    .eq('user_id', userId)
  if (memberError) throw memberError

  const requestIds = (memberships ?? []).map((row) => String((row as Record<string, unknown>).request_id))
  if (requestIds.length === 0) return []

  const { data, error } = await supabase
    .from('ks_consultation_requests')
    .select('*')
    .eq('case_id', caseId)
    .in('id', requestIds)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapRequest(row as Record<string, unknown>))
}

export async function listRequestsForConsultant(userId: string): Promise<ConsultationRequest[]> {
  const supabase = getKbSupabaseAdmin()
  const { data: memberships, error: memberError } = await supabase
    .from('ks_participants')
    .select('request_id, role')
    .eq('user_id', userId)
    .neq('role', 'clinician')
  if (memberError) throw memberError

  const requestIds = (memberships ?? []).map((row) => String((row as Record<string, unknown>).request_id))
  if (requestIds.length === 0) return []

  const { data, error } = await supabase
    .from('ks_consultation_requests')
    .select('*')
    .in('id', requestIds)
    .not('status', 'in', '("draft","cancelled")')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapRequest(row as Record<string, unknown>))
}

export async function getSharedItems(requestId: string): Promise<ConsultationSharedItem[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('ks_shared_items')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapSharedItem(row as Record<string, unknown>))
}

export async function getReport(requestId: string): Promise<ConsultationReport | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('ks_reports')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle()
  if (error) throw error
  return data ? mapReport(data as Record<string, unknown>) : null
}

export async function listMessages(requestId: string): Promise<ConsultationMessage[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('ks_messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>))
}

export async function listAuditLogs(requestId: string): Promise<ConsultationAuditLog[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('ks_audit_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapAuditLog(row as Record<string, unknown>))
}

export async function createConsultationRequest(input: {
  caseId: string
  clinicianUserId: string
  specialty: string
  consultantUserId?: string | null
  consultantEmail?: string | null
  consultantUsername?: string | null
  accessType: ConsultationAccessType
  urgency: ConsultationRequest['urgency']
  title: string
  clinicalQuestion: string
  kurzanamnese: string
  examinationRequested: boolean
  deadline?: string | null
  legalConsentNote?: string | null
  patientIdentifierMode: ConsultationRequest['patientIdentifierMode']
  sharedItems: Array<{
    itemType: ConsultationSharedItem['itemType']
    itemKey: string
    label: string
    content: string
    metadata?: Record<string, unknown>
    sortOrder?: number
  }>
  saveAsDraft?: boolean
}): Promise<{ request: ConsultationRequest; inviteToken?: string }> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()
  const status = input.saveAsDraft ? 'draft' : 'sent'

  const { data: requestRow, error: requestError } = await supabase
    .from('ks_consultation_requests')
    .insert({
      case_id: input.caseId,
      clinician_user_id: input.clinicianUserId,
      specialty: input.specialty.trim(),
      consultant_user_id: input.consultantUserId ?? null,
      consultant_email: input.consultantEmail?.trim() || null,
      consultant_username: input.consultantUsername?.trim() || null,
      access_type: input.accessType,
      urgency: input.urgency,
      title: input.title.trim(),
      clinical_question: input.clinicalQuestion.trim(),
      kurzanamnese: input.kurzanamnese.trim(),
      examination_requested: input.examinationRequested,
      deadline: input.deadline ?? null,
      legal_consent_note: input.legalConsentNote?.trim() || null,
      patient_identifier_mode: input.patientIdentifierMode,
      status,
      updated_at: now,
    })
    .select('*')
    .single()
  if (requestError) throw requestError

  const request = mapRequest(requestRow as Record<string, unknown>)

  await supabase.from('ks_participants').insert({
    request_id: request.id,
    user_id: input.clinicianUserId,
    role: 'clinician',
  })

  if (input.consultantUserId) {
    await supabase.from('ks_participants').insert({
      request_id: request.id,
      user_id: input.consultantUserId,
      role: accessTypeToRole(input.accessType),
    })
  }

  if (input.sharedItems.length > 0) {
    const { error: itemsError } = await supabase.from('ks_shared_items').insert(
      input.sharedItems.map((item, index) => ({
        request_id: request.id,
        item_type: item.itemType,
        item_key: item.itemKey,
        label: item.label,
        content: item.content,
        metadata: item.metadata ?? {},
        sort_order: item.sortOrder ?? index,
      })),
    )
    if (itemsError) throw itemsError
  }

  // Generate a shareable invite token whenever the consultant was identified by
  // email rather than an in-app user id. This covers one-time external access
  // AND named external/internal consultants who aren't yet linked by user id —
  // without it the request would be "sent" but unreachable (dead end).
  let inviteToken: string | undefined
  if (!input.saveAsDraft && input.consultantEmail && !input.consultantUserId) {
    inviteToken = generateInviteToken()
    const { data: inviteRow, error: inviteError } = await supabase
      .from('ks_invites')
      .insert({
        request_id: request.id,
        invited_by: input.clinicianUserId,
        invitee_email: input.consultantEmail.trim(),
        token_hash: hashInviteToken(inviteToken),
        expires_at: input.deadline ?? null,
      })
      .select('*')
      .single()
    if (inviteError) throw inviteError

    if (input.consultantUserId) {
      await supabase
        .from('ks_participants')
        .update({ invite_id: String((inviteRow as Record<string, unknown>).id) })
        .eq('request_id', request.id)
        .eq('user_id', input.consultantUserId)
    }
  }

  await writeAuditLog({
    requestId: request.id,
    actorUserId: input.clinicianUserId,
    action: 'created',
    details: { status },
  })

  if (!input.saveAsDraft) {
    await writeAuditLog({
      requestId: request.id,
      actorUserId: input.clinicianUserId,
      action: 'sent',
    })
  }

  return { request, inviteToken }
}

export async function markRequestOpened(requestId: string, userId: string): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const request = await getRequest(requestId)
  if (!request) return

  if (request.status === 'sent') {
    await supabase
      .from('ks_consultation_requests')
      .update({ status: 'viewed', updated_at: new Date().toISOString() })
      .eq('id', requestId)
  }

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'opened',
  })
}

export async function saveReportDraft(
  requestId: string,
  userId: string,
  input: SaveReportInput,
): Promise<ConsultationReport> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()
  const existing = await getReport(requestId)

  const payload = {
    patient_examined: input.patientExamined,
    findings: input.findings,
    assessment: input.assessment,
    recommendations: input.recommendations,
    limitations: input.limitations,
    follow_up: input.followUp,
    updated_at: now,
  }

  let report: ConsultationReport
  if (existing) {
    const { data, error } = await supabase
      .from('ks_reports')
      .update(payload)
      .eq('request_id', requestId)
      .eq('status', 'draft')
      .select('*')
      .single()
    if (error) throw error
    report = mapReport(data as Record<string, unknown>)
  } else {
    const { data, error } = await supabase
      .from('ks_reports')
      .insert({ request_id: requestId, status: 'draft', ...payload })
      .select('*')
      .single()
    if (error) throw error
    report = mapReport(data as Record<string, unknown>)
  }

  await supabase
    .from('ks_consultation_requests')
    .update({ status: 'in_progress', updated_at: now })
    .eq('id', requestId)
    .in('status', ['sent', 'viewed', 'more_info_requested'])

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'report_saved',
  })

  return report
}

export async function submitReport(
  requestId: string,
  userId: string,
  input: SaveReportInput,
): Promise<ConsultationReport> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()
  const existing = await getReport(requestId)

  const payload = {
    status: 'submitted',
    patient_examined: input.patientExamined,
    findings: input.findings,
    assessment: input.assessment,
    recommendations: input.recommendations,
    limitations: input.limitations,
    follow_up: input.followUp,
    submitted_at: now,
    submitted_by: userId,
    updated_at: now,
  }

  let report: ConsultationReport
  if (existing) {
    const { data, error } = await supabase
      .from('ks_reports')
      .update(payload)
      .eq('request_id', requestId)
      .select('*')
      .single()
    if (error) throw error
    report = mapReport(data as Record<string, unknown>)
  } else {
    const { data, error } = await supabase
      .from('ks_reports')
      .insert({ request_id: requestId, ...payload })
      .select('*')
      .single()
    if (error) throw error
    report = mapReport(data as Record<string, unknown>)
  }

  await supabase
    .from('ks_consultation_requests')
    .update({ status: 'submitted', updated_at: now })
    .eq('id', requestId)

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'report_submitted',
  })

  return report
}

export async function requestMoreInfo(
  requestId: string,
  userId: string,
  body: string,
): Promise<ConsultationMessage> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_messages')
    .insert({
      request_id: requestId,
      author_user_id: userId,
      message_type: 'request_more_information',
      body: body.trim(),
    })
    .select('*')
    .single()
  if (error) throw error

  await supabase
    .from('ks_consultation_requests')
    .update({ status: 'more_info_requested', updated_at: now })
    .eq('id', requestId)

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'more_info_requested',
    details: { body: body.trim() },
  })

  return mapMessage(data as Record<string, unknown>)
}

export async function respondToInfoRequest(
  requestId: string,
  userId: string,
  body: string,
): Promise<ConsultationMessage> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_messages')
    .insert({
      request_id: requestId,
      author_user_id: userId,
      message_type: 'clinician_response',
      body: body.trim(),
    })
    .select('*')
    .single()
  if (error) throw error

  await supabase
    .from('ks_consultation_requests')
    .update({ status: 'in_progress', updated_at: now })
    .eq('id', requestId)

  return mapMessage(data as Record<string, unknown>)
}

/**
 * Data-retention purge: once a consultation has been received/closed by the
 * clinician (reviewed, archived or revoked), the patient material that was
 * shared with the consultant no longer needs to live in Supabase. The clinician
 * retains the source data in the local encrypted vault, so we null the shared
 * content here to minimise identified/clinical data at rest. The structured
 * report (authored by the consultant) is retained as the deliverable.
 */
export async function purgeSharedMaterial(requestId: string, actorUserId: string): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_shared_items')
    .update({ content: '', metadata: {}, purged_at: now })
    .eq('request_id', requestId)
    .is('purged_at', null)
    .select('id')
  if (error) throw error

  if ((data ?? []).length > 0) {
    await writeAuditLog({
      requestId,
      actorUserId,
      action: 'material_purged',
      details: { itemCount: (data ?? []).length },
    })
  }
}

export async function markReviewed(requestId: string, userId: string): Promise<ConsultationRequest> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_consultation_requests')
    .update({ reviewed_at: now, reviewed_by: userId, updated_at: now })
    .eq('id', requestId)
    .select('*')
    .single()
  if (error) throw error

  // Clinician has received the report → purge shared patient material.
  await purgeSharedMaterial(requestId, userId)

  return mapRequest(data as Record<string, unknown>)
}

export async function archiveRequest(requestId: string, userId: string): Promise<ConsultationRequest> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_consultation_requests')
    .update({ status: 'archived', updated_at: now })
    .eq('id', requestId)
    .select('*')
    .single()
  if (error) throw error

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'archived',
  })

  await purgeSharedMaterial(requestId, userId)

  return mapRequest(data as Record<string, unknown>)
}

export async function revokeAccess(requestId: string, userId: string): Promise<ConsultationRequest> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ks_consultation_requests')
    .update({ revoked_at: now, status: 'cancelled', updated_at: now })
    .eq('id', requestId)
    .select('*')
    .single()
  if (error) throw error

  await writeAuditLog({
    requestId,
    actorUserId: userId,
    action: 'access_revoked',
  })

  await purgeSharedMaterial(requestId, userId)

  return mapRequest(data as Record<string, unknown>)
}

export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ request: ConsultationRequest }> {
  const supabase = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(token)
  const now = new Date().toISOString()

  const { data: inviteRow, error: inviteError } = await supabase
    .from('ks_invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle()
  if (inviteError) throw inviteError
  if (!inviteRow) throw new Error('Invalid or expired invite')

  const invite = mapInvite(inviteRow as Record<string, unknown>)
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    await supabase.from('ks_invites').update({ status: 'expired' }).eq('id', invite.id)
    throw new Error('Invite expired')
  }

  const request = await getRequest(invite.requestId)
  if (!request) throw new Error('Request not found')
  if (request.revokedAt) throw new Error('Access revoked')

  await supabase
    .from('ks_invites')
    .update({ status: 'accepted', accepted_at: now, accepted_user_id: userId })
    .eq('id', invite.id)

  const { error: participantError } = await supabase.from('ks_participants').upsert(
    {
      request_id: invite.requestId,
      user_id: userId,
      role: accessTypeToRole(request.accessType),
      invite_id: invite.id,
    },
    { onConflict: 'request_id,user_id' },
  )
  if (participantError) throw participantError

  await writeAuditLog({
    requestId: invite.requestId,
    actorUserId: userId,
    action: 'opened',
    details: { via: 'invite_accept' },
  })

  return { request }
}

export async function previewInvite(token: string): Promise<{
  specialty: string
  title: string
  inviteeEmail: string
}> {
  const supabase = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(token)

  const { data: inviteRow, error: inviteError } = await supabase
    .from('ks_invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle()
  if (inviteError) throw inviteError
  if (!inviteRow) throw new Error('Invalid invite')

  const invite = mapInvite(inviteRow as Record<string, unknown>)
  const request = await getRequest(invite.requestId)
  if (!request) throw new Error('Request not found')

  return {
    specialty: request.specialty,
    title: request.title,
    inviteeEmail: invite.inviteeEmail,
  }
}

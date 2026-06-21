import { createHash, randomBytes } from 'node:crypto'
import type {
  DiscussCaseAnnotation,
  DiscussCaseAuditLog,
  DiscussCaseDiscussion,
  DiscussCaseInvite,
  DiscussCaseMessage,
  DiscussCasePackage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussPackageContent,
} from '../../src/types/discussCase'
import type { EncryptedEnvelope } from '../../src/utils/e2ee'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { resolveDefaultPermissions } from './discussCasePermissions'
import {
  deleteDiscussVoiceMessage,
  newVoiceMessageId,
  uploadDiscussVoiceMessage,
  DC_VOICE_MAX_DURATION_MS,
  type DiscussVoiceAttachmentMeta,
} from './discussCaseVoiceStorage'
import {
  computeVoiceAttachmentExpiresAt,
  purgeExpiredDiscussVoiceMessages,
  resolveDiscussCaseVoiceRetentionDays,
  resolveVoiceAttachmentExpiresAt,
} from './discussCaseVoiceRetention'
import { buildReplyPreview } from '../../src/utils/discussCase/messageReply'

/**
 * Identified package payloads are E2EE ciphertext (an EncryptedEnvelope); the
 * de-identified payload remains plaintext DiscussPackageContent. The server
 * stores whatever the client uploads verbatim and never holds the key.
 */
export type StoredPackageContent = DiscussPackageContent | EncryptedEnvelope

function mapDiscussion(row: Record<string, unknown>): DiscussCaseDiscussion {
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    ownerUserId: String(row.owner_user_id),
    title: String(row.title),
    status: row.status as DiscussCaseDiscussion['status'],
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapPackage(row: Record<string, unknown>): DiscussCasePackage {
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    version: Number(row.version),
    isDeidentified: Boolean(row.is_deidentified),
    content: (row.content ?? {}) as DiscussPackageContent,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  }
}

function mapParticipant(row: Record<string, unknown>): DiscussCaseParticipant {
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    userId: String(row.user_id),
    role: row.role as DiscussCaseParticipant['role'],
    permissions: (row.permissions ?? []) as DiscussCasePermission[],
    inviteId: row.invite_id ? String(row.invite_id) : null,
    joinedAt: String(row.joined_at),
    status: (row.status as DiscussCaseParticipant['status']) ?? 'active',
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    revokedBy: row.revoked_by ? String(row.revoked_by) : null,
  }
}

function mapInvite(row: Record<string, unknown>): DiscussCaseInvite {
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    invitedBy: String(row.invited_by),
    inviteeEmail: row.invitee_email ? String(row.invitee_email) : null,
    inviteeUsername: row.invitee_username ? String(row.invitee_username) : null,
    inviteType: row.invite_type as DiscussCaseInvite['inviteType'],
    status: row.status as DiscussCaseInvite['status'],
    permissions: (row.permissions ?? []) as DiscussCasePermission[],
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    acceptedUserId: row.accepted_user_id ? String(row.accepted_user_id) : null,
    createdAt: String(row.created_at),
  }
}

function mapMessage(row: Record<string, unknown>): DiscussCaseMessage {
  const messageKind = (row.message_kind as DiscussCaseMessage['messageKind']) ?? 'text'
  const createdAt = String(row.created_at)
  const voiceRaw = row.voice_attachment as DiscussCaseMessage['voiceAttachment'] | null
  const voiceAttachment =
    voiceRaw && messageKind === 'voice'
      ? {
          ...voiceRaw,
          expiresAt: resolveVoiceAttachmentExpiresAt(
            voiceRaw,
            createdAt,
            resolveDiscussCaseVoiceRetentionDays(),
          ),
        }
      : voiceRaw
  const reactionsRaw = row.reactions as DiscussCaseMessage['reactions'] | null
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    authorUserId: String(row.author_user_id),
    authorDisplayName: row.author_display_name ? String(row.author_display_name) : null,
    body: String(row.body ?? ''),
    messageKind,
    voiceAttachment,
    quoteExcerpt: (row.quote_excerpt as DiscussCaseMessage['quoteExcerpt']) ?? null,
    replyToMessageId: row.reply_to_message_id ? String(row.reply_to_message_id) : null,
    replyPreview: (row.reply_preview as DiscussCaseMessage['replyPreview']) ?? null,
    reactions: Array.isArray(reactionsRaw) ? reactionsRaw : [],
    createdAt,
    editedAt: row.edited_at ? String(row.edited_at) : null,
  }
}

async function resolveReplyContext(input: {
  discussionId: string
  replyToMessageId?: string | null
}): Promise<{ replyToMessageId: string; replyPreview: DiscussCaseMessage['replyPreview'] } | null> {
  const replyToMessageId = input.replyToMessageId?.trim()
  if (!replyToMessageId) return null

  const target = await getMessage(input.discussionId, replyToMessageId)
  if (!target) throw new Error('Reply target not found')

  return {
    replyToMessageId: target.id,
    replyPreview: buildReplyPreview(target),
  }
}

function mapAnnotation(row: Record<string, unknown>): DiscussCaseAnnotation {
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    authorUserId: String(row.author_user_id),
    sectionId: String(row.section_id),
    startOffset: Number(row.start_offset),
    endOffset: Number(row.end_offset),
    highlightedText: String(row.highlighted_text),
    commentBody: row.comment_body ? String(row.comment_body) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
    createdAt: String(row.created_at),
  }
}

function mapAuditLog(row: Record<string, unknown>): DiscussCaseAuditLog {
  return {
    id: String(row.id),
    discussionId: String(row.discussion_id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    action: String(row.action),
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
  discussionId: string
  actorUserId?: string | null
  action: string
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from('dc_audit_logs').insert({
    discussion_id: input.discussionId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    details: input.details ?? {},
  })
  if (error) throw error
}

export async function getParticipant(
  discussionId: string,
  userId: string,
): Promise<DiscussCaseParticipant | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_participants')
    .select('*')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data ? mapParticipant(data as Record<string, unknown>) : null
}

/** Roster of all participants (active + revoked) for a discussion. */
export async function listParticipants(
  discussionId: string,
): Promise<DiscussCaseParticipant[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_participants')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapParticipant(row as Record<string, unknown>))
}

export async function listDiscussionsForCase(
  caseId: string,
  userId: string,
): Promise<Array<DiscussCaseDiscussion & { canManage: boolean; isOwner: boolean }>> {
  const supabase = getKbSupabaseAdmin()
  const { data: memberships, error: memberError } = await supabase
    .from('dc_participants')
    .select('discussion_id, permissions')
    .eq('user_id', userId)
  if (memberError) throw memberError

  const permissionByDiscussion = new Map<string, DiscussCasePermission[]>()
  for (const row of memberships ?? []) {
    const record = row as Record<string, unknown>
    permissionByDiscussion.set(String(record.discussion_id), (record.permissions ?? []) as DiscussCasePermission[])
  }

  const discussionIds = [...permissionByDiscussion.keys()]
  if (discussionIds.length === 0) return []

  const { data, error } = await supabase
    .from('dc_discussions')
    .select('*')
    .eq('case_id', caseId)
    .in('id', discussionIds)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const discussion = mapDiscussion(row as Record<string, unknown>)
    const permissions = permissionByDiscussion.get(discussion.id) ?? []
    return {
      ...discussion,
      canManage: permissions.includes('manage_discussion'),
      isOwner: discussion.ownerUserId === userId,
    }
  })
}

export async function getDiscussion(id: string): Promise<DiscussCaseDiscussion | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase.from('dc_discussions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapDiscussion(data as Record<string, unknown>) : null
}

export async function createDiscussion(input: {
  caseId: string
  ownerUserId: string
  title: string
  /** Ciphertext envelope (E2EE) for the identified package. */
  identifiedContent: StoredPackageContent
  deidentifiedContent: DiscussPackageContent
  expiresAt?: string | null
}): Promise<{ discussion: DiscussCaseDiscussion; identifiedPackage: DiscussCasePackage; deidentifiedPackage: DiscussCasePackage }> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data: discussionRow, error: discussionError } = await supabase
    .from('dc_discussions')
    .insert({
      case_id: input.caseId,
      owner_user_id: input.ownerUserId,
      title: input.title.trim(),
      status: 'active',
      expires_at: input.expiresAt ?? null,
      updated_at: now,
    })
    .select('*')
    .single()
  if (discussionError) throw discussionError

  const discussion = mapDiscussion(discussionRow as Record<string, unknown>)

  const { data: identifiedPkg, error: identifiedError } = await supabase
    .from('dc_discussion_packages')
    .insert({
      discussion_id: discussion.id,
      version: 1,
      is_deidentified: false,
      content: input.identifiedContent,
      created_by: input.ownerUserId,
    })
    .select('*')
    .single()
  if (identifiedError) throw identifiedError

  const { data: deidentifiedPkg, error: deidentifiedError } = await supabase
    .from('dc_discussion_packages')
    .insert({
      discussion_id: discussion.id,
      version: 1,
      is_deidentified: true,
      content: input.deidentifiedContent,
      created_by: input.ownerUserId,
    })
    .select('*')
    .single()
  if (deidentifiedError) throw deidentifiedError

  const ownerPermissions = resolveDefaultPermissions('owner')
  const { error: participantError } = await supabase.from('dc_participants').insert({
    discussion_id: discussion.id,
    user_id: input.ownerUserId,
    role: 'owner',
    permissions: ownerPermissions,
  })
  if (participantError) throw participantError

  await writeAuditLog({
    discussionId: discussion.id,
    actorUserId: input.ownerUserId,
    action: 'discussion_created',
    details: { caseId: input.caseId, title: input.title },
  })

  return {
    discussion,
    identifiedPackage: mapPackage(identifiedPkg as Record<string, unknown>),
    deidentifiedPackage: mapPackage(deidentifiedPkg as Record<string, unknown>),
  }
}

export async function getLatestPackages(discussionId: string): Promise<{
  identified: DiscussCasePackage | null
  deidentified: DiscussCasePackage | null
}> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_discussion_packages')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('version', { ascending: false })
  if (error) throw error

  const packages = (data ?? []).map((row) => mapPackage(row as Record<string, unknown>))
  return {
    identified: packages.find((pkg) => !pkg.isDeidentified) ?? null,
    deidentified: packages.find((pkg) => pkg.isDeidentified) ?? null,
  }
}

export async function createInvite(input: {
  discussionId: string
  invitedBy: string
  inviteeEmail?: string
  inviteeUsername?: string
  inviteType: 'internal' | 'external'
  permissions?: DiscussCasePermission[]
  expiresAt?: string | null
}): Promise<DiscussCaseInvite> {
  const token = generateInviteToken()
  const tokenHash = hashInviteToken(token)
  const permissions =
    input.permissions ?? resolveDefaultPermissions('internal', input.inviteType)

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_invites')
    .insert({
      discussion_id: input.discussionId,
      invited_by: input.invitedBy,
      invitee_email: input.inviteeEmail?.trim() || null,
      invitee_username: input.inviteeUsername?.trim() || null,
      invite_type: input.inviteType,
      token_hash: tokenHash,
      permissions,
      expires_at: input.expiresAt ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.invitedBy,
    action: 'invite_created',
    details: {
      inviteType: input.inviteType,
      inviteeEmail: input.inviteeEmail ?? null,
      inviteeUsername: input.inviteeUsername ?? null,
    },
  })

  const invite = mapInvite(data as Record<string, unknown>)
  return { ...invite, inviteToken: token }
}

export async function acceptInvite(input: {
  token: string
  userId: string
  displayName?: string | null
}): Promise<{ discussion: DiscussCaseDiscussion; participant: DiscussCaseParticipant }> {
  const supabase = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(input.token)

  const { data: inviteRow, error: inviteError } = await supabase
    .from('dc_invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (inviteError) throw inviteError
  if (!inviteRow) throw new Error('Invalid invite token')

  const invite = mapInvite(inviteRow as Record<string, unknown>)
  if (invite.status !== 'pending') throw new Error('Invite is no longer valid')
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    await supabase.from('dc_invites').update({ status: 'expired' }).eq('id', invite.id)
    throw new Error('Invite has expired')
  }

  const discussion = await getDiscussion(invite.discussionId)
  if (!discussion) throw new Error('Discussion not found')
  if (discussion.status === 'revoked' || discussion.status === 'archived') {
    throw new Error('Discussion is no longer active')
  }

  const role: DiscussCaseParticipant['role'] =
    invite.inviteType === 'external' ? 'external' : 'internal'

  // Look up any existing row regardless of status so a previously-revoked
  // participant can be re-admitted (the unique (discussion_id, user_id)
  // constraint means we must update, not insert, in that case).
  const { data: existingRow, error: existingError } = await supabase
    .from('dc_participants')
    .select('*')
    .eq('discussion_id', invite.discussionId)
    .eq('user_id', input.userId)
    .maybeSingle()
  if (existingError) throw existingError

  if (!existingRow) {
    const { error: participantError } = await supabase.from('dc_participants').insert({
      discussion_id: invite.discussionId,
      user_id: input.userId,
      role,
      permissions: invite.permissions,
      invite_id: invite.id,
    })
    if (participantError) throw participantError
  } else if (String((existingRow as Record<string, unknown>).status) === 'revoked') {
    const { error: reactivateError } = await supabase
      .from('dc_participants')
      .update({
        status: 'active',
        role,
        permissions: invite.permissions,
        invite_id: invite.id,
        revoked_at: null,
        revoked_by: null,
      })
      .eq('id', String((existingRow as Record<string, unknown>).id))
    if (reactivateError) throw reactivateError
  }

  const { error: updateError } = await supabase
    .from('dc_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_user_id: input.userId,
    })
    .eq('id', invite.id)
  if (updateError) throw updateError

  await writeAuditLog({
    discussionId: invite.discussionId,
    actorUserId: input.userId,
    action: 'invite_accepted',
    details: { inviteId: invite.id, role },
  })

  const participant = await getParticipant(invite.discussionId, input.userId)
  if (!participant) throw new Error('Failed to create participant')

  return { discussion, participant }
}

export async function listMessages(discussionId: string): Promise<DiscussCaseMessage[]> {
  await purgeExpiredDiscussVoiceMessages({ discussionId }).catch((error) => {
    console.warn('[discuss-case] voice purge on list failed:', error)
  })

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>))
}

export async function addMessage(input: {
  discussionId: string
  authorUserId: string
  authorDisplayName?: string | null
  body: string
  quoteExcerpt?: DiscussCaseMessage['quoteExcerpt']
  replyToMessageId?: string | null
}): Promise<DiscussCaseMessage> {
  const body = input.body.trim()
  const quoteText = input.quoteExcerpt?.text?.trim()
  if (!body && !quoteText) throw new Error('Message body required')

  const replyContext = await resolveReplyContext({
    discussionId: input.discussionId,
    replyToMessageId: input.replyToMessageId,
  })

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .insert({
      discussion_id: input.discussionId,
      author_user_id: input.authorUserId,
      author_display_name: input.authorDisplayName ?? null,
      body,
      quote_excerpt: input.quoteExcerpt ?? null,
      reply_to_message_id: replyContext?.replyToMessageId ?? null,
      reply_preview: replyContext?.replyPreview ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  await supabase
    .from('dc_discussions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.discussionId)

  return mapMessage(data as Record<string, unknown>)
}

export async function addVoiceMessage(input: {
  discussionId: string
  authorUserId: string
  authorDisplayName?: string | null
  audioBuffer: Buffer
  mimeType: string
  durationMs: number
  replyToMessageId?: string | null
}): Promise<DiscussCaseMessage> {
  if (input.audioBuffer.byteLength === 0) throw new Error('Empty audio')
  const durationMs = Math.max(0, Math.round(input.durationMs))
  if (durationMs > DC_VOICE_MAX_DURATION_MS) {
    throw new Error('Voice message too long')
  }

  const messageId = newVoiceMessageId()
  let attachment: DiscussVoiceAttachmentMeta
  try {
    attachment = await uploadDiscussVoiceMessage({
      discussionId: input.discussionId,
      messageId,
      buffer: input.audioBuffer,
      mimeType: input.mimeType,
    })
  } catch (error) {
    throw error instanceof Error ? error : new Error('Voice upload failed')
  }
  attachment.durationMs = durationMs
  attachment.expiresAt = computeVoiceAttachmentExpiresAt(new Date(), resolveDiscussCaseVoiceRetentionDays())

  const replyContext = await resolveReplyContext({
    discussionId: input.discussionId,
    replyToMessageId: input.replyToMessageId,
  })

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .insert({
      id: messageId,
      discussion_id: input.discussionId,
      author_user_id: input.authorUserId,
      author_display_name: input.authorDisplayName ?? null,
      body: '',
      message_kind: 'voice',
      voice_attachment: attachment,
      quote_excerpt: null,
      reply_to_message_id: replyContext?.replyToMessageId ?? null,
      reply_preview: replyContext?.replyPreview ?? null,
    })
    .select('*')
    .single()

  if (error) {
    await deleteDiscussVoiceMessage(attachment.storagePath).catch(() => undefined)
    throw error
  }

  await supabase
    .from('dc_discussions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.discussionId)

  return mapMessage(data as Record<string, unknown>)
}

export async function getMessage(
  discussionId: string,
  messageId: string,
): Promise<DiscussCaseMessage | null> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .select('*')
    .eq('discussion_id', discussionId)
    .eq('id', messageId)
    .maybeSingle()
  if (error) throw error
  return data ? mapMessage(data as Record<string, unknown>) : null
}

/**
 * Edit an existing message. Scoped to the original author: the update only
 * matches when both the discussion and the author id line up, so a participant
 * can never modify someone else's post.
 */
export async function updateMessage(input: {
  messageId: string
  discussionId: string
  authorUserId: string
  body: string
}): Promise<DiscussCaseMessage> {
  const existing = await getMessage(input.discussionId, input.messageId)
  if (!existing) throw new Error('Message not found')
  if (existing.messageKind === 'voice') {
    throw new Error('Voice messages cannot be edited')
  }

  const body = input.body.trim()
  if (!body) throw new Error('Message body required')

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', input.messageId)
    .eq('discussion_id', input.discussionId)
    .eq('author_user_id', input.authorUserId)
    .eq('message_kind', 'text')
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Message not found')

  return mapMessage(data as Record<string, unknown>)
}

/**
 * Delete a message. Scoped to the original author the same way as the edit
 * path, so the delete is a no-op (and surfaces an error) for non-authors.
 */
export async function deleteMessage(input: {
  messageId: string
  discussionId: string
  actorUserId: string
  canManageDiscussion?: boolean
}): Promise<void> {
  const existing = await getMessage(input.discussionId, input.messageId)
  if (!existing) throw new Error('Message not found')

  const isAuthor = existing.authorUserId === input.actorUserId
  const isModerator = Boolean(input.canManageDiscussion) && !isAuthor
  if (!isAuthor && !isModerator) throw new Error('Message not found')

  const supabase = getKbSupabaseAdmin()
  let deleteQuery = supabase
    .from('dc_messages')
    .delete()
    .eq('id', input.messageId)
    .eq('discussion_id', input.discussionId)

  if (isAuthor) {
    deleteQuery = deleteQuery.eq('author_user_id', input.actorUserId)
  }

  const { error } = await deleteQuery
  if (error) throw error

  if (existing.voiceAttachment?.storagePath) {
    await deleteDiscussVoiceMessage(existing.voiceAttachment.storagePath).catch(() => undefined)
  }

  if (isModerator) {
    await writeAuditLog({
      discussionId: input.discussionId,
      actorUserId: input.actorUserId,
      action: 'message_deleted_by_moderator',
      details: { messageId: input.messageId, authorUserId: existing.authorUserId },
    })
  }
}

function isValidReactionEmoji(emoji: string): boolean {
  const trimmed = emoji.trim()
  if (!trimmed || trimmed.length > 8) return false
  return /\p{Extended_Pictographic}/u.test(trimmed)
}

/**
 * Toggle an emoji reaction on a message. Each participant may have at most one
 * reaction; clicking the same emoji again removes it, clicking a different one
 * replaces the previous reaction.
 */
export async function toggleMessageReaction(input: {
  messageId: string
  discussionId: string
  userId: string
  emoji: string
}): Promise<DiscussCaseMessage> {
  const emoji = input.emoji.trim()
  if (!isValidReactionEmoji(emoji)) throw new Error('Invalid emoji')

  const existing = await getMessage(input.discussionId, input.messageId)
  if (!existing) throw new Error('Message not found')

  const reactions = [...(existing.reactions ?? [])]
  const sameIdx = reactions.findIndex(
    (r) => r.userId === input.userId && r.emoji === emoji,
  )
  if (sameIdx >= 0) {
    reactions.splice(sameIdx, 1)
  } else {
    const userIdx = reactions.findIndex((r) => r.userId === input.userId)
    if (userIdx >= 0) reactions.splice(userIdx, 1)
    reactions.push({
      userId: input.userId,
      emoji,
      createdAt: new Date().toISOString(),
    })
  }

  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_messages')
    .update({ reactions })
    .eq('id', input.messageId)
    .eq('discussion_id', input.discussionId)
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Message not found')

  return mapMessage(data as Record<string, unknown>)
}

export async function listAnnotations(discussionId: string): Promise<DiscussCaseAnnotation[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_annotations')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapAnnotation(row as Record<string, unknown>))
}

export async function addAnnotation(input: {
  discussionId: string
  authorUserId: string
  sectionId: string
  startOffset: number
  endOffset: number
  highlightedText: string
  commentBody?: string | null
}): Promise<DiscussCaseAnnotation> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_annotations')
    .insert({
      discussion_id: input.discussionId,
      author_user_id: input.authorUserId,
      section_id: input.sectionId,
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      highlighted_text: input.highlightedText,
      comment_body: input.commentBody ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapAnnotation(data as Record<string, unknown>)
}

export async function resolveAnnotation(input: {
  annotationId: string
  discussionId: string
  resolvedBy: string
}): Promise<DiscussCaseAnnotation> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_annotations')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
    })
    .eq('id', input.annotationId)
    .eq('discussion_id', input.discussionId)
    .select('*')
    .single()
  if (error) throw error
  return mapAnnotation(data as Record<string, unknown>)
}

export async function listInvites(discussionId: string): Promise<DiscussCaseInvite[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_invites')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapInvite(row as Record<string, unknown>))
}

export async function revokeInvite(input: {
  inviteId: string
  discussionId: string
  actorUserId: string
}): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase
    .from('dc_invites')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', input.inviteId)
    .eq('discussion_id', input.discussionId)
  if (error) throw error

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.actorUserId,
    action: 'invite_revoked',
    details: { inviteId: input.inviteId },
  })
}

/**
 * Soft-revoke a single participant's access to a discussion. The row is kept
 * (status = 'revoked') so the roster + audit trail retain a record, while RLS
 * (`dc_is_participant`) and the server-side `getParticipant` lookup immediately
 * stop treating the user as a member. The discussion owner cannot be revoked.
 */
export async function revokeParticipant(input: {
  participantId: string
  discussionId: string
  actorUserId: string
}): Promise<DiscussCaseParticipant> {
  const supabase = getKbSupabaseAdmin()

  const { data: targetRow, error: targetError } = await supabase
    .from('dc_participants')
    .select('*')
    .eq('id', input.participantId)
    .eq('discussion_id', input.discussionId)
    .maybeSingle()
  if (targetError) throw targetError
  if (!targetRow) throw new Error('Participant not found')

  const target = mapParticipant(targetRow as Record<string, unknown>)
  if (target.role === 'owner') {
    throw new Error('Cannot revoke the discussion owner')
  }

  const { data, error } = await supabase
    .from('dc_participants')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorUserId,
    })
    .eq('id', input.participantId)
    .eq('discussion_id', input.discussionId)
    .select('*')
    .single()
  if (error) throw error

  // Revoke any still-pending invite that admitted this participant so the link
  // cannot be reused to rejoin.
  if (target.inviteId) {
    await supabase
      .from('dc_invites')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', target.inviteId)
      .eq('status', 'pending')
  }

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.actorUserId,
    action: 'participant_revoked',
    details: { participantId: input.participantId, userId: target.userId, role: target.role },
  })

  return mapParticipant(data as Record<string, unknown>)
}

/**
 * Data-retention purge for DiscussCase: deletes the identified package version
 * so that, once a discussion is archived/revoked, no identifiable patient data
 * remains in Supabase. The de-identified package is retained so the discussion
 * thread stays readable. The owner keeps the source data in the local vault.
 */
export async function purgeIdentifiedPackage(
  discussionId: string,
  actorUserId: string,
): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_discussion_packages')
    .delete()
    .eq('discussion_id', discussionId)
    .eq('is_deidentified', false)
    .select('id')
  if (error) throw error

  if ((data ?? []).length > 0) {
    await writeAuditLog({
      discussionId,
      actorUserId,
      action: 'identified_package_purged',
      details: { packageCount: (data ?? []).length },
    })
  }
}

export async function archiveDiscussion(input: {
  discussionId: string
  actorUserId: string
  status: 'archived' | 'revoked'
}): Promise<DiscussCaseDiscussion> {
  const supabase = getKbSupabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('dc_discussions')
    .update({ status: input.status, updated_at: now })
    .eq('id', input.discussionId)
    .select('*')
    .single()
  if (error) throw error

  // Revoke any still-pending invites so revoked/archived discussions can't be joined.
  await supabase
    .from('dc_invites')
    .update({ status: 'revoked', revoked_at: now })
    .eq('discussion_id', input.discussionId)
    .eq('status', 'pending')

  await purgeIdentifiedPackage(input.discussionId, input.actorUserId)

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.actorUserId,
    action: input.status === 'revoked' ? 'discussion_revoked' : 'discussion_archived',
  })

  return mapDiscussion(data as Record<string, unknown>)
}

/**
 * Permanently delete a discussion and (via FK `on delete cascade`) every child
 * row: packages, invites, participants, messages, annotations, AI requests and
 * audit logs. This operates purely on row ids and never touches the E2EE
 * package payload, so the owner can delete a discussion even when they no
 * longer hold the decryption key and cannot open the session.
 *
 * `requireArchived` keeps the original safety rail for the in-session manager
 * flow (only archived discussions are deletable there). The list-page owner
 * flow passes `requireArchived: false` so a creator can remove a discussion
 * they are locked out of without first archiving it.
 */
export async function deleteDiscussion(input: {
  discussionId: string
  actorUserId: string
  requireArchived?: boolean
}): Promise<void> {
  const requireArchived = input.requireArchived ?? true
  const discussion = await getDiscussion(input.discussionId)
  if (!discussion) {
    throw new Error('Discussion not found')
  }
  if (requireArchived && discussion.status !== 'archived') {
    throw new Error('Only archived discussions can be deleted')
  }

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.actorUserId,
    action: 'discussion_deleted',
    details: {
      title: discussion.title,
      caseId: discussion.caseId,
      status: discussion.status,
    },
  })

  const supabase = getKbSupabaseAdmin()
  let query = supabase.from('dc_discussions').delete().eq('id', input.discussionId)
  if (requireArchived) {
    query = query.eq('status', 'archived')
  }
  const { error } = await query
  if (error) throw error
}

export async function listAuditLogs(discussionId: string): Promise<DiscussCaseAuditLog[]> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase
    .from('dc_audit_logs')
    .select('*')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []).map((row) => mapAuditLog(row as Record<string, unknown>))
}

export async function recordAiRequest(input: {
  discussionId: string
  requesterUserId: string
  prompt: string
  responseText: string
  status?: 'completed' | 'failed' | 'discarded'
}): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.from('dc_ai_requests').insert({
    discussion_id: input.discussionId,
    requester_user_id: input.requesterUserId,
    prompt: input.prompt,
    context_scope: 'visible_package',
    response_text: input.responseText,
    status: input.status ?? 'completed',
  })
  if (error) throw error

  await writeAuditLog({
    discussionId: input.discussionId,
    actorUserId: input.requesterUserId,
    action: 'ai_request',
    details: { promptLength: input.prompt.length },
  })
}

export async function previewInvitePackage(token: string): Promise<{
  discussion: DiscussCaseDiscussion
  package: DiscussPackageContent
  inviteType: 'internal' | 'external'
}> {
  const supabase = getKbSupabaseAdmin()
  const tokenHash = hashInviteToken(token)

  const { data: inviteRow, error: inviteError } = await supabase
    .from('dc_invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (inviteError) throw inviteError
  if (!inviteRow) throw new Error('Invalid invite token')

  const invite = mapInvite(inviteRow as Record<string, unknown>)
  const discussion = await getDiscussion(invite.discussionId)
  if (!discussion) throw new Error('Discussion not found')

  const packages = await getLatestPackages(invite.discussionId)
  const useIdentified = invite.inviteType === 'internal' &&
    invite.permissions.includes('view_identified_data')
  const pkg = useIdentified ? packages.identified : packages.deidentified
  if (!pkg) throw new Error('Package not found')

  return {
    discussion,
    package: pkg.content,
    inviteType: invite.inviteType,
  }
}

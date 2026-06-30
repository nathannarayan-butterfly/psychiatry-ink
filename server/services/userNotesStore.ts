import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

/**
 * Server-side encryption-at-rest for user_notes and kb_pharma_comments
 * (Design D quick win). The client encrypts `{title, content}` (notes) or
 * `text` (comments) with the existing per-device RSA-wrapped AES-GCM key
 * (`src/utils/cryptoVault.ts:encryptJsonPayload`) and uploads
 * `{ciphertext, iv, wrappedKey, payloadVersion}`. When the client sends
 * ciphertext, the legacy plaintext columns are forced to empty so a row
 * cannot carry both — preventing accidental plaintext leaks during rollout.
 *
 * The server still accepts legacy plaintext writes (no ciphertext fields)
 * so older clients keep working until every install has upgraded; then a
 * follow-up migration can drop the plaintext columns.
 */
export interface NoteCiphertextEnvelope {
  ciphertext: string | null
  iv: string | null
  wrappedKey: string | null
  payloadVersion: number
}

export interface UserNoteRow extends NoteCiphertextEnvelope {
  id: string
  title: string
  content: string
  kind: string
  category: string
  pageType: string
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export function isUserNotesStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

function mapNoteRow(row: Record<string, unknown>): UserNoteRow {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    kind: String(row.kind ?? 'manual'),
    category: String(row.category ?? 'formulare'),
    pageType: String(row.page_type ?? 'standalone:manual'),
    deleted: Boolean(row.deleted),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ciphertext: row.ciphertext != null ? String(row.ciphertext) : null,
    iv: row.iv != null ? String(row.iv) : null,
    wrappedKey: row.wrapped_key != null ? String(row.wrapped_key) : null,
    payloadVersion:
      typeof row.payload_version === 'number' ? row.payload_version : 1,
  }
}

export async function listUserNotes(ownerUserId: string): Promise<UserNoteRow[]> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('user_notes')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('deleted', false)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapNoteRow(row as Record<string, unknown>))
}

export interface UpsertUserNoteInput {
  id?: string
  title?: string
  content?: string
  kind?: string
  category?: string
  pageType?: string
  /** Optional ciphertext envelope — when present, plaintext columns are zeroed. */
  ciphertext?: string
  iv?: string
  wrappedKey?: string
  payloadVersion?: number
}

export async function upsertUserNote(
  ownerUserId: string,
  input: UpsertUserNoteInput,
): Promise<UserNoteRow> {
  const now = new Date().toISOString()

  const hasCiphertext = Boolean(input.ciphertext && input.iv && input.wrappedKey)

  // SECURITY: when the client uploads ciphertext, force-clear the legacy
  // plaintext columns so a single row cannot carry both copies. Older clients
  // that send plaintext continue to work; we never overwrite an existing
  // ciphertext row with plaintext implicitly (the client must send a fresh
  // ciphertext if it wants to update the note).
  const payload: Record<string, unknown> = {
    owner_user_id: ownerUserId,
    kind: input.kind ?? 'manual',
    category: input.category ?? 'formulare',
    page_type: input.pageType ?? 'standalone:manual',
    updated_at: now,
  }

  if (hasCiphertext) {
    payload.ciphertext = input.ciphertext
    payload.iv = input.iv
    payload.wrapped_key = input.wrappedKey
    payload.payload_version = input.payloadVersion ?? 1
    payload.title = ''
    payload.content = ''
  } else {
    payload.title = input.title ?? ''
    payload.content = input.content ?? ''
    payload.ciphertext = null
    payload.iv = null
    payload.wrapped_key = null
    payload.payload_version = 1
  }

  if (input.id) {
    const { data, error } = await getKbSupabaseAdmin()
      .from('user_notes')
      .update(payload)
      .eq('owner_user_id', ownerUserId)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapNoteRow(data as Record<string, unknown>)
  }

  const { data, error } = await getKbSupabaseAdmin()
    .from('user_notes')
    .insert({ ...payload, created_at: now })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapNoteRow(data as Record<string, unknown>)
}

export async function softDeleteUserNote(ownerUserId: string, noteId: string): Promise<void> {
  const { error } = await getKbSupabaseAdmin()
    .from('user_notes')
    .update({ deleted: true, updated_at: new Date().toISOString() })
    .eq('owner_user_id', ownerUserId)
    .eq('id', noteId)
  if (error) throw new Error(error.message)
}

export interface KbPharmaCommentRow extends NoteCiphertextEnvelope {
  id: string
  medicationId: string
  sectionId: string
  text: string
  highlightId: string | null
  deleted: boolean
  createdAt: string
  updatedAt: string
}

function mapCommentRow(row: Record<string, unknown>): KbPharmaCommentRow {
  return {
    id: String(row.id),
    medicationId: String(row.medication_id),
    sectionId: String(row.section_id),
    text: String(row.text ?? ''),
    highlightId: row.highlight_id ? String(row.highlight_id) : null,
    deleted: Boolean(row.deleted),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ciphertext: row.ciphertext != null ? String(row.ciphertext) : null,
    iv: row.iv != null ? String(row.iv) : null,
    wrappedKey: row.wrapped_key != null ? String(row.wrapped_key) : null,
    payloadVersion:
      typeof row.payload_version === 'number' ? row.payload_version : 1,
  }
}

export async function listKbPharmaComments(ownerUserId: string): Promise<KbPharmaCommentRow[]> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('kb_pharma_comments')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapCommentRow(row as Record<string, unknown>))
}

export interface UpsertKbPharmaCommentInput {
  id?: string
  medicationId: string
  sectionId: string
  text?: string
  highlightId?: string | null
  /** Optional ciphertext envelope — when present, plaintext text is zeroed. */
  ciphertext?: string
  iv?: string
  wrappedKey?: string
  payloadVersion?: number
}

export async function upsertKbPharmaComment(
  ownerUserId: string,
  input: UpsertKbPharmaCommentInput,
): Promise<KbPharmaCommentRow> {
  const now = new Date().toISOString()
  const hasCiphertext = Boolean(input.ciphertext && input.iv && input.wrappedKey)

  const payload: Record<string, unknown> = {
    owner_user_id: ownerUserId,
    medication_id: input.medicationId,
    section_id: input.sectionId,
    highlight_id: input.highlightId ?? null,
    updated_at: now,
  }

  if (hasCiphertext) {
    payload.ciphertext = input.ciphertext
    payload.iv = input.iv
    payload.wrapped_key = input.wrappedKey
    payload.payload_version = input.payloadVersion ?? 1
    payload.text = ''
  } else {
    payload.text = input.text ?? ''
    payload.ciphertext = null
    payload.iv = null
    payload.wrapped_key = null
    payload.payload_version = 1
  }

  if (input.id) {
    const { data, error } = await getKbSupabaseAdmin()
      .from('kb_pharma_comments')
      .update(payload)
      .eq('owner_user_id', ownerUserId)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapCommentRow(data as Record<string, unknown>)
  }

  const { data, error } = await getKbSupabaseAdmin()
    .from('kb_pharma_comments')
    .insert({ ...payload, created_at: now })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapCommentRow(data as Record<string, unknown>)
}

export async function softDeleteKbPharmaComment(ownerUserId: string, commentId: string): Promise<void> {
  const { error } = await getKbSupabaseAdmin()
    .from('kb_pharma_comments')
    .update({ deleted: true, updated_at: new Date().toISOString() })
    .eq('owner_user_id', ownerUserId)
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}

import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

export interface UserNoteRow {
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

export async function upsertUserNote(
  ownerUserId: string,
  input: {
    id?: string
    title: string
    content: string
    kind?: string
    category?: string
    pageType?: string
  },
): Promise<UserNoteRow> {
  const now = new Date().toISOString()
  const payload = {
    owner_user_id: ownerUserId,
    title: input.title,
    content: input.content,
    kind: input.kind ?? 'manual',
    category: input.category ?? 'formulare',
    page_type: input.pageType ?? 'standalone:manual',
    updated_at: now,
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

export interface KbPharmaCommentRow {
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

export async function upsertKbPharmaComment(
  ownerUserId: string,
  input: {
    id?: string
    medicationId: string
    sectionId: string
    text: string
    highlightId?: string | null
  },
): Promise<KbPharmaCommentRow> {
  const now = new Date().toISOString()
  const payload = {
    owner_user_id: ownerUserId,
    medication_id: input.medicationId,
    section_id: input.sectionId,
    text: input.text,
    highlight_id: input.highlightId ?? null,
    updated_at: now,
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

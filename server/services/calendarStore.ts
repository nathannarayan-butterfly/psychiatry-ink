import type {
  CalendarItemStatus,
  CalendarItemType,
  CalendarItemWire,
  CalendarPriority,
  CreateCalendarItemWireInput,
  RescheduleEntry,
  UpdateCalendarItemWireInput,
} from '../../src/types/calendar'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

function mapRow(row: Record<string, unknown>): CalendarItemWire {
  const auditMeta = (row.audit_metadata ?? {}) as { rescheduleHistory?: RescheduleEntry[] }
  const wire: CalendarItemWire = {
    id: String(row.id),
    type: row.type as CalendarItemType,
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    status: row.status as CalendarItemStatus,
    priority: row.priority ? (row.priority as CalendarPriority) : undefined,
    assignedUserId: row.assigned_user_id ? String(row.assigned_user_id) : undefined,
    location: row.location ? String(row.location) : undefined,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    encryptedPayload: row.encrypted_payload ? String(row.encrypted_payload) : null,
    auditMetadata: {
      rescheduleHistory: auditMeta.rescheduleHistory ?? [],
    },
  }

  // Legacy plaintext columns (backward compat read only).
  if (row.title) wire.title = String(row.title)
  if (row.patient_id) wire.patientId = String(row.patient_id)
  if (row.case_id) wire.caseId = String(row.case_id)
  if (row.notes) wire.notes = String(row.notes)
  if (row.reason) wire.reason = String(row.reason)

  return wire
}

export function isCalendarStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

export async function listCalendarItems(
  organisationId: string,
  filters: { from: string; to: string; assignedUserId?: string },
): Promise<CalendarItemWire[]> {
  let query = getKbSupabaseAdmin()
    .from('cal_calendar_items')
    .select('*')
    .eq('organisation_id', organisationId)
    .gte('start_time', filters.from)
    .lte('start_time', filters.to)
    .order('start_time', { ascending: true })

  if (filters.assignedUserId?.trim()) {
    query = query.eq('assigned_user_id', filters.assignedUserId.trim())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function getCalendarItem(
  organisationId: string,
  itemId: string,
): Promise<CalendarItemWire | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('cal_calendar_items')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('id', itemId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function createCalendarItem(
  organisationId: string,
  userId: string,
  input: CreateCalendarItemWireInput,
): Promise<CalendarItemWire> {
  const now = new Date().toISOString()
  const { data, error } = await getKbSupabaseAdmin()
    .from('cal_calendar_items')
    .insert({
      organisation_id: organisationId,
      type: input.type,
      title: '',
      patient_id: null,
      case_id: null,
      start_time: input.startTime,
      end_time: input.endTime,
      status: input.status ?? 'scheduled',
      priority: input.priority ?? null,
      assigned_user_id: input.assignedUserId ?? userId,
      location: input.location ?? null,
      notes: null,
      reason: null,
      encrypted_payload: input.encryptedPayload,
      created_by: userId,
      created_at: now,
      updated_at: now,
      audit_metadata: { rescheduleHistory: [] },
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function updateCalendarItem(
  organisationId: string,
  itemId: string,
  input: UpdateCalendarItemWireInput,
): Promise<CalendarItemWire> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.type !== undefined) patch.type = input.type
  if (input.startTime !== undefined) patch.start_time = input.startTime
  if (input.endTime !== undefined) patch.end_time = input.endTime
  if (input.status !== undefined) patch.status = input.status
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.assignedUserId !== undefined) patch.assigned_user_id = input.assignedUserId
  if (input.location !== undefined) patch.location = input.location
  if (input.encryptedPayload !== undefined) {
    patch.encrypted_payload = input.encryptedPayload
    patch.title = ''
    patch.patient_id = null
    patch.case_id = null
    patch.notes = null
    patch.reason = null
  }

  const { data, error } = await getKbSupabaseAdmin()
    .from('cal_calendar_items')
    .update(patch)
    .eq('organisation_id', organisationId)
    .eq('id', itemId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function rescheduleCalendarItem(
  organisationId: string,
  itemId: string,
  userId: string,
  startTime: string,
  endTime: string,
): Promise<CalendarItemWire> {
  const existing = await getCalendarItem(organisationId, itemId)
  if (!existing) throw new Error('Calendar item not found')

  const entry: RescheduleEntry = {
    previousStart: existing.startTime,
    previousEnd: existing.endTime,
    newStart: startTime,
    newEnd: endTime,
    userId,
    timestamp: new Date().toISOString(),
  }

  const history = [...(existing.auditMetadata?.rescheduleHistory ?? []), entry]

  const admin = getKbSupabaseAdmin()
  const { error: logError } = await admin.from('cal_reschedule_log').insert({
    calendar_item_id: itemId,
    previous_start: entry.previousStart,
    previous_end: entry.previousEnd,
    new_start: entry.newStart,
    new_end: entry.newEnd,
    user_id: userId,
    reason: null,
  })
  if (logError) throw new Error(logError.message)

  const { data, error } = await admin
    .from('cal_calendar_items')
    .update({
      start_time: startTime,
      end_time: endTime,
      updated_at: new Date().toISOString(),
      audit_metadata: { rescheduleHistory: history },
    })
    .eq('organisation_id', organisationId)
    .eq('id', itemId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export async function setCalendarItemStatus(
  organisationId: string,
  itemId: string,
  status: CalendarItemStatus,
): Promise<CalendarItemWire> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('cal_calendar_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', itemId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}

export function rowHasEncryptedPayload(row: Record<string, unknown>): boolean {
  return Boolean(row.encrypted_payload)
}

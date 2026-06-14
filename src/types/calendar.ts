export const CALENDAR_ITEM_TYPES = [
  'consultation',
  'follow_up',
  'lab_test',
  'phone_call',
  'video_call',
  'medication_review',
  'document_task',
  'external_consultation',
  'other',
] as const

export type CalendarItemType = (typeof CALENDAR_ITEM_TYPES)[number]

export const CALENDAR_ITEM_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export type CalendarItemStatus = (typeof CALENDAR_ITEM_STATUSES)[number]

export const CALENDAR_PRIORITIES = ['low', 'normal', 'high'] as const

export type CalendarPriority = (typeof CALENDAR_PRIORITIES)[number]

export interface RescheduleEntry {
  previousStart: string
  previousEnd: string
  newStart: string
  newEnd: string
  userId: string
  timestamp: string
  reason?: string
}

/** PHI fields encrypted client-side for Small Praxis org calendar. */
export interface CalendarSensitivePayload {
  title: string
  notes?: string
  reason?: string
  patientId?: string
  caseId?: string
}

export interface CalendarItem {
  id: string
  type: CalendarItemType
  title: string
  patientId?: string
  caseId?: string
  startTime: string
  endTime: string
  status: CalendarItemStatus
  priority?: CalendarPriority
  assignedUserId?: string
  location?: string
  notes?: string
  reason?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  auditMetadata?: {
    rescheduleHistory: RescheduleEntry[]
  }
}

/** Wire format from Supabase — skeleton + optional ciphertext envelope JSON. */
export interface CalendarItemWire {
  id: string
  type: CalendarItemType
  startTime: string
  endTime: string
  status: CalendarItemStatus
  priority?: CalendarPriority
  assignedUserId?: string
  location?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  encryptedPayload?: string | null
  auditMetadata?: {
    rescheduleHistory: RescheduleEntry[]
  }
  /** Legacy plaintext fallback until re-saved encrypted. */
  title?: string
  patientId?: string
  caseId?: string
  notes?: string
  reason?: string
}

export interface CreateCalendarItemWireInput {
  type: CalendarItemType
  startTime: string
  endTime: string
  status?: CalendarItemStatus
  priority?: CalendarPriority
  assignedUserId?: string
  location?: string
  encryptedPayload: string
  /** ACL check only — not stored in plaintext columns. */
  caseId?: string
}

export interface UpdateCalendarItemWireInput {
  type?: CalendarItemType
  startTime?: string
  endTime?: string
  status?: CalendarItemStatus
  priority?: CalendarPriority | null
  assignedUserId?: string | null
  location?: string | null
  encryptedPayload?: string
  /** ACL check only — not stored in plaintext columns. */
  caseId?: string | null
}

export interface CreateCalendarItemInput {
  type: CalendarItemType
  title: string
  patientId?: string
  caseId?: string
  startTime: string
  endTime: string
  status?: CalendarItemStatus
  priority?: CalendarPriority
  assignedUserId?: string
  location?: string
  notes?: string
  reason?: string
}

export interface UpdateCalendarItemInput {
  type?: CalendarItemType
  title?: string
  patientId?: string | null
  caseId?: string | null
  startTime?: string
  endTime?: string
  status?: CalendarItemStatus
  priority?: CalendarPriority | null
  assignedUserId?: string | null
  location?: string | null
  notes?: string | null
  reason?: string | null
}

export interface RescheduleCalendarInput {
  startTime: string
  endTime: string
  reason?: string
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'list'

export interface CalendarListFilters {
  from: string
  to: string
  assignedUserId?: string
}

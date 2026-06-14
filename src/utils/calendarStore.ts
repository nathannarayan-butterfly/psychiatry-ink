import { safeSetItem } from './safeStorage'
import {
  decryptJsonPayload,
  encryptJsonPayload,
  type EncryptedVaultBlob,
} from './cryptoVault'
import type {
  CalendarItem,
  CalendarItemStatus,
  CreateCalendarItemInput,
  RescheduleCalendarInput,
  RescheduleEntry,
  UpdateCalendarItemInput,
} from '../types/calendar'

export const CALENDAR_CHANGED_EVENT = 'psychiatry-ink:calendar:changed'

export interface CalendarStorageScope {
  userId: string
  /** Set for Small Praxis — routes to encrypted Supabase via /api/calendar (not localStorage). */
  orgId?: string | null
  /** Owner can bootstrap org calendar encryption key. */
  isOrgOwner?: boolean
}

/** localStorage key for single_use tier only: `psychiatry-ink:calendar:{userId}` */
export function calendarStorageKey(scope: CalendarStorageScope): string {
  return `psychiatry-ink:calendar:${scope.userId.trim() || 'default'}`
}

function isEncryptedVaultBlob(value: unknown): value is EncryptedVaultBlob {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'number' &&
    typeof record.ciphertext === 'string' &&
    typeof record.iv === 'string' &&
    typeof record.wrappedKey === 'string'
  )
}

function isCalendarItemArray(value: unknown): value is CalendarItem[] {
  return Array.isArray(value)
}

async function loadRaw(scope: CalendarStorageScope): Promise<CalendarItem[]> {
  try {
    const raw = localStorage.getItem(calendarStorageKey(scope))
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (isEncryptedVaultBlob(parsed)) {
      const items = await decryptJsonPayload<CalendarItem[]>(parsed)
      return Array.isArray(items) ? items : []
    }

    if (isCalendarItemArray(parsed)) {
      await persist(scope, parsed)
      return parsed
    }

    return []
  } catch {
    return []
  }
}

async function persist(scope: CalendarStorageScope, items: CalendarItem[]): Promise<void> {
  const blob = await encryptJsonPayload(items)
  safeSetItem(calendarStorageKey(scope), JSON.stringify(blob))
  try {
    window.dispatchEvent(new CustomEvent(CALENDAR_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

export async function listLocalCalendarItems(
  scope: CalendarStorageScope,
  filters: { from: string; to: string; assignedUserId?: string },
): Promise<CalendarItem[]> {
  const fromMs = new Date(filters.from).getTime()
  const toMs = new Date(filters.to).getTime()
  const items = await loadRaw(scope)
  return items
    .filter((item) => {
      const startMs = new Date(item.startTime).getTime()
      if (startMs < fromMs || startMs > toMs) return false
      if (filters.assignedUserId && item.assignedUserId !== filters.assignedUserId) return false
      return true
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export async function getLocalCalendarItem(
  scope: CalendarStorageScope,
  itemId: string,
): Promise<CalendarItem | null> {
  const items = await loadRaw(scope)
  return items.find((item) => item.id === itemId) ?? null
}

export async function createLocalCalendarItem(
  scope: CalendarStorageScope,
  input: CreateCalendarItemInput,
): Promise<CalendarItem> {
  const now = new Date().toISOString()
  const item: CalendarItem = {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title.trim(),
    patientId: input.patientId,
    caseId: input.caseId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status ?? 'scheduled',
    priority: input.priority,
    assignedUserId: input.assignedUserId ?? scope.userId,
    location: input.location,
    notes: input.notes,
    reason: input.reason,
    createdBy: scope.userId,
    createdAt: now,
    updatedAt: now,
    auditMetadata: { rescheduleHistory: [] },
  }
  const items = await loadRaw(scope)
  await persist(scope, [...items, item])
  return item
}

export async function updateLocalCalendarItem(
  scope: CalendarStorageScope,
  itemId: string,
  input: UpdateCalendarItemInput & { auditMetadata?: CalendarItem['auditMetadata'] },
): Promise<CalendarItem | null> {
  const items = await loadRaw(scope)
  const index = items.findIndex((item) => item.id === itemId)
  if (index < 0) return null

  const existing = items[index]
  const updated: CalendarItem = {
    ...existing,
    type: input.type ?? existing.type,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    patientId: input.patientId === null ? undefined : input.patientId ?? existing.patientId,
    caseId: input.caseId === null ? undefined : input.caseId ?? existing.caseId,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    status: input.status ?? existing.status,
    priority: input.priority === null ? undefined : input.priority ?? existing.priority,
    assignedUserId:
      input.assignedUserId === null ? undefined : input.assignedUserId ?? existing.assignedUserId,
    location: input.location === null ? undefined : input.location ?? existing.location,
    notes: input.notes === null ? undefined : input.notes ?? existing.notes,
    reason: input.reason === null ? undefined : input.reason ?? existing.reason,
    auditMetadata: input.auditMetadata ?? existing.auditMetadata,
    updatedAt: new Date().toISOString(),
  }
  const next = [...items]
  next[index] = updated
  await persist(scope, next)
  return updated
}

export async function rescheduleLocalCalendarItem(
  scope: CalendarStorageScope,
  itemId: string,
  input: RescheduleCalendarInput,
): Promise<CalendarItem | null> {
  const existing = await getLocalCalendarItem(scope, itemId)
  if (!existing) return null

  const entry: RescheduleEntry = {
    previousStart: existing.startTime,
    previousEnd: existing.endTime,
    newStart: input.startTime,
    newEnd: input.endTime,
    userId: scope.userId,
    timestamp: new Date().toISOString(),
    reason: input.reason?.trim() || undefined,
  }

  return updateLocalCalendarItem(scope, itemId, {
    startTime: input.startTime,
    endTime: input.endTime,
    auditMetadata: {
      rescheduleHistory: [...(existing.auditMetadata?.rescheduleHistory ?? []), entry],
    },
  })
}

export async function setLocalCalendarItemStatus(
  scope: CalendarStorageScope,
  itemId: string,
  status: CalendarItemStatus,
): Promise<CalendarItem | null> {
  return updateLocalCalendarItem(scope, itemId, { status })
}

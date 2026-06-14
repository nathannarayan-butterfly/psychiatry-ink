import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  CalendarItem,
  CalendarItemWire,
  CalendarSensitivePayload,
  CreateCalendarItemInput,
  RescheduleCalendarInput,
  UpdateCalendarItemInput,
} from '../types/calendar'
import {
  bootstrapOrgCalendarKey,
  decryptWireCalendarItem,
  decryptWireCalendarItems,
  encryptCalendarPayload,
  splitCalendarInput,
  splitCalendarUpdate,
} from '../utils/calendarEncryption'
import {
  createLocalCalendarItem,
  listLocalCalendarItems,
  rescheduleLocalCalendarItem,
  setLocalCalendarItemStatus,
  updateLocalCalendarItem,
  type CalendarStorageScope,
} from '../utils/calendarStore'

export type { CalendarStorageScope }

async function remoteCalendarFetch(
  organisationId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}/api/calendar${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      'X-Organisation-Id': organisationId,
      ...init?.headers,
    },
  })
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(detail?.error ?? `${fallback} (${response.status})`)
}

/** small_praxis → Supabase API; single_use → localStorage only. */
function usesRemoteCalendar(scope: CalendarStorageScope): boolean {
  return Boolean(scope.orgId?.trim())
}

async function ensureCalendarKey(scope: CalendarStorageScope): Promise<CryptoKey> {
  const orgId = scope.orgId!.trim()
  return bootstrapOrgCalendarKey(orgId, Boolean(scope.isOrgOwner), scope.userId)
}

async function decryptItem(key: CryptoKey, wire: CalendarItemWire): Promise<CalendarItem> {
  return decryptWireCalendarItem(key, wire)
}

async function loadSensitiveFromItem(
  key: CryptoKey,
  wire: CalendarItemWire,
): Promise<CalendarSensitivePayload> {
  const item = await decryptWireCalendarItem(key, wire)
  return {
    title: item.title,
    notes: item.notes,
    reason: item.reason,
    patientId: item.patientId,
    caseId: item.caseId,
  }
}

export async function listCalendarItemsApi(
  scope: CalendarStorageScope,
  filters: {
    from: string
    to: string
    assignedUserId?: string
  },
): Promise<CalendarItem[]> {
  if (!usesRemoteCalendar(scope)) {
    return await listLocalCalendarItems(scope, filters)
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)
  const params = new URLSearchParams({ from: filters.from, to: filters.to })
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId)

  const response = await remoteCalendarFetch(orgId, `/?${params}`)
  if (!response.ok) await parseError(response, 'Kalender konnte nicht geladen werden')

  const body = (await response.json()) as { items: CalendarItemWire[] }
  return decryptWireCalendarItems(key, body.items ?? [])
}

export async function createCalendarItemApi(
  scope: CalendarStorageScope,
  input: CreateCalendarItemInput,
): Promise<CalendarItem> {
  if (!usesRemoteCalendar(scope)) {
    return await createLocalCalendarItem(scope, input)
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)
  const { sensitive, skeleton, caseIdForAcl } = splitCalendarInput(input)
  const envelope = await encryptCalendarPayload(key, sensitive)

  const response = await remoteCalendarFetch(orgId, '/', {
    method: 'POST',
    body: JSON.stringify({
      ...skeleton,
      encryptedPayload: JSON.stringify(envelope),
      caseId: caseIdForAcl,
    }),
  })
  if (!response.ok) await parseError(response, 'Termin konnte nicht erstellt werden')

  const body = (await response.json()) as { item: CalendarItemWire }
  return decryptItem(key, body.item)
}

export async function updateCalendarItemApi(
  scope: CalendarStorageScope,
  id: string,
  input: UpdateCalendarItemInput,
): Promise<CalendarItem> {
  if (!usesRemoteCalendar(scope)) {
    const item = await updateLocalCalendarItem(scope, id, input)
    if (!item) throw new Error('Termin nicht gefunden')
    return item
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)
  const { sensitivePatch, skeletonPatch, caseIdForAcl, touchesSensitive } = splitCalendarUpdate(input)

  const wirePatch: Record<string, unknown> = { ...skeletonPatch }
  if (touchesSensitive) {
    const existingResponse = await remoteCalendarFetch(orgId, `/${encodeURIComponent(id)}`)
    if (!existingResponse.ok) await parseError(existingResponse, 'Termin konnte nicht geladen werden')
    const existingBody = (await existingResponse.json()) as { item: CalendarItemWire }
    const existingWire = existingBody.item
    if (!existingWire) throw new Error('Termin nicht gefunden')

    const currentSensitive = await loadSensitiveFromItem(key, existingWire)
    const merged: CalendarSensitivePayload = {
      title: sensitivePatch.title ?? currentSensitive.title,
      notes: sensitivePatch.notes !== undefined ? sensitivePatch.notes : currentSensitive.notes,
      reason: sensitivePatch.reason !== undefined ? sensitivePatch.reason : currentSensitive.reason,
      patientId:
        sensitivePatch.patientId !== undefined ? sensitivePatch.patientId : currentSensitive.patientId,
      caseId: sensitivePatch.caseId !== undefined ? sensitivePatch.caseId : currentSensitive.caseId,
    }
    const envelope = await encryptCalendarPayload(key, merged)
    wirePatch.encryptedPayload = JSON.stringify(envelope)
  }

  if (caseIdForAcl !== undefined) {
    wirePatch.caseId = caseIdForAcl
  }

  const response = await remoteCalendarFetch(orgId, `/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(wirePatch),
  })
  if (!response.ok) await parseError(response, 'Termin konnte nicht aktualisiert werden')

  const body = (await response.json()) as { item: CalendarItemWire }
  return decryptItem(key, body.item)
}

export async function rescheduleCalendarItemApi(
  scope: CalendarStorageScope,
  id: string,
  input: RescheduleCalendarInput,
): Promise<CalendarItem> {
  if (!usesRemoteCalendar(scope)) {
    const item = await rescheduleLocalCalendarItem(scope, id, input)
    if (!item) throw new Error('Termin nicht gefunden')
    return item
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)

  const response = await remoteCalendarFetch(orgId, `/${encodeURIComponent(id)}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ startTime: input.startTime, endTime: input.endTime }),
  })
  if (!response.ok) await parseError(response, 'Termin konnte nicht verschoben werden')

  const body = (await response.json()) as { item: CalendarItemWire }
  let item = await decryptItem(key, body.item)

  if (input.reason?.trim()) {
    item = await updateCalendarItemApi(scope, id, { reason: input.reason.trim() })
  }

  return item
}

export async function completeCalendarItemApi(
  scope: CalendarStorageScope,
  id: string,
): Promise<CalendarItem> {
  if (!usesRemoteCalendar(scope)) {
    const item = await setLocalCalendarItemStatus(scope, id, 'completed')
    if (!item) throw new Error('Termin nicht gefunden')
    return item
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)

  const response = await remoteCalendarFetch(orgId, `/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
  })
  if (!response.ok) await parseError(response, 'Termin konnte nicht abgeschlossen werden')

  const body = (await response.json()) as { item: CalendarItemWire }
  return decryptItem(key, body.item)
}

export async function cancelCalendarItemApi(
  scope: CalendarStorageScope,
  id: string,
): Promise<CalendarItem> {
  if (!usesRemoteCalendar(scope)) {
    const item = await setLocalCalendarItemStatus(scope, id, 'cancelled')
    if (!item) throw new Error('Termin nicht gefunden')
    return item
  }

  const orgId = scope.orgId!.trim()
  const key = await ensureCalendarKey(scope)

  const response = await remoteCalendarFetch(orgId, `/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  })
  if (!response.ok) await parseError(response, 'Termin konnte nicht storniert werden')

  const body = (await response.json()) as { item: CalendarItemWire }
  return decryptItem(key, body.item)
}

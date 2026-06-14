import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

async function calendarKeyFetch(
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

export interface CalendarEncryptionKeyStatus {
  initialized: boolean
  hasWrappedKey: boolean
}

export async function fetchCalendarEncryptionKeyStatus(
  organisationId: string,
): Promise<CalendarEncryptionKeyStatus> {
  const response = await calendarKeyFetch(organisationId, '/encryption-key/status')
  if (!response.ok) await parseError(response, 'Failed to load calendar encryption status')
  return (await response.json()) as CalendarEncryptionKeyStatus
}

export async function fetchCalendarEncryptionKey(
  organisationId: string,
): Promise<{ wrappedKey: string }> {
  const response = await calendarKeyFetch(organisationId, '/encryption-key')
  if (!response.ok) await parseError(response, 'Failed to load calendar encryption key')
  return (await response.json()) as { wrappedKey: string }
}

export async function initCalendarEncryptionKey(
  organisationId: string,
  wrappedKey: string,
): Promise<void> {
  const response = await calendarKeyFetch(organisationId, '/encryption-key/init', {
    method: 'POST',
    body: JSON.stringify({ wrappedKey }),
  })
  if (response.status === 409) return
  if (!response.ok) await parseError(response, 'Failed to initialize calendar encryption key')
}

export async function uploadCalendarEncryptionKeyForMember(
  organisationId: string,
  userId: string,
  wrappedKey: string,
): Promise<void> {
  const response = await calendarKeyFetch(
    organisationId,
    `/encryption-key/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ wrappedKey }),
    },
  )
  if (!response.ok) await parseError(response, 'Failed to upload calendar encryption key')
}

export async function fetchMemberPublicKeysForCalendar(
  organisationId: string,
): Promise<{ members: Array<{ userId: string; publicKeyJwk: JsonWebKey }> }> {
  const response = await calendarKeyFetch(organisationId, '/encryption-key/member-public-keys')
  if (!response.ok) await parseError(response, 'Failed to load member public keys')
  return (await response.json()) as {
    members: Array<{ userId: string; publicKeyJwk: JsonWebKey }>
  }
}

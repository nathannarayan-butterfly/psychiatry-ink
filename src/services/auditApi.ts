import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { AuditAction, AuditLogEntry, AuditLogFilters } from '../types/auditLog'
import { AUDIT_ACTIONS } from '../types/auditLog'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })
}

export interface RecordAuditEventOptions {
  caseId?: string
  documentId?: string
  metadata?: Record<string, unknown>
  organisationId?: string
}

/**
 * Fire-and-forget audit event. Never throws — failures are swallowed.
 */
export async function recordAuditEvent(
  action: AuditAction,
  options: RecordAuditEventOptions = {},
): Promise<void> {
  try {
    const headers: HeadersInit = {}
    if (options.organisationId) {
      headers['X-Organisation-Id'] = options.organisationId
    }

    const response = await apiFetch('/api/audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        caseId: options.caseId,
        documentId: options.documentId,
        metadata: options.metadata,
      }),
    })

    if (!response.ok) {
      console.warn('[audit] record failed:', response.status)
    }
  } catch (err) {
    console.warn('[audit] record error:', err instanceof Error ? err.message : err)
  }
}

export async function fetchAuditLogs(
  filters: AuditLogFilters = {},
): Promise<{ logs: AuditLogEntry[]; actions: AuditAction[]; organisationId?: string }> {
  const params = new URLSearchParams()
  if (filters.action) params.set('action', filters.action)
  if (filters.caseId) params.set('caseId', filters.caseId)
  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.offset != null) params.set('offset', String(filters.offset))

  const qs = params.toString()
  const response = await apiFetch(`/api/audit${qs ? `?${qs}` : ''}`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to load audit logs (${response.status})`)
  }

  const body = (await response.json()) as {
    logs: AuditLogEntry[]
    actions?: AuditAction[]
    organisationId?: string
  }

  return {
    logs: body.logs ?? [],
    actions: body.actions ?? [...AUDIT_ACTIONS],
    organisationId: body.organisationId,
  }
}

const LOGIN_SESSION_KEY = 'psychiatry-ink:audit-login-recorded'

/** Record user_login once per browser session per user. */
export function recordLoginAuditOnce(userId: string, organisationId?: string): void {
  const key = `${LOGIN_SESSION_KEY}:${userId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // sessionStorage unavailable — still attempt log
  }
  void recordAuditEvent('user_login', { organisationId })
}

import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  ConsultationAuditLog,
  ConsultationMessage,
  ConsultationReport,
  ConsultationRequest,
  ConsultationSession,
  CreateConsultationInput,
  SaveReportInput,
} from '../types/consultation'

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

async function parseError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(detail?.error ?? `${fallback} (${response.status})`)
}

export async function listConsultationsForCase(caseId: string): Promise<ConsultationRequest[]> {
  const response = await apiFetch(`/api/consultation?caseId=${encodeURIComponent(caseId)}`)
  if (!response.ok) await parseError(response, 'Failed to list consultations')
  const data = (await response.json()) as { requests: ConsultationRequest[] }
  return data.requests ?? []
}

export async function listConsultantRequests(): Promise<ConsultationRequest[]> {
  const response = await apiFetch('/api/consultation?consultant=true')
  if (!response.ok) await parseError(response, 'Failed to list consultant requests')
  const data = (await response.json()) as { requests: ConsultationRequest[] }
  return data.requests ?? []
}

export async function createConsultation(
  input: CreateConsultationInput,
): Promise<{ request: ConsultationRequest; inviteToken?: string }> {
  const response = await apiFetch('/api/consultation', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to create consultation')
  return (await response.json()) as { request: ConsultationRequest; inviteToken?: string }
}

export async function loadConsultationSession(requestId: string): Promise<ConsultationSession> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/session`)
  if (!response.ok) await parseError(response, 'Failed to load session')
  return (await response.json()) as ConsultationSession
}

export async function saveConsultationReportDraft(
  requestId: string,
  input: SaveReportInput,
): Promise<ConsultationReport> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/report/draft`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to save draft')
  const data = (await response.json()) as { report: ConsultationReport }
  return data.report
}

export async function submitConsultationReport(
  requestId: string,
  input: SaveReportInput,
): Promise<ConsultationReport> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/report/submit`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to submit report')
  const data = (await response.json()) as { report: ConsultationReport }
  return data.report
}

export async function requestConsultationMoreInfo(
  requestId: string,
  body: string,
): Promise<ConsultationMessage> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/more-info`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  if (!response.ok) await parseError(response, 'Failed to request more info')
  const data = (await response.json()) as { message: ConsultationMessage }
  return data.message
}

export async function respondConsultationInfo(
  requestId: string,
  body: string,
): Promise<ConsultationMessage> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  if (!response.ok) await parseError(response, 'Failed to send response')
  const data = (await response.json()) as { message: ConsultationMessage }
  return data.message
}

export async function markConsultationReviewed(requestId: string): Promise<ConsultationRequest> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/reviewed`, {
    method: 'POST',
  })
  if (!response.ok) await parseError(response, 'Failed to mark reviewed')
  const data = (await response.json()) as { request: ConsultationRequest }
  return data.request
}

export async function archiveConsultation(requestId: string): Promise<ConsultationRequest> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/archive`, {
    method: 'POST',
  })
  if (!response.ok) await parseError(response, 'Failed to archive')
  const data = (await response.json()) as { request: ConsultationRequest }
  return data.request
}

export async function revokeConsultationAccess(requestId: string): Promise<ConsultationRequest> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/revoke`, {
    method: 'POST',
  })
  if (!response.ok) await parseError(response, 'Failed to revoke access')
  const data = (await response.json()) as { request: ConsultationRequest }
  return data.request
}

export async function listConsultationAuditLogs(requestId: string): Promise<ConsultationAuditLog[]> {
  const response = await apiFetch(`/api/consultation/${encodeURIComponent(requestId)}/audit-logs`)
  if (!response.ok) await parseError(response, 'Failed to list audit logs')
  const data = (await response.json()) as { logs: ConsultationAuditLog[] }
  return data.logs ?? []
}

export async function acceptConsultationInvite(token: string): Promise<{ request: ConsultationRequest }> {
  const response = await apiFetch('/api/consultation/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  if (!response.ok) await parseError(response, 'Failed to accept invite')
  return (await response.json()) as { request: ConsultationRequest }
}

export async function previewConsultationInvite(token: string): Promise<{
  specialty: string
  title: string
  inviteeEmail: string
}> {
  const response = await apiFetch(`/api/consultation/invites/preview?token=${encodeURIComponent(token)}`)
  if (!response.ok) await parseError(response, 'Invalid invite')
  return (await response.json()) as { specialty: string; title: string; inviteeEmail: string }
}

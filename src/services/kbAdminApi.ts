import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { KbSubstance, KbSubstanceDetail } from '../types/kbNormalized'

/** Whether KB admin API calls are allowed from this build (still requires user allowlist). */
export function isKbAdminApiEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_KB_ADMIN_ENABLED === 'false') return false
  return import.meta.env.VITE_KB_ADMIN_ENABLED === 'true'
}

async function kbAdminFetch<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const auth = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/kb-admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-KB-User-Id': userId,
      ...auth,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `KB admin request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchKbAdminStatus(): Promise<{ enabled: boolean; supabaseConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/api/kb-admin/status`)
  if (!res.ok) {
    throw new Error(`KB admin status failed (${res.status})`)
  }
  return res.json() as Promise<{ enabled: boolean; supabaseConfigured: boolean }>
}

export async function fetchKbAdminSubstances(
  userId: string,
  filters?: {
  status?: string
  category?: string
  reviewStatus?: string
}): Promise<KbSubstance[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.reviewStatus) params.set('reviewStatus', filters.reviewStatus)
  const qs = params.toString()
  const data = await kbAdminFetch<{ substances: KbSubstance[] }>(
    `/substances${qs ? `?${qs}` : ''}`,
    userId,
  )
  return data.substances
}

export async function fetchKbAdminSubstance(userId: string, id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}`, userId)
  return data.substance
}

export async function patchKbAdminSubstance(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}`, userId, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return data.substance
}

export async function publishKbSubstance(
  userId: string,
  id: string,
): Promise<{ substance: KbSubstanceDetail; projectedDrugId: string }> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail; projectedDrugId: string }>(
    `/substances/${id}/publish`,
    userId,
    { method: 'POST' },
  )
  return data
}

export async function archiveKbSubstance(userId: string, id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}/archive`, userId, {
    method: 'POST',
  })
  return data.substance
}

export async function approveKbSubstance(userId: string, id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}/approve`, userId, {
    method: 'POST',
  })
  return data.substance
}

export interface KbBulkPublishItem {
  id: string
  genericName: string
  projectedDrugId?: string
  reason?: string
  error?: string
}

export interface KbBulkPublishSummary {
  total: number
  succeeded: KbBulkPublishItem[]
  skipped: KbBulkPublishItem[]
  failed: KbBulkPublishItem[]
}

export async function approveAllKbSubstances(
  userId: string,
  filters?: {
  status?: string
  category?: string
  reviewStatus?: string
}): Promise<KbBulkPublishSummary> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.reviewStatus) params.set('reviewStatus', filters.reviewStatus)
  const qs = params.toString()
  const data = await kbAdminFetch<{ summary: KbBulkPublishSummary }>(
    `/substances/approve-all${qs ? `?${qs}` : ''}`,
    userId,
    { method: 'POST' },
  )
  return data.summary
}

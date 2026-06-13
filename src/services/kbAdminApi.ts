import { API_BASE } from './apiClient'
import type { KbSubstance, KbSubstanceDetail } from '../types/kbNormalized'

/** Dev/MVP: always show admin UI unless explicitly disabled in production. */
export function isKbAdminUiEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_KB_ADMIN_ENABLED === 'false') return false
  return import.meta.env.VITE_KB_ADMIN_ENABLED === 'true'
}

async function kbAdminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/kb-admin${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `KB admin request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchKbAdminStatus(): Promise<{ enabled: boolean; supabaseConfigured: boolean }> {
  return kbAdminFetch('/status')
}

export async function fetchKbAdminSubstances(filters?: {
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
  )
  return data.substances
}

export async function fetchKbAdminSubstance(id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}`)
  return data.substance
}

export async function patchKbAdminSubstance(
  id: string,
  patch: Record<string, unknown>,
): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return data.substance
}

export async function publishKbSubstance(id: string): Promise<{ substance: KbSubstanceDetail; projectedDrugId: string }> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail; projectedDrugId: string }>(
    `/substances/${id}/publish`,
    { method: 'POST' },
  )
  return data
}

export async function archiveKbSubstance(id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}/archive`, {
    method: 'POST',
  })
  return data.substance
}

export async function approveKbSubstance(id: string): Promise<KbSubstanceDetail> {
  const data = await kbAdminFetch<{ substance: KbSubstanceDetail }>(`/substances/${id}/approve`, {
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

export async function approveAllKbSubstances(filters?: {
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
    { method: 'POST' },
  )
  return data.summary
}

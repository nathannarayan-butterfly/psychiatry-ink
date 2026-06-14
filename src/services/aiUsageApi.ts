import type {
  AiBudgetConfig,
  AiBudgetWarning,
  AiUsageLogEntry,
  AiUsageMonthlySummary,
  CurrentUsageForQuota,
  AiUsageBreakdownRow,
} from '../types/aiUsage'

const API_BASE = '/api'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchAiUsageSummary(month?: string): Promise<{
  summary: AiUsageMonthlySummary | null
  quotaUsage: CurrentUsageForQuota | null
}> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return fetchJson(`/ai-usage/summary${qs}`)
}

export async function fetchAiUsageBreakdown(
  dimension: 'provider' | 'model' | 'feature' | 'user',
  month?: string,
): Promise<{ rows: AiUsageBreakdownRow[] }> {
  const params = new URLSearchParams({ dimension })
  if (month) params.set('month', month)
  return fetchJson(`/ai-usage/breakdown?${params}`)
}

export async function fetchRecentAiUsage(): Promise<{ logs: AiUsageLogEntry[] }> {
  return fetchJson('/ai-usage/recent')
}

export async function fetchAiBudgetConfig(): Promise<{ config: AiBudgetConfig | null }> {
  return fetchJson('/ai-budget/config')
}

export async function saveAiBudgetConfig(
  config: Partial<AiBudgetConfig>,
): Promise<{ config: AiBudgetConfig }> {
  return fetchJson('/ai-budget/config', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function fetchAiBudgetWarnings(): Promise<{ warnings: AiBudgetWarning[] }> {
  return fetchJson('/ai-budget/warnings')
}

export function aiUsageExportUrl(format: 'csv' | 'json', month?: string): string {
  const params = new URLSearchParams({ format })
  if (month) params.set('month', month)
  return `${API_BASE}/ai-usage/export?${params}`
}

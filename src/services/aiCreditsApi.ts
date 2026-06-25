import type { CreditPack } from '../data/creditPacks'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

export interface AiCreditSummary {
  monthlyCredits: number
  purchasedCredits: number
  totalAvailable: number
  monthlyResetAt: string
  stripeConfigured?: boolean
}

export interface AiCreditUsageSummary {
  callCount: number
  totalTokens: number
  totalCredits: number
  successCount: number
  failureCount: number
}

export interface AiCreditLedgerEntry {
  id: string
  type: string
  credits: number
  featureKey: string | null
  note: string | null
  createdAt: string
}

export interface AiCreditHistoryEntry {
  id: string
  featureKey: string
  mode: string
  provider: string
  model: string
  totalTokens: number
  creditsCharged: number
  success: boolean
  errorCode: string | null
  createdAt: string
}

export interface AiCreditStatus {
  trialEndsAt: string | null
  daysRemaining: number | null
  subscriptionStatus: string | null
  plan: string | null
  interval: string | null
  locked: boolean
  access: boolean
  reason: string
  stripeConfigured?: boolean
}

export type SubscriptionInterval = 'month' | 'year'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function fetchAiCreditSummary(): Promise<AiCreditSummary> {
  return fetchJson('/api/ai-credits')
}

export async function fetchAiCreditUsage(): Promise<AiCreditUsageSummary> {
  return fetchJson('/api/ai-credits/usage')
}

export async function fetchAiCreditLedger(limit = 50): Promise<{ entries: AiCreditLedgerEntry[] }> {
  return fetchJson(`/api/ai-credits/ledger?limit=${limit}`)
}

export async function fetchAiCreditHistory(limit = 50): Promise<{ logs: AiCreditHistoryEntry[] }> {
  return fetchJson(`/api/ai-credits/history?limit=${limit}`)
}

export async function startCreditCheckout(packId: string): Promise<{ url: string | null; sessionId: string }> {
  return fetchJson('/api/ai-credits/checkout', {
    method: 'POST',
    body: JSON.stringify({
      packId,
      origin: window.location.origin,
    }),
  })
}

export async function fetchAiCreditStatus(): Promise<AiCreditStatus> {
  return fetchJson('/api/ai-credits/status')
}

export async function startSubscriptionCheckout(
  interval: SubscriptionInterval,
): Promise<{ url: string | null; sessionId: string }> {
  return fetchJson('/api/ai-credits/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      interval,
      origin: window.location.origin,
    }),
  })
}

export async function grantDevCredits(credits: number, note?: string): Promise<{ totalAvailable: number }> {
  const result = await fetchJson<{ totalAvailable: number }>('/api/ai-credits/grant', {
    method: 'POST',
    body: JSON.stringify({ credits, note }),
  })
  return result
}

export type { CreditPack }

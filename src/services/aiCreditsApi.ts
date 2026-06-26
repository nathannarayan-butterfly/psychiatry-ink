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

// ── Gutschein (voucher) ──────────────────────────────────────────────────────

export interface VoucherRedeemResult {
  ok: boolean
  creditsGranted: number
  creditsPerPeriod?: number
  totalPeriods?: number
  periodMonths?: number
}

export async function redeemVoucher(code: string): Promise<VoucherRedeemResult> {
  return fetchJson('/api/ai-credits/voucher/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export async function startGiftVoucherCheckout(
  giftPackId: string,
): Promise<{ url: string | null; sessionId: string }> {
  return fetchJson('/api/ai-credits/voucher/gift/checkout', {
    method: 'POST',
    body: JSON.stringify({ giftPackId, origin: window.location.origin }),
  })
}

export interface GiftVoucherResult {
  ok: boolean
  pending?: boolean
  code?: string
  creditsPerPeriod?: number
  periodMonths?: number
  totalPeriods?: number
}

export async function fetchGiftVoucherResult(sessionId: string): Promise<GiftVoucherResult> {
  const headers = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE}/api/ai-credits/voucher/gift/result?session_id=${encodeURIComponent(sessionId)}`,
    { headers: { 'Content-Type': 'application/json', ...headers } },
  )
  if (response.status === 404) return { ok: false, pending: true }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<GiftVoucherResult>
}

// ── Gutschein (voucher) — Owner/operator admin surface ───────────────────────

export interface AdminStatus {
  isAdmin: boolean
}

export async function fetchAdminStatus(): Promise<AdminStatus> {
  return fetchJson('/api/ai-credits/admin/status')
}

export interface AdminVoucherCreateInput {
  code?: string
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  maxRedemptions: number
  /** ISO date string for an explicit window end. */
  validUntil?: string
  /** Window length in months (used when validUntil is absent). */
  validMonths?: number
}

export interface AdminVoucherCreateResult {
  ok: boolean
  code?: string
  creditsPerPeriod?: number
  periodMonths?: number
  totalPeriods?: number
  maxRedemptions?: number
  validUntil?: string
  error?: string
}

export async function createAdminVoucher(
  input: AdminVoucherCreateInput,
): Promise<AdminVoucherCreateResult> {
  return fetchJson('/api/ai-credits/voucher/admin/create', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface AdminVoucherListItem {
  id: string
  code: string
  creditsPerPeriod: number
  periodMonths: number
  totalPeriods: number
  maxRedemptions: number
  redemptionsUsed: number
  validFrom: string
  validUntil: string
  status: string
  createdBy: string | null
  createdAt: string
}

export async function fetchAdminVouchers(): Promise<{ vouchers: AdminVoucherListItem[] }> {
  return fetchJson('/api/ai-credits/voucher/admin/list')
}

// ── Invite / referral ────────────────────────────────────────────────────────

export interface ReferralStats {
  invited: number
  converted: number
  rewarded: number
  creditsEarned: number
}

export interface ReferralInfo {
  code: string
  inviteUrl: string
  stats: ReferralStats
}

export async function fetchReferralInfo(): Promise<ReferralInfo> {
  return fetchJson(`/api/ai-credits/referral?origin=${encodeURIComponent(window.location.origin)}`)
}

export async function attributeReferral(code: string): Promise<{ ok: boolean; attributed?: boolean; error?: string }> {
  return fetchJson('/api/ai-credits/referral/attribute', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export type { CreditPack }

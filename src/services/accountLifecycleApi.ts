import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

/**
 * Client wrappers for the account unsubscribe + delete lifecycle endpoints
 * (`/api/account/*`). Mirrors `aiCreditsApi.ts` (auth headers + JSON), but
 * preserves the structured error payload (code + organisations) so the UI can
 * show the org-ownership block and the confirm/password failures distinctly.
 */

export type AccountLifecycleState = 'active' | 'dormant' | 'delete_pending'

export interface AccountLifecycleStatus {
  accountStatus: AccountLifecycleState | null
  dormantAt: string | null
  deleteRequestedAt: string | null
  purgeAfter: string | null
  purgedAt: string | null
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  dormantDays: number
  deleteGraceDays: number
}

export type AccountLifecycleErrorCode =
  | 'org_block'
  | 'confirmation_mismatch'
  | 'password_incorrect'
  | 'unknown'

/** Structured lifecycle error carrying the server's code + (org-block) names. */
export class AccountLifecycleError extends Error {
  readonly code: AccountLifecycleErrorCode
  readonly organisations: string[]

  constructor(message: string, code: AccountLifecycleErrorCode, organisations: string[] = []) {
    super(message)
    this.name = 'AccountLifecycleError'
    this.code = code
    this.organisations = organisations
  }
}

interface ErrorBody {
  error?: string
  code?: string
  organisations?: string[]
}

function toCode(value: string | undefined): AccountLifecycleErrorCode {
  if (
    value === 'org_block' ||
    value === 'confirmation_mismatch' ||
    value === 'password_incorrect'
  ) {
    return value
  }
  return 'unknown'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    const body = (await response.json().catch(() => ({}))) as ErrorBody
    throw new AccountLifecycleError(
      body.error ?? `Request failed (${response.status})`,
      toCode(body.code),
      Array.isArray(body.organisations) ? body.organisations : [],
    )
  }
  return response.json() as Promise<T>
}

export async function fetchAccountLifecycle(): Promise<AccountLifecycleStatus> {
  return request('/api/account/lifecycle')
}

export async function unsubscribeAccount(): Promise<AccountLifecycleStatus> {
  return request('/api/account/unsubscribe', { method: 'POST', body: '{}' })
}

export async function reactivateAccount(): Promise<AccountLifecycleStatus> {
  return request('/api/account/reactivate', { method: 'POST', body: '{}' })
}

export async function requestAccountDeletion(input: {
  password: string
  confirmation: string
}): Promise<AccountLifecycleStatus> {
  return request('/api/account/delete', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function cancelAccountDeletion(): Promise<AccountLifecycleStatus> {
  return request('/api/account/delete/cancel', { method: 'POST', body: '{}' })
}

import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

async function orgVaultFetch(path: string, init?: RequestInit): Promise<Response> {
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

export async function registerOrgVaultPublicKey(publicKeyJwk: JsonWebKey): Promise<void> {
  const response = await orgVaultFetch('/api/org/vault-public-key', {
    method: 'PUT',
    body: JSON.stringify({ publicKeyJwk }),
  })
  if (!response.ok) await parseError(response, 'Failed to register vault public key')
}

export async function fetchMemberVaultPublicKey(
  userId: string,
  caseId: string,
): Promise<{ publicKeyJwk: JsonWebKey }> {
  const params = new URLSearchParams({ caseId })
  const response = await orgVaultFetch(
    `/api/org/vault-public-key/${encodeURIComponent(userId)}?${params}`,
  )
  if (!response.ok) await parseError(response, 'Failed to load member vault public key')
  return (await response.json()) as { publicKeyJwk: JsonWebKey }
}

export interface CaseVaultStatus {
  initialized: boolean
  hasWrappedKey: boolean
  hasSnapshot: boolean
  snapshotUpdatedAt: string | null
  caseOwnerUserId: string | null
}

export async function fetchCaseVaultStatus(caseId: string): Promise<CaseVaultStatus> {
  const response = await orgVaultFetch(
    `/api/org/case-vault/${encodeURIComponent(caseId)}/status`,
  )
  if (!response.ok) await parseError(response, 'Failed to load case vault status')
  return (await response.json()) as CaseVaultStatus
}

export async function fetchCaseVaultKey(caseId: string): Promise<{ wrappedKey: string }> {
  const response = await orgVaultFetch(
    `/api/org/case-vault-key/${encodeURIComponent(caseId)}`,
  )
  if (!response.ok) await parseError(response, 'Failed to load case vault key')
  return (await response.json()) as { wrappedKey: string }
}

export async function uploadCaseVaultKey(
  caseId: string,
  userId: string,
  wrappedKey: string,
): Promise<void> {
  const response = await orgVaultFetch(
    `/api/org/case-vault-key/${encodeURIComponent(caseId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ userId, wrappedKey }),
    },
  )
  if (!response.ok) await parseError(response, 'Failed to upload case vault key')
}

export async function initCaseVault(
  caseId: string,
  wrappedKey: string,
  snapshot?: {
    ciphertext: string
    iv: string
    payloadVersion?: number
  },
): Promise<void> {
  const response = await orgVaultFetch('/api/org/case-vault/init', {
    method: 'POST',
    body: JSON.stringify({
      caseId,
      wrappedKey,
      ...(snapshot ? { snapshot } : {}),
    }),
  })
  if (response.status === 409) return
  if (!response.ok) await parseError(response, 'Failed to initialize case vault')
}

export interface OrgCaseVaultSnapshot {
  ciphertext: string
  iv: string
  version: number
  payloadVersion: number | null
  updatedBy: string | null
  updatedAt: string
}

export async function fetchCaseVaultSnapshot(caseId: string): Promise<OrgCaseVaultSnapshot> {
  const response = await orgVaultFetch(`/api/org/case-vault/${encodeURIComponent(caseId)}`)
  if (!response.ok) await parseError(response, 'Failed to load case vault snapshot')
  return (await response.json()) as OrgCaseVaultSnapshot
}

export async function saveCaseVaultSnapshot(
  caseId: string,
  fields: {
    ciphertext: string
    iv: string
    payloadVersion?: number
    version?: number
  },
): Promise<{ updatedAt: string }> {
  const response = await orgVaultFetch(`/api/org/case-vault/${encodeURIComponent(caseId)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
  if (!response.ok) await parseError(response, 'Failed to save case vault snapshot')
  return (await response.json()) as { updatedAt: string }
}

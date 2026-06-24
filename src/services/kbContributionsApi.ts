import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { KbContribution, SubmitKbContributionInput, KbSubstanceContributor } from '../types/kbContributions'

export async function submitKbContribution(
  input: SubmitKbContributionInput,
): Promise<KbContribution> {
  const res = await fetch(`${API_BASE}/api/kb-contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      licenseAccepted: input.licenseAccepted === true,
    }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Contribution submit failed (${res.status})`)
  }
  const data = (await res.json()) as { contribution: KbContribution }
  return data.contribution
}

export async function fetchKbAdminContributions(_userId: string, status = 'pending'): Promise<KbContribution[]> {
  // Identity is taken from the verified Supabase token server-side; the legacy
  // client-supplied `X-KB-User-Id` header is no longer trusted or sent.
  const auth = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/kb-admin/contributions?status=${encodeURIComponent(status)}`, {
    headers: {
      ...auth,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Failed to load contributions (${res.status})`)
  }
  const data = (await res.json()) as { contributions: KbContribution[] }
  return data.contributions
}

export async function fetchKbContributors(substanceId: string): Promise<KbSubstanceContributor[]> {
  const res = await fetch(
    `${API_BASE}/api/kb-contributions/contributors?substanceId=${encodeURIComponent(substanceId)}`,
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Failed to load contributors (${res.status})`)
  }
  const data = (await res.json()) as { contributors: KbSubstanceContributor[] }
  return data.contributors
}

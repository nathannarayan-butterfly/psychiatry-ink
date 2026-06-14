import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  KbContributionDiscussion,
  KbContributionVoteSummary,
  KbContributionVoteValue,
} from '../types/kbContributions'

async function kbAdminActorHeaders(userId: string): Promise<HeadersInit> {
  const auth = await getAuthHeaders()
  return {
    'Content-Type': 'application/json',
    'X-KB-User-Id': userId,
    ...auth,
  }
}

async function kbAdminFetch<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const headers = await kbAdminActorHeaders(userId)
  const res = await fetch(`${API_BASE}/api/kb-admin${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `KB admin request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchKbAdminDiscussions(
  userId: string,
  filters: { contributionId?: string | null; substanceId?: string | null },
): Promise<KbContributionDiscussion[]> {
  const params = new URLSearchParams()
  if (filters.contributionId) params.set('contributionId', filters.contributionId)
  if (filters.substanceId) params.set('substanceId', filters.substanceId)
  const qs = params.toString()
  const data = await kbAdminFetch<{ discussions: KbContributionDiscussion[] }>(
    `/discussions${qs ? `?${qs}` : ''}`,
    userId,
  )
  return data.discussions
}

export async function postKbAdminDiscussion(
  userId: string,
  input: {
    contributionId?: string | null
    substanceId?: string | null
    authorDisplayName?: string | null
    body: string
  },
): Promise<KbContributionDiscussion> {
  const data = await kbAdminFetch<{ discussion: KbContributionDiscussion }>('/discussions', userId, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.discussion
}

export async function fetchKbContributionVoteSummary(
  userId: string,
  contributionId: string,
): Promise<KbContributionVoteSummary> {
  const data = await kbAdminFetch<{ summary: KbContributionVoteSummary }>(
    `/contributions/${encodeURIComponent(contributionId)}/votes`,
    userId,
  )
  return data.summary
}

export async function castKbContributionVote(
  userId: string,
  contributionId: string,
  vote: KbContributionVoteValue,
): Promise<KbContributionVoteSummary> {
  const data = await kbAdminFetch<{ summary: KbContributionVoteSummary }>(
    `/contributions/${encodeURIComponent(contributionId)}/votes`,
    userId,
    { method: 'POST', body: JSON.stringify({ vote }) },
  )
  return data.summary
}

export async function publishKbContribution(
  userId: string,
  contributionId: string,
): Promise<{ projectedDrugId: string | null }> {
  const data = await kbAdminFetch<{ projectedDrugId: string | null }>(
    `/contributions/${encodeURIComponent(contributionId)}/publish`,
    userId,
    { method: 'POST' },
  )
  return data
}

export async function rejectKbContribution(
  userId: string,
  contributionId: string,
  notes?: string,
): Promise<void> {
  await kbAdminFetch(`/contributions/${encodeURIComponent(contributionId)}/reject`, userId, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

export async function fetchKbAdminConfig(userId: string): Promise<{ approvalThreshold: number }> {
  return kbAdminFetch('/config', userId)
}

import type { AiJobDto, AiJobParams, AiOutputLengthSpec } from '../../shared/aiJobs'
import type { PseudoMap } from '../utils/pseudonymize'
import { dePseudonymizeText } from '../utils/pseudonymize'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

/**
 * Client for the persisted AI jobs API (`/api/ai-jobs`). Jobs survive
 * navigation/refresh/login — the client merely polls status and renders
 * results. See `server/routes/aiJobs.ts`.
 */

export interface CreateAiJobInput {
  caseId?: string
  featureKey?: string
  sourceText: string
  tier?: 'fast' | 'standard' | 'thorough'
  mode?: 'economic' | 'standard' | 'gruendlich'
  maximum?: boolean
  language?: AiJobParams['language']
  componentId?: string
  tool?: string
  sectionLabel?: string
  length?: AiOutputLengthSpec
  directions?: string
  structured?: boolean
  patientHints?: { patientName?: string; patientDob?: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI-Job request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export async function createAiJob(input: CreateAiJobInput): Promise<AiJobDto> {
  const { job } = await request<{ job: AiJobDto }>('/api/ai-jobs', {
    method: 'POST',
    body: JSON.stringify({ kind: 'summarize', ...input }),
  })
  return job
}

export async function getAiJob(jobId: string): Promise<AiJobDto> {
  const { job } = await request<{ job: AiJobDto }>(`/api/ai-jobs/${encodeURIComponent(jobId)}`)
  return job
}

export async function listAiJobs(options?: {
  active?: boolean
  caseId?: string
  limit?: number
}): Promise<AiJobDto[]> {
  const params = new URLSearchParams()
  if (options?.active) params.set('active', '1')
  if (options?.caseId) params.set('caseId', options.caseId)
  if (options?.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  const { jobs } = await request<{ jobs: AiJobDto[] }>(`/api/ai-jobs${query ? `?${query}` : ''}`)
  return jobs
}

export async function cancelAiJob(jobId: string): Promise<AiJobDto> {
  const { job } = await request<{ job: AiJobDto }>(
    `/api/ai-jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: 'POST' },
  )
  return job
}

export async function retryAiJob(jobId: string): Promise<AiJobDto> {
  const { job } = await request<{ job: AiJobDto }>(
    `/api/ai-jobs/${encodeURIComponent(jobId)}/retry`,
    { method: 'POST' },
  )
  return job
}

export async function markAiJobsSeen(ids: string[]): Promise<void> {
  if (!ids.length) return
  await request<{ ok: boolean }>('/api/ai-jobs/seen', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

// ---------------------------------------------------------------------------
// Client-side pseudonym maps (never leave the device)
// ---------------------------------------------------------------------------

const PSEUDO_MAP_KEY_PREFIX = 'psychiatry-ink:ai-job-pseudo:'

/**
 * When client-side pseudonymization ran before job creation, the map is kept
 * locally so a result retrieved after refresh/re-login can still be
 * de-pseudonymized. The map contains the patient name/DOB → placeholder pairs
 * and therefore stays strictly in localStorage on this device.
 */
export function saveAiJobPseudoMap(jobId: string, map: PseudoMap): void {
  if (!Object.keys(map).length) return
  try {
    localStorage.setItem(`${PSEUDO_MAP_KEY_PREFIX}${jobId}`, JSON.stringify(map))
  } catch {
    // Quota/serialization failures degrade to showing placeholders.
  }
}

export function resolveAiJobResultText(job: AiJobDto): string | null {
  if (job.resultText == null) return null
  try {
    const raw = localStorage.getItem(`${PSEUDO_MAP_KEY_PREFIX}${job.id}`)
    if (!raw) return job.resultText
    return dePseudonymizeText(job.resultText, JSON.parse(raw) as PseudoMap)
  } catch {
    return job.resultText
  }
}

export function clearAiJobPseudoMap(jobId: string): void {
  try {
    localStorage.removeItem(`${PSEUDO_MAP_KEY_PREFIX}${jobId}`)
  } catch {
    // ignore
  }
}

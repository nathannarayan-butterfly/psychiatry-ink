import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

export interface PharmaAskParams {
  medicationName: string
  sectionId: string
  sectionData: string
  question: string
  language?: 'de' | 'en' | 'fr' | 'es'
  /** AI mode/model tier; backend defaults to `thorough` when omitted. */
  tier?: 'fast' | 'standard' | 'thorough'
}

export interface PharmaAskResult {
  answer: string
  model?: { provider: string; modelId: string; label: string }
}

export async function askPharmaQuestion(params: PharmaAskParams): Promise<PharmaAskResult> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/pharma-ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      medicationName: params.medicationName,
      sectionId: params.sectionId,
      sectionData: params.sectionData,
      question: params.question,
      language: params.language ?? 'de',
      ...(params.tier ? { tier: params.tier } : {}),
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Ask AI failed (${response.status})`)
  }

  const data = (await response.json()) as PharmaAskResult
  return { answer: data.answer ?? '', model: data.model }
}

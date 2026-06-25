import type { AiMode } from '../../types/aiUsage'
import type { TemplateBlock } from '../../types/clinicalTemplate'
import { API_BASE } from '../apiClient'
import { getAuthHeaders } from '../authHeaders'

export interface GenerateTemplateResponse {
  blocks: TemplateBlock[]
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export interface FillSectionResponse {
  content: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export interface AnalyzeDocumentResponse {
  category: string
  blocks: TemplateBlock[]
  truncated: boolean
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const code = typeof data.code === 'string' ? data.code : undefined
    const message = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`
    const error = new Error(message) as Error & { code?: string; status?: number }
    error.code = code
    error.status = res.status
    throw error
  }
  return data as T
}

/** Generate a template draft (Phase 3 — billed via feature key `template_ai_generate`). */
export function generateTemplateDraftApi(params: {
  description: string
  category: string
  language: 'de' | 'en'
  mode?: AiMode
}): Promise<GenerateTemplateResponse> {
  return postJson<GenerateTemplateResponse>('/api/template-ai/generate-template', params)
}

/** Analyze an uploaded document into a template draft (billed via `template_from_document`). */
export function analyzeDocumentApi(params: {
  text: string
  filename?: string
  language: 'de' | 'en'
  mode?: AiMode
}): Promise<AnalyzeDocumentResponse> {
  return postJson<AnalyzeDocumentResponse>('/api/template-ai/analyze-document', params)
}

/** Fill an AI section (Phase 3 — billed via feature key `template_block_fill`). */
export function fillTemplateSectionApi(params: {
  caseId?: string
  prompt: string
  contextText: string
  language: 'de' | 'en'
  mode?: AiMode
  patientHints?: { patientName?: string; patientDob?: string }
}): Promise<FillSectionResponse> {
  return postJson<FillSectionResponse>('/api/template-ai/fill-section', params)
}

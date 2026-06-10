import type { DrugSectionKey } from '../types/knowledgeBase'
import { API_BASE } from './apiClient'

export interface PharmaGenerateParams {
  genericName: string
  brandNames?: string[]
  drugClass?: string
  category?: string
  /** Subset of section keys to fill; omit / empty → all sections. */
  sections?: DrugSectionKey[]
  language?: 'de' | 'en' | 'fr' | 'es'
}

export interface PharmaGenerateResult {
  /** Generated content keyed by drug section key (subset of requested). */
  sections: Partial<Record<DrugSectionKey, string>>
  /** Optional receptor-strength map (0–5) when the model provided one. */
  receptorProfile?: Record<string, number>
  /** AI-suggested references — must be verified by the clinician. */
  references: string[]
  model?: { provider: string; modelId: string; label: string }
}

/**
 * Call the AI drug-monograph generator. Returns parsed section contents plus
 * AI-suggested references. The caller is responsible for letting the clinician
 * review/edit the draft before saving — nothing is persisted here.
 */
export async function generatePharmaDetails(
  params: PharmaGenerateParams,
): Promise<PharmaGenerateResult> {
  const response = await fetch(`${API_BASE}/api/pharma-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      genericName: params.genericName,
      brandNames: params.brandNames ?? [],
      drugClass: params.drugClass ?? '',
      category: params.category ?? '',
      sections: params.sections ?? [],
      language: params.language ?? 'de',
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI request failed (${response.status})`)
  }

  const data = (await response.json()) as PharmaGenerateResult
  return {
    sections: data.sections ?? {},
    receptorProfile: data.receptorProfile,
    references: Array.isArray(data.references) ? data.references : [],
    model: data.model,
  }
}

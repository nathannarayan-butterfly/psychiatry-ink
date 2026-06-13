import type {
  AffinityScale,
  DrugSectionKey,
  ReceptorAffinityEntry,
  ReceptorProfileVersion,
} from '../types/knowledgeBase'
import { sanitizeAffinityProfile } from '../utils/medication/receptorAffinity'
import { sanitizeStructuredBundle, type StructuredAiBundle } from '../utils/medication/structuredAi'
import { API_BASE } from './apiClient'

export interface PharmaGenerateParams {
  genericName: string
  brandNames?: string[]
  drugClass?: string
  category?: string
  /** Subset of section keys to fill; omit / empty → all sections. */
  sections?: DrugSectionKey[]
  language?: 'de' | 'en' | 'fr' | 'es'
  /** AI mode/model tier; backend defaults to `thorough` when omitted. */
  tier?: 'fast' | 'standard' | 'thorough'
}

export interface PharmaGenerateResult {
  /** Generated content keyed by drug section key (subset of requested). */
  sections: Partial<Record<DrugSectionKey, string>>
  /** v2 receptor-profile schema version. */
  receptorProfileVersion: ReceptorProfileVersion
  /** Normalization scale of the affinity profile. */
  affinityScale: AffinityScale
  /** v2 relative receptor-affinity entries (validated, may be empty). */
  receptorAffinityProfile: ReceptorAffinityEntry[]
  /** True when the model emitted a deprecated 1–5 score map (ignored). */
  legacyScoreProfileDetected?: boolean
  /** Validated structured section payloads (PK / titration / depot / SE / CYP). */
  structured: StructuredAiBundle
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
      ...(params.tier ? { tier: params.tier } : {}),
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI request failed (${response.status})`)
  }

  const data = (await response.json()) as Partial<PharmaGenerateResult> & {
    receptorAffinityProfile?: unknown
    structured?: unknown
  }
  // Re-validate the affinity profile + structured payloads client-side so
  // malformed entries are never persisted, regardless of what the API returned.
  return {
    sections: data.sections ?? {},
    receptorProfileVersion: 2,
    affinityScale: 'relative_log_ki_percent',
    receptorAffinityProfile: sanitizeAffinityProfile(data.receptorAffinityProfile),
    legacyScoreProfileDetected: data.legacyScoreProfileDetected,
    structured: sanitizeStructuredBundle(data.structured),
    references: Array.isArray(data.references) ? data.references : [],
    model: data.model,
  }
}

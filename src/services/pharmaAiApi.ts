import type {
  AffinityScale,
  DrugSectionKey,
  MedicationMarketAvailability,
  PrescribingCountryCode,
  PsychopharmacaClass,
  ReceptorAffinityEntry,
  ReceptorProfileVersion,
} from '../types/knowledgeBase'
import { normalizePsychClass } from '../types/knowledgeBase'
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
  /** Ask the model to also return country-specific preparations. */
  includeMarketAvailability?: boolean
  /** Generate only country-specific preparations, without section prose. */
  marketAvailabilityOnly?: boolean
}

export type AiGeneratedPreparation = Omit<
  MedicationMarketAvailability,
  | 'id'
  | 'createdAt'
  | 'createdByUserId'
  | 'createdByDisplayName'
  | 'lastModifiedAt'
  | 'lastModifiedByUserId'
  | 'lastModifiedByDisplayName'
  | 'lastReviewedAt'
  | 'lastReviewedByUserId'
  | 'lastReviewedByDisplayName'
>

export interface PharmaGenerateResult {
  /** Generated content keyed by drug section key (subset of requested). */
  sections: Partial<Record<DrugSectionKey, string>>
  /** AI-suggested common brand / trade names; empty when uncertain. */
  brandNames: string[]
  /** Alias for callers that prefer trade-name terminology. */
  tradeNames: string[]
  /** AI-suggested default psychopharmacology classification (validated enum). */
  classification: PsychopharmacaClass
  /** AI-suggested Neuroscience-based Nomenclature descriptor; '' if unknown. */
  nbn: string
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
  /** AI-suggested country-specific preparations; always unverified/ai_draft. */
  marketAvailability: AiGeneratedPreparation[]
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
      includeMarketAvailability: params.includeMarketAvailability ?? !params.sections?.length,
      marketAvailabilityOnly: params.marketAvailabilityOnly ?? false,
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI request failed (${response.status})`)
  }

  const data = (await response.json()) as Partial<PharmaGenerateResult> & {
    receptorAffinityProfile?: unknown
    structured?: unknown
    marketAvailability?: unknown
    brandNames?: unknown
    tradeNames?: unknown
    classification?: unknown
    nbn?: unknown
  }
  // Re-validate the affinity profile + structured payloads client-side so
  // malformed entries are never persisted, regardless of what the API returned.
  return {
    sections: data.sections ?? {},
    brandNames: sanitizeNameList(data.brandNames ?? data.tradeNames, 2),
    tradeNames: sanitizeNameList(data.tradeNames ?? data.brandNames, 2),
    classification: normalizePsychClass(data.classification),
    nbn: stringField(data.nbn, 200),
    receptorProfileVersion: 2,
    affinityScale: 'relative_log_ki_percent',
    receptorAffinityProfile: sanitizeAffinityProfile(data.receptorAffinityProfile),
    legacyScoreProfileDetected: data.legacyScoreProfileDetected,
    structured: sanitizeStructuredBundle(data.structured),
    references: Array.isArray(data.references) ? data.references : [],
    marketAvailability: sanitizeMarketAvailability(data.marketAvailability),
    model: data.model,
  }
}

function isCountryCode(value: unknown): value is PrescribingCountryCode {
  return value === 'DE' || value === 'CH' || value === 'AT' || value === 'UK'
}

function stringField(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sanitizeNameList(value: unknown, max = 2): string[] {
  if (!Array.isArray(value)) return []
  const names = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
  return names
    .filter((name, index) => names.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index)
    .slice(0, max)
}

function sanitizeMarketAvailability(raw: unknown): AiGeneratedPreparation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): AiGeneratedPreparation | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const countryCode = r.countryCode
      const tradeName = stringField(r.tradeName, 160)
      const genericName = stringField(r.genericName, 160)
      const strengthValue = stringField(r.strengthValue, 60)
      const strengthUnit = stringField(r.strengthUnit, 40)
      const dosageForm = stringField(r.dosageForm, 120)
      const route = stringField(r.route, 80)
      if (!isCountryCode(countryCode) || !tradeName || !genericName || !strengthValue || !strengthUnit || !dosageForm || !route) {
        return null
      }
      return {
        substanceId: stringField(r.substanceId, 160),
        countryCode,
        tradeName,
        genericName,
        strengthValue,
        strengthUnit,
        dosageForm,
        route,
        packageSize: stringField(r.packageSize, 80),
        productIdentifierType: stringField(r.productIdentifierType, 60),
        productIdentifier: stringField(r.productIdentifier, 120),
        prescriptionStatus: stringField(r.prescriptionStatus, 120),
        marketStatus: stringField(r.marketStatus, 120) || 'needs_verification',
        sourceName: stringField(r.sourceName, 80) || 'KI-Entwurf',
        sourceUrl: stringField(r.sourceUrl, 300),
        sourceReference: stringField(r.sourceReference, 120),
        verificationStatus: r.verificationStatus === 'unverified' ? 'unverified' : 'ai_draft',
        notes: stringField(r.notes, 120),
        lastVerifiedAt: undefined,
      }
    })
    .filter((entry): entry is AiGeneratedPreparation => entry != null)
}

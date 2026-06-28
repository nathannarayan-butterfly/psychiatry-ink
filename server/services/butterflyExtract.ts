/**
 * Butterfly LLM-on-doubt extraction service.
 *
 * Butterfly resolves criteria deterministic-first; only criteria that remain
 * `unknown` after the structured evaluation reach this service. For one
 * disorder, ALL its unresolved criteria are batched into a SINGLE LLM call to
 * keep cost minimal (a patient usually has ~one Aufnahme).
 *
 * Privacy guarantees:
 *  - The clinical context is DE-IDENTIFIED here (server-side, authoritative)
 *    via {@link deidentifyPackageContent} before it ever reaches the model.
 *  - We send ONLY our own original operational criterion paraphrases — NEVER
 *    copyrighted ICD/DSM criterion text.
 *
 * Output is advisory: per-criterion {met|not_met|unclear} + an optional
 * evidence quote + confidence. It is NEVER auto-accepted and NEVER asserts a
 * diagnosis — the client stores it as a pending, clinician-reviewable suggestion.
 */

import { runAiFeature } from '../ai/runAiFeature'
import { tierToMode } from '../ai/aiRouter'
import { deidentifyPackageContent } from './discussCaseDeidentify'
import type { DiscussPackageContent } from '../../src/types/discussCase'
import type { AiMode } from '../../src/types/aiUsage'
import type { AiModelTier } from '../modelTierMapping'
import type { AiUsageContext } from '../ai/types'
import { clinicalLanguagePromptInstruction, type ClinicalLanguage } from '../utils/resolveClinicalLanguage'

export type ButterflyCriterionStatus = 'met' | 'not_met' | 'unclear'

/** A single unresolved criterion handed to the model (our own wording only). */
export interface ButterflyCriterionQuery {
  id: string
  /** OUR original operational paraphrase (safe to transmit). */
  text: string
}

export interface ButterflyCriterionResult {
  id: string
  status: ButterflyCriterionStatus
  evidenceQuote: string | null
  confidence: number
}

/** Hard cap on de-identified context characters sent to the model. */
const MAX_CONTEXT_CHARS = 12_000
const MAX_QUOTE_CHARS = 320

/**
 * Build the de-identified, size-capped clinical context string from a package.
 * De-identification is applied HERE, immediately before prompt assembly, so no
 * code path can send identified text to the model.
 */
export function buildButterflyContextText(packageContent: DiscussPackageContent): string {
  const deidentified = deidentifyPackageContent(packageContent)
  const sections = Array.isArray(deidentified.sections) ? deidentified.sections : []
  if (sections.length === 0) return ''
  return sections
    .map((section) => `## ${section.label}\n${section.content}`)
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS)
}

export function buildButterflySystemPrompt(language: ClinicalLanguage): string {
  return [
    'You are a clinical documentation extraction assistant for a psychiatry app.',
    'You are given DE-IDENTIFIED clinical text and a list of operational criterion descriptions.',
    'For EACH criterion, decide strictly from the provided text whether the described clinical feature is documented.',
    'Use "met" only when the text clearly documents the feature, "not_met" when the text clearly documents its absence, and "unclear" when the text does not allow a confident decision.',
    'Never diagnose, never infer beyond the text, and never invent quotes. If you cannot find a literal supporting sentence, set evidenceQuote to null.',
    'Return ONLY a JSON object of the exact shape: {"results":[{"id":string,"status":"met"|"not_met"|"unclear","evidenceQuote":string|null,"confidence":number}]}.',
    'confidence is a number from 0 to 1. Include exactly one entry per criterion id provided.',
    clinicalLanguagePromptInstruction(language),
  ].join(' ')
}

export function buildButterflyUserPrompt(input: {
  disorderName: string
  criteria: ButterflyCriterionQuery[]
  contextText: string
}): string {
  const criteriaList = input.criteria
    .map((criterion, index) => `${index + 1}. (id: ${criterion.id}) ${criterion.text}`)
    .join('\n')

  return [
    `Disorder under review: ${input.disorderName}.`,
    '',
    'De-identified clinical documentation:',
    '---',
    input.contextText || '(no documentation available)',
    '---',
    '',
    'Resolve each of the following criteria against the documentation above.',
    'Criteria:',
    criteriaList,
  ].join('\n')
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function coerceStatus(value: unknown): ButterflyCriterionStatus {
  return value === 'met' || value === 'not_met' || value === 'unclear' ? value : 'unclear'
}

function coerceQuote(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_QUOTE_CHARS)
}

/**
 * Parse the model's JSON output into per-criterion results. Robust by design:
 * any missing/invalid criterion (incl. the mock provider's non-JSON echo)
 * falls back to `unclear` — so a parse failure can never auto-resolve a
 * criterion as met/not_met.
 */
export function parseButterflyExtractionResponse(
  text: string,
  criteria: ButterflyCriterionQuery[],
): ButterflyCriterionResult[] {
  const byId = new Map<string, { status: ButterflyCriterionStatus; evidenceQuote: string | null; confidence: number }>()

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { results?: unknown })?.results)
          ? (parsed as { results: unknown[] }).results
          : []
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue
        const r = row as Record<string, unknown>
        const id = typeof r.id === 'string' ? r.id : null
        if (!id) continue
        byId.set(id, {
          status: coerceStatus(r.status),
          evidenceQuote: coerceQuote(r.evidenceQuote),
          confidence: clampConfidence(r.confidence),
        })
      }
    } catch {
      // fall through to all-unclear fallback
    }
  }

  return criteria.map((criterion) => {
    const found = byId.get(criterion.id)
    return {
      id: criterion.id,
      status: found?.status ?? 'unclear',
      evidenceQuote: found?.evidenceQuote ?? null,
      confidence: found?.confidence ?? 0,
    }
  })
}

export interface ButterflyExtractionParams {
  packageContent: DiscussPackageContent
  disorderName: string
  criteria: ButterflyCriterionQuery[]
  tier: AiModelTier
  /**
   * User-visible AI mode driving the credit multiplier. When omitted it is
   * derived from `tier` so the charge matches the selected tier (economic 1× /
   * standard 2× / gruendlich 4×) instead of defaulting to the feature's mode.
   */
  mode?: AiMode
  language: ClinicalLanguage
  usageContext?: AiUsageContext
}

export interface ButterflyExtractionOutput {
  results: ButterflyCriterionResult[]
  model: { provider: string; modelId: string }
  mock: boolean
}

/** Run ONE batched extraction call for a disorder's unresolved criteria. */
export async function runButterflyExtraction(
  params: ButterflyExtractionParams,
): Promise<ButterflyExtractionOutput> {
  const contextText = buildButterflyContextText(params.packageContent)
  const systemPrompt = buildButterflySystemPrompt(params.language)
  const userPrompt = buildButterflyUserPrompt({
    disorderName: params.disorderName,
    criteria: params.criteria,
    contextText,
  })

  const result = await runAiFeature({
    featureKey: 'butterfly',
    tier: params.tier,
    mode: params.mode ?? tierToMode(params.tier),
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 1_500,
    usageContext: params.usageContext,
  })

  return {
    results: parseButterflyExtractionResponse(result.text, params.criteria),
    model: { provider: result.provider, modelId: result.model },
    // The mock provider (no API key) appends a recognizable suffix.
    mock: /\[AI draft —/.test(result.text),
  }
}

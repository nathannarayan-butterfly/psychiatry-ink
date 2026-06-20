/**
 * Clinical Intelligence — server-side run orchestration.
 *
 * Runs both layers (Dimensional → Mechanism). Each layer:
 *   1. Re-deidentifies inbound evidence (defense in depth).
 *   2. Builds prompts + calls the LLM provider.
 *   3. Salvages valid items and quarantines the rest with reasons.
 *
 * Both layers are independent: a failed/malformed first layer never crashes
 * the run; mechanism inference simply runs against the (possibly empty) set of
 * accepted dimensions.
 */

import { runAiFeature } from '../../ai/runAiFeature'
import { deidentifyText } from '../discussCaseDeidentify'
import {
  buildDimensionalSystemPrompt,
  buildDimensionalUserPrompt,
  buildMechanismSystemPrompt,
  buildMechanismUserPrompt,
} from './prompts'
import {
  parseAndValidateDimensional,
  parseAndValidateMechanism,
} from './validate'
import type {
  ClinicalIntelligenceLayerCall,
  ClinicalIntelligenceLayerDiagnostics,
  ClinicalIntelligenceRunResponse,
  CompactEvidencePayload,
  DimensionalIntegrationResult,
  MechanismInferenceResult,
} from '../../../src/types/clinicalIntelligence'

/**
 * Cap matches the strict `rawResponseSnippet: z.string().max(4_000)` schema.
 * We keep one character of headroom for the ellipsis so the assembled snippet
 * never exceeds the schema limit (4_000 - 1 body chars + '…' = 4_000 chars).
 */
const MAX_RAW_SNIPPET = 4_000
const MAX_RAW_SNIPPET_BODY = MAX_RAW_SNIPPET - 1

export interface ServerRunParams {
  language: 'de' | 'en' | 'fr' | 'es'
  evidence: CompactEvidencePayload
  rejectedDimensionIds: ReadonlyArray<string>
  rejectedMechanismIds: ReadonlyArray<string>
  layers: Array<'dimensional' | 'mechanism'>
  dimensionalCall?: ClinicalIntelligenceLayerCall
  mechanismCall?: ClinicalIntelligenceLayerCall
}

/**
 * Re-apply server-side de-identification to every evidence item, regardless of
 * what the client claims. Never trust the client's `isDeidentified` flag.
 */
function hardenEvidence(payload: CompactEvidencePayload): CompactEvidencePayload {
  return {
    ...payload,
    isDeidentified: true,
    items: payload.items.map((item) => ({
      ...item,
      text: deidentifyText(item.text),
      label: deidentifyText(item.label ?? ''),
    })),
  }
}

export function truncateForDiagnostics(text: string): string {
  if (!text) return ''
  if (text.length <= MAX_RAW_SNIPPET) return text
  return `${text.slice(0, MAX_RAW_SNIPPET_BODY)}…`
}

function emptyDimensional(): DimensionalIntegrationResult {
  return {
    activeDimensions: [],
    exploratoryInsufficientEvidence: [],
    quarantined: [],
  }
}

function emptyMechanism(): MechanismInferenceResult {
  return {
    activeMechanisms: [],
    exploratoryInsufficientEvidence: [],
    quarantined: [],
  }
}

export async function runClinicalIntelligenceServer(
  params: ServerRunParams,
): Promise<ClinicalIntelligenceRunResponse> {
  const evidence = hardenEvidence(params.evidence)
  const runLayers = new Set(params.layers)

  let dimensional: DimensionalIntegrationResult = emptyDimensional()
  let mechanism: MechanismInferenceResult = emptyMechanism()
  let dimensionalDiagnostics: ClinicalIntelligenceLayerDiagnostics | null = null
  let mechanismDiagnostics: ClinicalIntelligenceLayerDiagnostics | null = null

  // ── Layer 1: Dimensional Integration ─────────────────────────────────────
  if (runLayers.has('dimensional')) {
    const systemPrompt = buildDimensionalSystemPrompt(params.language)
    const userPrompt = buildDimensionalUserPrompt({
      language: params.language,
      evidence,
      rejectedDimensionIds: [...params.rejectedDimensionIds] as never,
    })
    let result
    let rawText = ''
    let layerError: string | null = null
    let truncated = false
    let mock = false
    let inputTokens: number | null = null
    let outputTokens: number | null = null
    let totalTokens: number | null = null
    let latencyMs = 0
    let provider = ''
    let modelId = ''
    let tier = params.dimensionalCall?.tier ?? 'thorough'

    try {
      result = await runAiFeature({
        featureKey: 'clinical_intelligence_dimensional',
        tier: params.dimensionalCall?.tier ?? 'thorough',
        model: params.dimensionalCall?.model,
        systemPrompt,
        userPrompt,
        jsonResponse: true,
        maxTokens: 3_000,
        usageContext: {
          featureKey: 'clinical_intelligence_dimensional',
          requestKind: 'chat',
          caseId: evidence.caseId,
        },
      })
      rawText = result.text
      truncated = Boolean(result.truncated)
      mock = /\[AI draft —/.test(result.text)
      inputTokens = result.usage.inputTokens ?? null
      outputTokens = result.usage.outputTokens ?? null
      totalTokens = result.usage.totalTokens ?? null
      latencyMs = result.latencyMs
      provider = result.provider
      modelId = result.model
      tier = params.dimensionalCall?.tier ?? 'thorough'
    } catch (error) {
      layerError = error instanceof Error ? error.message : String(error)
    }

    const parsed = parseAndValidateDimensional(rawText, evidence, {
      rejectedIds: params.rejectedDimensionIds,
    })
    dimensional = parsed.result

    dimensionalDiagnostics = {
      provider: provider || 'mock',
      modelId: modelId || 'unknown',
      tier,
      mock,
      promptCharCount: systemPrompt.length + userPrompt.length,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      truncated,
      validation: {
        salvagedCount: dimensional.activeDimensions.length,
        quarantinedCount: dimensional.quarantined.length,
        issues: parsed.issues,
      },
      rawResponseSnippet: truncateForDiagnostics(rawText),
      error: layerError,
    }
  }

  // ── Layer 2: Mechanism Inference ─────────────────────────────────────────
  if (runLayers.has('mechanism')) {
    const acceptedDimensions = dimensional.activeDimensions.filter(
      (finding) => finding.source === 'evidence_based',
    )
    const systemPrompt = buildMechanismSystemPrompt(params.language)
    const userPrompt = buildMechanismUserPrompt({
      language: params.language,
      evidence,
      acceptedDimensions,
      rejectedMechanismIds: [...params.rejectedMechanismIds] as never,
    })
    let rawText = ''
    let layerError: string | null = null
    let truncated = false
    let mock = false
    let inputTokens: number | null = null
    let outputTokens: number | null = null
    let totalTokens: number | null = null
    let latencyMs = 0
    let provider = ''
    let modelId = ''
    let tier = params.mechanismCall?.tier ?? 'thorough'

    try {
      const result = await runAiFeature({
        featureKey: 'clinical_intelligence_mechanism',
        tier: params.mechanismCall?.tier ?? 'thorough',
        model: params.mechanismCall?.model,
        systemPrompt,
        userPrompt,
        jsonResponse: true,
        maxTokens: 2_400,
        usageContext: {
          featureKey: 'clinical_intelligence_mechanism',
          requestKind: 'chat',
          caseId: evidence.caseId,
        },
      })
      rawText = result.text
      truncated = Boolean(result.truncated)
      mock = /\[AI draft —/.test(result.text)
      inputTokens = result.usage.inputTokens ?? null
      outputTokens = result.usage.outputTokens ?? null
      totalTokens = result.usage.totalTokens ?? null
      latencyMs = result.latencyMs
      provider = result.provider
      modelId = result.model
      tier = params.mechanismCall?.tier ?? 'thorough'
    } catch (error) {
      layerError = error instanceof Error ? error.message : String(error)
    }

    const parsed = parseAndValidateMechanism(rawText, evidence, {
      rejectedIds: params.rejectedMechanismIds,
      acceptedDimensionIds: acceptedDimensions.map((dim) => dim.dimensionId),
    })
    mechanism = parsed.result

    mechanismDiagnostics = {
      provider: provider || 'mock',
      modelId: modelId || 'unknown',
      tier,
      mock,
      promptCharCount: systemPrompt.length + userPrompt.length,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      truncated,
      validation: {
        salvagedCount: mechanism.activeMechanisms.length,
        quarantinedCount: mechanism.quarantined.length,
        issues: parsed.issues,
      },
      rawResponseSnippet: truncateForDiagnostics(rawText),
      error: layerError,
    }
  }

  return {
    builtAt: new Date().toISOString(),
    language: params.language,
    dimensional,
    mechanism,
    evidenceItemCount: evidence.items.length,
    diagnostics: {
      dimensional: dimensionalDiagnostics,
      mechanism: mechanismDiagnostics,
    },
  }
}

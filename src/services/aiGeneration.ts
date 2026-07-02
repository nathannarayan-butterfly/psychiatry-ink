import { resolveAiCallSchema } from '../data/aiCallSchemas'
import {
  buildSystemPrompt,
  buildToolTask,
  buildUserPrompt,
  isStyleOnlyTool,
} from '../data/aiPromptCore'
import { resolveModelForTier } from '../data/modelTierMapping'
import type {
  AiGenerationRequest,
  AiGenerationResult,
  AiResolvedCall,
} from '../types/aiGeneration'
import { chunkDocumentSections, chunkTextByTokens } from '../utils/chunkText'
import { dePseudonymizeText, pseudonymizeText, type PseudoMap } from '../utils/pseudonymize'
import { showNotionToast } from '../components/notion/NotionToast'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import { logGenerationUsage } from './generationLogClient'
import { resolveLlmRequestForTaskOrTier } from '../utils/resolveAiModel'

import type { AiFeatureKey } from '../types/aiUsage'

export const PSEUDONYMIZE_KEY = 'psychiatry-ink-pseudonymize'

export function resolveWorkspaceFeatureKey(componentId: string): AiFeatureKey {
  switch (componentId) {
    case 'therapie-verlauf':
      return 'short_verlauf'
    case 'verlauf':
      return 'verlauf_generation'
    case 'psychopath':
      return 'psychopathological_befund'
    case 'aufnahme':
      return 'anamnesis_structuring'
    case 'lab-interpretation':
      return 'lab_medication_correlation_check'
    case 'patient-aufklaerung':
      return 'patient_education_generic'
    case 'standalone-translate':
      // Patient-less translation tool — metered by text length via the
      // dedicated `standalone_translation` credit rule (server/ai/
      // featureCreditRules.ts), NOT the flat document_generation fall-through.
      return 'standalone_translation'
    default:
      return 'document_generation'
  }
}

export function isPseudonymizationEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PSEUDONYMIZE_KEY)
    return raw === null || raw === 'true'
  } catch {
    return true
  }
}

function appendConstraints(task: string, constraints?: string[]): string {
  if (!constraints?.length) return task
  return `${task}. ${constraints.join('; ')}`
}

function resolveStyleHint(request: AiGenerationRequest): string | undefined {
  if (request.tool !== 'structure') return undefined
  if (!request.sectionExampleHint) return undefined
  return request.sectionExampleHint.slice(0, 180)
}

/**
 * AI generation pipeline — patient name, date of birth, structured age field,
 * and page heading are kept out of sourceText. Age may appear in editor text
 * only if the clinician copies it into a section manually.
 */
export function resolveAiCall(request: AiGenerationRequest): AiResolvedCall {
  const schema = resolveAiCallSchema({
    componentId: request.componentId,
    variantId: request.variantId,
    sectionId: request.sectionId,
    scope: request.scope,
    tool: request.tool,
  })

  const model = resolveModelForTier(request.tier)
  const toolTask = appendConstraints(
    buildToolTask(
      request.tool,
      request.scope,
      schema.sectionFocus,
      request.componentId,
      request.sectionLabel,
    ),
    isStyleOnlyTool(request.tool) ? undefined : schema.constraints,
  )
  const systemPrompt = buildSystemPrompt(schema.aiRole, request.language, request.tool)
  const userPrompt = buildUserPrompt(toolTask, request.sourceText, {
    sectionLabel: request.sectionLabel,
    styleHint: resolveStyleHint(request),
    extraInstruction: request.extraInstruction,
  })

  let chunks: AiResolvedCall['chunks'] = []

  if (request.scope === 'document' && request.documentSections?.length) {
    chunks = chunkDocumentSections(
      request.documentSections.map((section) => ({
        sectionId: section.sectionId,
        label: section.label,
        content: section.content,
      })),
      schema.maxTokensPerChunk,
    )
  } else if (schema.chunkStrategy === 'by-token') {
    chunks = chunkTextByTokens(request.sourceText, schema.maxTokensPerChunk)
  }

  if (chunks.length === 0 && request.sourceText.trim()) {
    chunks = [{ id: 'single', label: request.sectionLabel ?? 'text', content: request.sourceText.trim() }]
  }

  return { schema, model, systemPrompt, userPrompt, toolTask, chunks }
}

function buildChunkPrompt(
  request: AiGenerationRequest,
  resolved: AiResolvedCall,
  chunkLabel: string,
  chunkContent: string,
): string {
  const chunkTask = `${resolved.toolTask}. Part: ${chunkLabel}`
  return buildUserPrompt(chunkTask, chunkContent, {
    extraInstruction: request.extraInstruction,
  })
}

async function callModel(
  request: AiGenerationRequest,
  resolved: AiResolvedCall,
  chunkContent: string,
  chunkLabel = 'text',
): Promise<{ text: string; model: AiResolvedCall['model'] }> {
  const userPrompt = buildChunkPrompt(request, resolved, chunkLabel, chunkContent)
  const authHeaders = await getAuthHeaders()
  const llm = resolveLlmRequestForTaskOrTier('document_generation', request.tier)

  // "Maximum" opt-in: clinician explicitly chose the top model (gpt-5.5) for this
  // generation. Pin the thorough tier + gründlich (4×) billing mode and flag the
  // server-side model override; the per-task model preference is bypassed so the
  // Maximum model always wins. The server is authoritative (re-derives mode/tier/
  // model from `maximum`) — these fields are sent for clarity/telemetry parity.
  const maximum = request.maximum === true

  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      tier: maximum ? 'thorough' : llm.tier,
      ...(maximum ? { mode: 'gruendlich', maximum: true } : { model: llm.model }),
      systemPrompt: resolved.systemPrompt,
      userPrompt,
      featureKey: resolveWorkspaceFeatureKey(request.componentId),
      ...(request.caseId?.trim() ? { caseId: request.caseId.trim() } : {}),
    }),
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI request failed (${response.status})`)
  }

  const data = (await response.json()) as {
    text: string
    model: AiResolvedCall['model']
  }

  return { text: data.text, model: data.model }
}

async function runGenerationCore(
  request: AiGenerationRequest,
  resolved: AiResolvedCall,
): Promise<AiGenerationResult> {
  const { schema, chunks } = resolved
  let model = resolved.model

  if (chunks.length <= 1) {
    const chunkResult = await callModel(
      request,
      resolved,
      chunks[0]?.content ?? request.sourceText,
      chunks[0]?.label,
    )
    model = chunkResult.model
    return {
      text: chunkResult.text,
      model,
      schemaId: schema.id,
      chunked: false,
      chunkCount: 1,
    }
  }

  const sectionResults: Record<string, string> = {}
  const mergedBlocks: string[] = []

  for (const chunk of chunks) {
    const chunkResult = await callModel(request, resolved, chunk.content, chunk.label)
    model = chunkResult.model
    mergedBlocks.push(chunkResult.text)

    if (chunk.sectionId) {
      sectionResults[chunk.sectionId] = sectionResults[chunk.sectionId]
        ? `${sectionResults[chunk.sectionId]}\n\n${chunkResult.text}`
        : chunkResult.text
    }
  }

  return {
    text: mergedBlocks.join('\n\n'),
    sectionResults: Object.keys(sectionResults).length > 0 ? sectionResults : undefined,
    model,
    schemaId: schema.id,
    chunked: true,
    chunkCount: chunks.length,
  }
}

/**
 * Apply pseudonymization to all text surfaces of the request.
 * Returns the modified request and the merged map for de-pseudonymization.
 */
function applyPseudonymization(
  request: AiGenerationRequest,
): { request: AiGenerationRequest; map: PseudoMap } {
  const hints = request.patientHints ?? {}
  const hasHints = Boolean(hints.patientName?.trim() || hints.patientDob?.trim())
  if (!hasHints) return { request, map: {} }

  const mergedMap: PseudoMap = {}

  // Pseudonymize main sourceText
  const { text: pseudoSource, map: sourceMap } = pseudonymizeText(request.sourceText, hints)
  Object.assign(mergedMap, sourceMap)

  // Pseudonymize document sections if present
  const pseudoSections = request.documentSections?.map((section) => {
    const { text: pseudoContent, map: sectionMap } = pseudonymizeText(section.content, hints)
    Object.assign(mergedMap, sectionMap)
    return { ...section, content: pseudoContent }
  })

  return {
    request: {
      ...request,
      sourceText: pseudoSource,
      documentSections: pseudoSections,
    },
    map: mergedMap,
  }
}

export async function executeAiGeneration(
  request: AiGenerationRequest,
  options?: {
    estimatedCredits?: number
    onCreditsDeducted?: (balance: number) => void
    /** Toast message shown when pseudonymization is active. */
    pseudonymizationActiveLabel?: string
  },
): Promise<AiGenerationResult> {
  const pseudoEnabled = isPseudonymizationEnabled()
  const hasHints = Boolean(
    request.patientHints?.patientName?.trim() || request.patientHints?.patientDob?.trim(),
  )

  let pseudoMap: PseudoMap = {}
  let effectiveRequest = request

  if (pseudoEnabled && hasHints) {
    const pseudo = applyPseudonymization(request)
    pseudoMap = pseudo.map
    effectiveRequest = pseudo.request

    if (Object.keys(pseudoMap).length > 0 && options?.pseudonymizationActiveLabel) {
      showNotionToast(options.pseudonymizationActiveLabel)
    }
  }

  const resolved = resolveAiCall(effectiveRequest)

  const rawResult = await logGenerationUsage(
    effectiveRequest,
    resolved.model,
    resolved.schema.id,
    () => runGenerationCore(effectiveRequest, resolved),
    options?.estimatedCredits,
    options?.onCreditsDeducted,
  )

  if (Object.keys(pseudoMap).length === 0) return rawResult

  return {
    ...rawResult,
    text: dePseudonymizeText(rawResult.text, pseudoMap),
    sectionResults: rawResult.sectionResults
      ? Object.fromEntries(
          Object.entries(rawResult.sectionResults).map(([k, v]) => [
            k,
            dePseudonymizeText(v, pseudoMap),
          ]),
        )
      : undefined,
  }
}

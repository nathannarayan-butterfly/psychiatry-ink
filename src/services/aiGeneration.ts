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
import { API_BASE } from './apiClient'
import { logGenerationUsage } from './generationLogClient'

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

  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier: request.tier,
      systemPrompt: resolved.systemPrompt,
      userPrompt,
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

export async function executeAiGeneration(
  request: AiGenerationRequest,
  options?: {
    estimatedCredits?: number
    onCreditsDeducted?: (balance: number) => void
  },
): Promise<AiGenerationResult> {
  const resolved = resolveAiCall(request)

  return logGenerationUsage(
    request,
    resolved.model,
    resolved.schema.id,
    () => runGenerationCore(request, resolved),
    options?.estimatedCredits,
    options?.onCreditsDeducted,
  )
}

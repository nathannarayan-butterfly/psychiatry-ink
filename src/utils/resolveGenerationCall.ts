import type { AiToolKey } from '../data/aiTools'
import { aiDocumentationToolKeys } from '../data/aiTools'
import { mergeAiConfig } from './aiManager'
import {
  resolveAiAutoSelection,
  type ContentInputOrigin,
} from './aiAutoDefaults'
import type { WorkspaceAiConfig } from '../types/aiManager'
import type { AiGenerationRequest } from '../types/aiGeneration'
import type { AiGenerationScope, AiModelTier, InputMode } from '../types'
import type { UiLanguage } from '../types/settings'

export interface GenerationCallContext {
  componentId: string
  variantId?: string
  sectionId?: string
  scope: AiGenerationScope
  inputMode: InputMode
  contentInputOrigin: ContentInputOrigin
  componentAi?: WorkspaceAiConfig
  variantAi?: WorkspaceAiConfig
  sectionAi?: WorkspaceAiConfig
  sourceText: string
  language: UiLanguage
  aiAutoMode: boolean
  userToolOverride: boolean
  selectedAiTool: AiToolKey | null
  aiModelTier: AiModelTier
  highlightedToolKeys: AiToolKey[]
  sectionLabel?: string
  sectionDescription?: string
  sectionExampleHint?: string
  documentSections?: AiGenerationRequest['documentSections']
  extraInstruction?: string
}

export interface ResolvedGenerationCall {
  request: AiGenerationRequest
  tool: AiToolKey
  tier: AiModelTier
  toolSource: 'manual' | 'auto' | 'highlight' | 'fallback'
}

function isToolEnabled(merged: WorkspaceAiConfig, tool: AiToolKey): boolean {
  return merged.tools[tool]?.enabled !== false
}

function firstEnabled(merged: WorkspaceAiConfig, priority: AiToolKey[]): AiToolKey | null {
  for (const tool of priority) {
    if (isToolEnabled(merged, tool)) return tool
  }
  return null
}

/** Default tool from input origin + scope when neither auto nor manual applies. */
export function resolveDefaultTool(
  merged: WorkspaceAiConfig,
  scope: AiGenerationScope,
  contentInputOrigin: ContentInputOrigin,
  inputMode: InputMode,
): AiToolKey {
  const selection = resolveAiAutoSelection({
    componentId: '_',
    generationScope: scope,
    inputMode,
    contentInputOrigin,
    mergedAi: merged,
  })
  return selection.tool
}

export function resolveGenerationTool(
  ctx: GenerationCallContext,
  merged: WorkspaceAiConfig,
): { tool: AiToolKey; source: ResolvedGenerationCall['toolSource'] } {
  if (
    ctx.userToolOverride &&
    ctx.selectedAiTool &&
    isToolEnabled(merged, ctx.selectedAiTool)
  ) {
    return { tool: ctx.selectedAiTool, source: 'manual' }
  }

  if (ctx.aiAutoMode) {
    const auto = resolveAiAutoSelection({
      componentId: ctx.componentId,
      variantId: ctx.variantId,
      sectionId: ctx.sectionId,
      generationScope: ctx.scope,
      inputMode: ctx.inputMode,
      contentInputOrigin: ctx.contentInputOrigin,
      mergedAi: merged,
      sourceText: ctx.sourceText,
    })
    return { tool: auto.tool, source: 'auto' }
  }

  if (ctx.selectedAiTool && isToolEnabled(merged, ctx.selectedAiTool)) {
    return { tool: ctx.selectedAiTool, source: 'manual' }
  }

  for (const key of ctx.highlightedToolKeys) {
    if (isToolEnabled(merged, key)) {
      return { tool: key, source: 'highlight' }
    }
  }

  const fallback = resolveDefaultTool(
    merged,
    ctx.scope,
    ctx.contentInputOrigin,
    ctx.inputMode,
  )
  return { tool: fallback, source: 'fallback' }
}

export function resolveGenerationTier(
  ctx: GenerationCallContext,
  merged: WorkspaceAiConfig,
): AiModelTier {
  if (ctx.aiAutoMode) {
    return resolveAiAutoSelection({
      componentId: ctx.componentId,
      variantId: ctx.variantId,
      sectionId: ctx.sectionId,
      generationScope: ctx.scope,
      inputMode: ctx.inputMode,
      contentInputOrigin: ctx.contentInputOrigin,
      mergedAi: merged,
      sourceText: ctx.sourceText,
    }).tier
  }
  return ctx.aiModelTier ?? merged.defaultTier
}

export function resolveGenerationCall(ctx: GenerationCallContext): ResolvedGenerationCall {
  const merged = mergeAiConfig(ctx.componentAi, ctx.variantAi, ctx.sectionAi)
  const { tool, source } = resolveGenerationTool(ctx, merged)
  const tier = resolveGenerationTier(ctx, merged)

  const safeTool =
    firstEnabled(merged, [tool, ...aiDocumentationToolKeys]) ?? 'structure'

  return {
    tool: safeTool,
    tier,
    toolSource: source,
    request: {
      componentId: ctx.componentId,
      variantId: ctx.variantId,
      sectionId: ctx.sectionId,
      scope: ctx.scope,
      tool: safeTool,
      tier,
      language: ctx.language,
      sourceText: ctx.sourceText,
      sectionLabel: ctx.sectionLabel,
      sectionDescription: ctx.sectionDescription,
      sectionExampleHint: ctx.sectionExampleHint,
      documentSections: ctx.documentSections,
      extraInstruction: ctx.extraInstruction?.trim() || undefined,
    },
  }
}

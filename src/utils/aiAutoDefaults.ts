import type { AiToolKey } from '../data/aiTools'
import { estimateTokensFromText } from './estimateCredits'
import type { WorkspaceAiConfig } from '../types/aiManager'
import type { AiGenerationScope, AiModelTier, InputMode } from '../types'
import { resolveAiModelForTask } from './resolveAiModel'

export type ContentInputOrigin = 'typed' | 'pasted' | 'dictated'

export interface AiAutoSelectionContext {
  componentId: string
  variantId?: string
  sectionId?: string
  generationScope: AiGenerationScope
  inputMode: InputMode
  contentInputOrigin: ContentInputOrigin
  mergedAi: WorkspaceAiConfig
  sourceText?: string
}

export interface AiAutoSelection {
  tier: AiModelTier
  tool: AiToolKey
}

const TYPED_TOOL_PRIORITY: AiToolKey[] = [
  'structure',
  'proofread',
  'formalize',
  'expand',
  'shorten',
  'bulletPoints',
  'summarize',
]

const PASTED_TOOL_PRIORITY: AiToolKey[] = [
  'summarize',
  'structure',
  'shorten',
  'formalize',
  'proofread',
  'expand',
  'bulletPoints',
]

function isToolEnabled(merged: WorkspaceAiConfig, key: AiToolKey): boolean {
  const rule = merged.tools[key]
  return rule?.enabled !== false
}

function pickEnabledTool(
  merged: WorkspaceAiConfig,
  priority: AiToolKey[],
): AiToolKey {
  for (const key of priority) {
    if (isToolEnabled(merged, key)) return key
  }
  return 'structure'
}

function isPastedInput(ctx: AiAutoSelectionContext): boolean {
  return ctx.contentInputOrigin === 'pasted' || ctx.inputMode === 'extract'
}

function resolveAutoTier(ctx: AiAutoSelectionContext, tool: AiToolKey): AiModelTier {
  const pasted = isPastedInput(ctx)
  const tokens = estimateTokensFromText(ctx.sourceText ?? '')

  let tier = ctx.mergedAi.autoDefaultTier ?? resolveAiModelForTask('background').tier ?? ctx.mergedAi.defaultTier

  if (ctx.componentId === 'therapie-verlauf' && pasted && tool === 'summarize') {
    tier = 'fast'
  }

  if (pasted && tool === 'summarize' && tokens > 1500) {
    tier = tier === 'thorough' ? 'standard' : tier === 'standard' ? 'fast' : tier
  }

  if (
    !pasted &&
    tool === 'structure' &&
    tokens > 4000 &&
    tier === 'fast' &&
    ctx.componentId !== 'verlauf'
  ) {
    tier = 'standard'
  }

  if (
    ctx.generationScope === 'document' &&
    ctx.componentId === 'aufnahme' &&
    tier === 'thorough'
  ) {
    tier = 'standard'
  }

  return tier
}

function resolveAutoTool(ctx: AiAutoSelectionContext): AiToolKey {
  const pasted = isPastedInput(ctx)
  const overrides = ctx.mergedAi.autoDefaultTools

  // Gesamt + typed/dictated → structure (e.g. full anamnesis typed, then organize)
  if (ctx.generationScope === 'document' && !pasted) {
    if (isToolEnabled(ctx.mergedAi, 'structure')) return 'structure'
  }

  // Gesamt + pasted → summarize
  if (ctx.generationScope === 'document' && pasted) {
    if (isToolEnabled(ctx.mergedAi, 'summarize')) return 'summarize'
  }

  if (pasted) {
    const preferred = overrides?.pasted
    if (preferred && isToolEnabled(ctx.mergedAi, preferred)) return preferred
    return pickEnabledTool(ctx.mergedAi, PASTED_TOOL_PRIORITY)
  }

  // Typed or dictated (post-transcription) → structure by default; proofread/formalize via manual pick
  const preferred = overrides?.typed
  if (preferred && isToolEnabled(ctx.mergedAi, preferred)) return preferred
  return pickEnabledTool(ctx.mergedAi, TYPED_TOOL_PRIORITY)
}

export function resolveAiAutoSelection(
  ctx: AiAutoSelectionContext,
): AiAutoSelection {
  const tool = resolveAutoTool(ctx)
  const tier = resolveAutoTier(ctx, tool)
  return { tier, tool }
}

import type { AiToolKey } from '../data/aiTools'
import type { AiGenerationScope, AiModelTier } from './index'

export interface WorkspaceAiToolRule {
  enabled: boolean
  highlightInScopes?: AiGenerationScope[]
}

export interface WorkspaceAiAutoToolDefaults {
  typed?: AiToolKey
  pasted?: AiToolKey
}

export interface WorkspaceAiConfig {
  defaultTier: AiModelTier
  /** Economical tier used when KI Auto is enabled. */
  autoDefaultTier?: AiModelTier
  /** Optional per-input overrides; otherwise structure (typed) / summarize (pasted). */
  autoDefaultTools?: WorkspaceAiAutoToolDefaults
  tools: Partial<Record<AiToolKey, WorkspaceAiToolRule>>
  generateInScopes: AiGenerationScope[]
}

export interface ResolvedAiToolState {
  key: AiToolKey
  enabled: boolean
  highlighted: boolean
  disabled: boolean
}

export type AiContextHintKind = 'segment' | 'document' | 'unavailable'

export interface ResolvedAiContext {
  defaultTier: AiModelTier
  tools: ResolvedAiToolState[]
  highlightedToolKeys: AiToolKey[]
  generateScopeAllowed: boolean
  canGenerate: boolean
  hintKind: AiContextHintKind | null
}

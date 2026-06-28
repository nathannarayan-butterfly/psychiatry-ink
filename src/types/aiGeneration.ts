import type { AiToolKey } from '../data/aiTools'
import type { UiLanguage } from './settings'
import type { AiGenerationScope, AiModelTier } from './index'

export type AiChunkStrategy = 'none' | 'by-section' | 'by-token'

/** Writer = documentation specialist; psychiatrist = diagnostic/risk sections. */
export type AiClinicalRole = 'writer' | 'psychiatrist'

export type AiProviderId = 'openai' | 'deepseek' | 'google' | 'mistral'

export interface AiModelSpec {
  provider: AiProviderId
  modelId: string
  label: string
}

export interface AiDocumentSectionInput {
  sectionId: string
  label: string
  content: string
  description?: string
  exampleHint?: string
}

export interface AiCallSchemaDefinition {
  id: string
  componentId: string
  variantId?: string
  sectionId?: string
  scope: AiGenerationScope
  preferredTool: AiToolKey
  tierDefault: AiModelTier
  chunkStrategy: AiChunkStrategy
  maxTokensPerChunk: number
  /** Compact clinical focus — combined with tool verb at call time. */
  sectionFocus: string
  aiRole: AiClinicalRole
  /** Optional extra constraints (keep short). */
  constraints?: string[]
}

export interface AiPatientHints {
  patientName?: string
  patientDob?: string
}

export interface AiGenerationRequest {
  componentId: string
  variantId?: string
  sectionId?: string
  scope: AiGenerationScope
  tool: AiToolKey
  tier: AiModelTier
  language: UiLanguage
  sourceText: string
  sectionLabel?: string
  sectionDescription?: string
  sectionExampleHint?: string
  documentSections?: AiDocumentSectionInput[]
  /** Per-request clinician instructions — not persisted in source text. */
  extraInstruction?: string
  /** Patient hints for client-side pseudonymization. Present only when pseudonymization is enabled. */
  patientHints?: AiPatientHints
  /** Case scope for server-side ai.use enforcement. */
  caseId?: string
  /**
   * Clinician-initiated "Maximum" opt-in for this single generation. When true,
   * the server runs the top model (gpt-5.5) as a model override and bills at the
   * gründlich (4×) multiplier. Only meaningful with the thorough tier; never
   * auto-enabled.
   */
  maximum?: boolean
}

export interface AiGenerationChunk {
  id: string
  label: string
  content: string
  sectionId?: string
}

export interface AiResolvedCall {
  schema: AiCallSchemaDefinition
  model: AiModelSpec
  systemPrompt: string
  userPrompt: string
  toolTask: string
  chunks: AiGenerationChunk[]
}

export interface AiGenerationResult {
  text: string
  sectionResults?: Record<string, string>
  model: AiModelSpec
  schemaId: string
  chunked: boolean
  chunkCount: number
}

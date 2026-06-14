import type { PrescribingCountryCode } from './knowledgeBase'
import type { UiLanguage } from './settings'

export interface PrepAiCheckPreparation {
  brandName: string
  strength: string
  form: string
  pzn?: string
  availabilityNote?: string
  sourceHint?: string
}

export interface PrepAiCheckRequest {
  caseId: string
  substance: string
  genericName?: string
  country?: PrescribingCountryCode
  /** Selected drug from plan — optional context for form/strength. */
  selectedDrug?: {
    substance: string
    strength?: string
    formulation?: string
  }
  /** Verified KB preparations already on file — AI should supplement gaps. */
  kbPreparations?: Array<{
    tradeName: string
    strength: string
    form: string
  }>
  /** UI language for AI output (from Settings). */
  language?: UiLanguage
}

export type PrepAiCheckSource = 'deepseek' | 'openai' | 'other'

export interface PrepAiCheckResponse {
  preparations: PrepAiCheckPreparation[]
  disclaimer: string
  country: PrescribingCountryCode
  model: { provider: string; modelId: string; label: string }
  /** AI provider used for this check (Quelle). */
  source: PrepAiCheckSource
  /** Human-readable Quelle label (e.g. "DeepSeek (deepseek-chat)"). */
  sourceLabel: string
  aiWarning?: string
}

import type { UiTranslationKey } from '../data/uiTranslations'
import type { AiModelTier } from './index'

/** Persisted model option id — see `AI_MODEL_CATALOG` in `aiModelCatalog.ts`. */
export type AiModelOptionId =
  | 'psyink-fast'
  | 'psyink-standard'
  | 'psyink-thorough'
  | 'openai-gpt-4o-mini'
  | 'openai-gpt-4.1'
  | 'deepseek-v4-flash'
  | 'google-gemini-2.0-flash'
  | 'google-gemini-2.5-pro'

/** AI function keys — one row per task in Settings → KI. */
export type AiTaskId =
  | 'ask_butterfly'
  | 'background'
  | 'document_generation'
  | 'document_import'
  | 'psychopath_extract'
  | 'inline_edit'
  | 'clinical_metadata'
  | 'discuss_case'
  | 'butterfly_chart'
  | 'transcription'
  | 'clinical_intelligence_dimensional'
  | 'clinical_intelligence_mechanism'
  | 'clinical_intelligence_discuss'

export interface AiModelPreferences {
  tasks: Partial<Record<AiTaskId, AiModelOptionId>>
}

export interface AiModelCatalogEntry {
  id: AiModelOptionId
  provider: 'psyink' | 'openai' | 'deepseek' | 'google'
  modelId: string
  /** Psychiatry.Ink tier when this option is a bundled tier. */
  tier?: AiModelTier
  labelKey: UiTranslationKey
  groupKey: UiTranslationKey
}

export interface AiTaskDefinition {
  id: AiTaskId
  labelKey: UiTranslationKey
  descriptionKey?: UiTranslationKey
  /** When false, preference is stored but not yet routed server-side. */
  wired: boolean
  defaultOptionId: AiModelOptionId
}

export const defaultAiModelPreferences: AiModelPreferences = {
  tasks: {
    ask_butterfly: 'psyink-standard',
    background: 'psyink-fast',
    document_generation: 'psyink-standard',
    document_import: 'psyink-fast',
    psychopath_extract: 'psyink-fast',
    inline_edit: 'psyink-fast',
    clinical_metadata: 'psyink-fast',
    discuss_case: 'psyink-thorough',
    butterfly_chart: 'psyink-standard',
    transcription: 'psyink-fast',
    clinical_intelligence_dimensional: 'psyink-thorough',
    clinical_intelligence_mechanism: 'psyink-thorough',
    clinical_intelligence_discuss: 'psyink-standard',
  },
}

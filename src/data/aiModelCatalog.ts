import type {
  AiModelCatalogEntry,
  AiModelOptionId,
  AiTaskDefinition,
} from '../types/aiModelPreferences'

export const AI_MODEL_CATALOG: AiModelCatalogEntry[] = [
  {
    id: 'psyink-fast',
    provider: 'psyink',
    modelId: 'fast',
    tier: 'fast',
    labelKey: 'aiModelOptionPsyinkFast',
    groupKey: 'aiModelGroupPsyink',
  },
  {
    id: 'psyink-standard',
    provider: 'psyink',
    modelId: 'standard',
    tier: 'standard',
    labelKey: 'aiModelOptionPsyinkStandard',
    groupKey: 'aiModelGroupPsyink',
  },
  {
    id: 'psyink-thorough',
    provider: 'psyink',
    modelId: 'thorough',
    tier: 'thorough',
    labelKey: 'aiModelOptionPsyinkThorough',
    groupKey: 'aiModelGroupPsyink',
  },
  {
    id: 'openai-gpt-4o-mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    labelKey: 'aiModelOptionOpenAiGpt4oMini',
    groupKey: 'aiModelGroupOpenAi',
  },
  {
    id: 'openai-gpt-4.1',
    provider: 'openai',
    modelId: 'gpt-4.1',
    labelKey: 'aiModelOptionOpenAiGpt41',
    groupKey: 'aiModelGroupOpenAi',
  },
  {
    id: 'deepseek-v4-flash',
    provider: 'deepseek',
    modelId: 'deepseek-v4-flash',
    labelKey: 'aiModelOptionDeepseekV4Flash',
    groupKey: 'aiModelGroupDeepseek',
  },
  {
    id: 'google-gemini-2.0-flash',
    provider: 'google',
    modelId: 'gemini-2.0-flash',
    labelKey: 'aiModelOptionGemini20Flash',
    groupKey: 'aiModelGroupGoogle',
  },
  {
    id: 'google-gemini-2.5-pro',
    provider: 'google',
    modelId: 'gemini-2.5-pro',
    labelKey: 'aiModelOptionGemini25Pro',
    groupKey: 'aiModelGroupGoogle',
  },
]

export const AI_TASK_DEFINITIONS: AiTaskDefinition[] = [
  {
    id: 'ask_butterfly',
    labelKey: 'aiTaskAskButterfly',
    wired: true,
    defaultOptionId: 'psyink-standard',
  },
  {
    id: 'background',
    labelKey: 'aiTaskBackground',
    descriptionKey: 'aiTaskBackgroundDescription',
    wired: true,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'document_generation',
    labelKey: 'aiTaskDocumentGeneration',
    wired: true,
    defaultOptionId: 'psyink-standard',
  },
  {
    id: 'document_import',
    labelKey: 'aiTaskDocumentImport',
    wired: true,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'psychopath_extract',
    labelKey: 'aiTaskPsychopathExtract',
    wired: true,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'inline_edit',
    labelKey: 'aiTaskInlineEdit',
    wired: true,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'clinical_metadata',
    labelKey: 'aiTaskClinicalMetadata',
    wired: true,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'discuss_case',
    labelKey: 'aiTaskDiscussCase',
    wired: false,
    defaultOptionId: 'psyink-thorough',
  },
  {
    id: 'butterfly_chart',
    labelKey: 'aiTaskButterflyChart',
    wired: false,
    defaultOptionId: 'psyink-standard',
  },
  {
    id: 'transcription',
    labelKey: 'aiTaskTranscription',
    descriptionKey: 'aiTaskTranscriptionDescription',
    wired: false,
    defaultOptionId: 'psyink-fast',
  },
  {
    id: 'clinical_intelligence_dimensional',
    labelKey: 'aiTaskClinicalIntelligenceDimensional',
    descriptionKey: 'aiTaskClinicalIntelligenceDimensionalDescription',
    wired: true,
    defaultOptionId: 'psyink-thorough',
  },
  {
    id: 'clinical_intelligence_mechanism',
    labelKey: 'aiTaskClinicalIntelligenceMechanism',
    descriptionKey: 'aiTaskClinicalIntelligenceMechanismDescription',
    wired: true,
    defaultOptionId: 'psyink-thorough',
  },
  {
    id: 'clinical_intelligence_discuss',
    labelKey: 'aiTaskClinicalIntelligenceDiscuss',
    descriptionKey: 'aiTaskClinicalIntelligenceDiscussDescription',
    wired: true,
    defaultOptionId: 'psyink-standard',
  },
]

const catalogById = new Map<AiModelOptionId, AiModelCatalogEntry>(
  AI_MODEL_CATALOG.map((entry) => [entry.id, entry]),
)

export function getModelCatalogEntry(id: AiModelOptionId): AiModelCatalogEntry {
  const entry = catalogById.get(id)
  if (!entry) return catalogById.get('psyink-standard')!
  return entry
}

export const AI_MODEL_GROUP_ORDER = ['psyink', 'openai', 'deepseek', 'google'] as const

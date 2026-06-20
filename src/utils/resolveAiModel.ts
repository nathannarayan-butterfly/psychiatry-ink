import { getModelCatalogEntry } from '../data/aiModelCatalog'
import type { AiModelOptionId, AiModelPreferences, AiTaskId } from '../types/aiModelPreferences'
import { defaultAiModelPreferences } from '../types/aiModelPreferences'
import type { AiModelTier } from '../types'
import { safeGetItem, safeSetItem } from './safeStorage'

export const AI_MODEL_PREFERENCES_KEY = 'psychiatry-ink:ai-model-preferences'

export interface ResolvedAiModel {
  optionId: AiModelOptionId
  provider: string
  modelId: string
  tier: AiModelTier
}

export interface AiLlmRequestPayload {
  tier: AiModelTier
  model?: { provider: string; modelId: string }
}

export function loadAiModelPreferences(): AiModelPreferences {
  try {
    const raw = safeGetItem(AI_MODEL_PREFERENCES_KEY)
    if (!raw) return defaultAiModelPreferences
    const parsed = JSON.parse(raw) as Partial<AiModelPreferences>
    return {
      tasks: {
        ...defaultAiModelPreferences.tasks,
        ...(parsed.tasks ?? {}),
      },
    }
  } catch {
    return defaultAiModelPreferences
  }
}

export function saveAiModelPreferences(preferences: AiModelPreferences): void {
  safeSetItem(AI_MODEL_PREFERENCES_KEY, JSON.stringify(preferences))
}

export function resolveTaskOptionId(
  taskId: AiTaskId,
  preferences?: AiModelPreferences,
): AiModelOptionId {
  const prefs = preferences ?? loadAiModelPreferences()
  return prefs.tasks[taskId] ?? defaultAiModelPreferences.tasks[taskId] ?? 'psyink-standard'
}

export function resolveAiModelForTask(
  taskId: AiTaskId,
  preferences?: AiModelPreferences,
): ResolvedAiModel {
  const optionId = resolveTaskOptionId(taskId, preferences)
  const entry = getModelCatalogEntry(optionId)
  return {
    optionId: entry.id,
    provider: entry.provider === 'psyink' ? 'psyink' : entry.provider,
    modelId: entry.modelId,
    tier: entry.tier ?? 'standard',
  }
}

/** Map Psychiatry.Ink tier buttons to catalog option ids. */
export function tierToPsyinkOptionId(tier: AiModelTier): AiModelOptionId {
  if (tier === 'fast') return 'psyink-fast'
  if (tier === 'thorough') return 'psyink-thorough'
  return 'psyink-standard'
}

export function toLlmRequestPayload(resolved: ResolvedAiModel): AiLlmRequestPayload {
  if (resolved.provider === 'psyink') {
    return { tier: resolved.tier }
  }
  return {
    tier: resolved.tier,
    model: { provider: resolved.provider, modelId: resolved.modelId },
  }
}

export function resolveLlmRequestForTask(
  taskId: AiTaskId,
  preferences?: AiModelPreferences,
): AiLlmRequestPayload {
  return toLlmRequestPayload(resolveAiModelForTask(taskId, preferences))
}

/** Prefer explicit per-task model from settings; otherwise use the live UI tier. */
export function resolveLlmRequestForTaskOrTier(
  taskId: AiTaskId,
  fallbackTier: AiModelTier,
  preferences?: AiModelPreferences,
): AiLlmRequestPayload {
  const payload = resolveLlmRequestForTask(taskId, preferences)
  if (payload.model) return payload
  return { tier: fallbackTier }
}

import { aiDocumentationToolKeys, type AiToolKey } from '../data/aiTools'
import { defaultAiConfig } from '../data/aiManagerPresets'
import type {
  ResolvedAiContext,
  WorkspaceAiConfig,
  WorkspaceAiToolRule,
} from '../types/aiManager'
import type { AiGenerationScope } from '../types'

function cloneToolRule(rule: WorkspaceAiToolRule): WorkspaceAiToolRule {
  return {
    enabled: rule.enabled,
    highlightInScopes: rule.highlightInScopes
      ? [...rule.highlightInScopes]
      : undefined,
  }
}

export function mergeAiConfig(
  ...configs: Array<WorkspaceAiConfig | undefined>
): WorkspaceAiConfig {
  const merged: WorkspaceAiConfig = {
    defaultTier: defaultAiConfig.defaultTier,
    autoDefaultTier: defaultAiConfig.autoDefaultTier,
    autoDefaultTools: defaultAiConfig.autoDefaultTools
      ? { ...defaultAiConfig.autoDefaultTools }
      : undefined,
    generateInScopes: [...defaultAiConfig.generateInScopes],
    tools: Object.fromEntries(
      Object.entries(defaultAiConfig.tools).map(([key, rule]) => [
        key,
        cloneToolRule(rule),
      ]),
    ) as WorkspaceAiConfig['tools'],
  }

  for (const config of configs) {
    if (!config) continue

    merged.defaultTier = config.defaultTier
    if (config.autoDefaultTier) {
      merged.autoDefaultTier = config.autoDefaultTier
    }
    if (config.autoDefaultTools) {
      merged.autoDefaultTools = { ...config.autoDefaultTools }
    }
    if (config.generateInScopes.length > 0) {
      merged.generateInScopes = [...config.generateInScopes]
    }

    for (const [key, rule] of Object.entries(config.tools)) {
      if (!rule) continue
      merged.tools[key as AiToolKey] = cloneToolRule(rule)
    }
  }

  return merged
}

export function resolveAiContext(options: {
  componentAi?: WorkspaceAiConfig
  variantAi?: WorkspaceAiConfig
  sectionAi?: WorkspaceAiConfig
  generationScope: AiGenerationScope
  hasSourceContent: boolean
  editorContentLocked: boolean
  aiControlsLocked: boolean
}): ResolvedAiContext {
  const merged = mergeAiConfig(
    options.componentAi,
    options.variantAi,
    options.sectionAi,
  )

  const tools = aiDocumentationToolKeys.map((key) => {
    const rule = merged.tools[key]
    const highlightScopes = rule?.highlightInScopes ?? []
    const highlighted = Boolean(
      rule?.enabled && highlightScopes.includes(options.generationScope),
    )

    const enabled = rule?.enabled !== false

    return {
      key,
      enabled,
      highlighted: enabled && highlighted,
      disabled: options.aiControlsLocked || !enabled,
    }
  })

  const highlightedToolKeys = tools
    .filter((tool) => tool.highlighted)
    .map((tool) => tool.key)

  const generateScopeAllowed = merged.generateInScopes.includes(
    options.generationScope,
  )

  const canGenerate =
    generateScopeAllowed &&
    options.hasSourceContent &&
    !options.editorContentLocked

  let hintKind: ResolvedAiContext['hintKind'] = null
  if (highlightedToolKeys.length > 0) {
    hintKind = options.generationScope === 'document' ? 'document' : 'segment'
  } else if (!generateScopeAllowed) {
    hintKind = 'unavailable'
  }

  return {
    defaultTier: merged.defaultTier,
    tools,
    highlightedToolKeys,
    generateScopeAllowed,
    canGenerate,
    hintKind,
  }
}

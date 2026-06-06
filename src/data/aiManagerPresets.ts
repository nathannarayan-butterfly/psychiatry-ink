import { aiDocumentationToolKeys, type AiToolKey } from './aiTools'
import type { WorkspaceAiConfig } from '../types/aiManager'

function allToolsEnabled(
  highlightInScopes: WorkspaceAiConfig['generateInScopes'] = ['segment', 'document'],
): WorkspaceAiConfig['tools'] {
  return Object.fromEntries(
    aiDocumentationToolKeys.map((key) => [
      key,
      { enabled: true, highlightInScopes },
    ]),
  ) as WorkspaceAiConfig['tools']
}

export const defaultAiConfig: WorkspaceAiConfig = {
  defaultTier: 'standard',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment', 'document'],
  tools: allToolsEnabled(),
}

/** Aufnahmeanlass: segment → strukturieren; document scope → strukturieren + zusammenfassen */
export const aufnahmeanlassSectionAi: WorkspaceAiConfig = {
  defaultTier: 'standard',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment', 'document'],
  tools: {
    structure: { enabled: true, highlightInScopes: ['segment', 'document'] },
    summarize: { enabled: true, highlightInScopes: ['document'] },
    shorten: { enabled: false },
    formalize: { enabled: false },
    bulletPoints: { enabled: false },
    proofread: { enabled: true, highlightInScopes: ['segment'] },
    expand: { enabled: false },
  },
}

export const aufnahmeComponentAi: WorkspaceAiConfig = {
  defaultTier: 'thorough',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment', 'document'],
  tools: allToolsEnabled(['document']),
}

export const verlaufShortVariantAi: WorkspaceAiConfig = {
  defaultTier: 'fast',
  autoDefaultTier: 'fast',
  generateInScopes: ['segment'],
  tools: allToolsEnabled(['segment']),
}

/** Minimal freetext document pages (Medikation, Therapieplanung, etc.). */
export const freeTextDocumentAi: WorkspaceAiConfig = {
  defaultTier: 'fast',
  autoDefaultTier: 'fast',
  generateInScopes: ['segment'],
  tools: allToolsEnabled(['segment']),
}

export const therapieVerlaufComponentAi: WorkspaceAiConfig = {
  defaultTier: 'thorough',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment'],
  tools: {
    structure: { enabled: true, highlightInScopes: ['segment'] },
    summarize: { enabled: true, highlightInScopes: ['segment'] },
    shorten: { enabled: true, highlightInScopes: ['segment'] },
    formalize: { enabled: true, highlightInScopes: ['segment', 'document'] },
    bulletPoints: { enabled: false },
    proofread: { enabled: true, highlightInScopes: ['segment'] },
    expand: { enabled: true, highlightInScopes: ['segment'] },
  },
}

export const verlaufBroadVariantAi: WorkspaceAiConfig = {
  defaultTier: 'standard',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment', 'document'],
  tools: {
    structure: { enabled: true, highlightInScopes: ['segment', 'document'] },
    summarize: { enabled: true, highlightInScopes: ['document'] },
    shorten: { enabled: true, highlightInScopes: ['segment'] },
    formalize: { enabled: true, highlightInScopes: ['segment', 'document'] },
    bulletPoints: { enabled: true, highlightInScopes: ['segment'] },
    proofread: { enabled: true, highlightInScopes: ['segment'] },
    expand: { enabled: true, highlightInScopes: ['segment'] },
  },
}

export const psychopathFreeVariantAi: WorkspaceAiConfig = {
  defaultTier: 'standard',
  autoDefaultTier: 'standard',
  generateInScopes: ['segment'],
  tools: allToolsEnabled(['segment']),
}

export const psychopathChecklistVariantAi: WorkspaceAiConfig = {
  defaultTier: 'standard',
  autoDefaultTier: 'fast',
  autoDefaultTools: { typed: 'proofread', pasted: 'shorten' },
  generateInScopes: ['segment'],
  tools: {
    structure: { enabled: false },
    summarize: { enabled: false },
    shorten: { enabled: true, highlightInScopes: ['segment'] },
    formalize: { enabled: true, highlightInScopes: ['segment'] },
    bulletPoints: { enabled: false },
    proofread: { enabled: true, highlightInScopes: ['segment'] },
    expand: { enabled: false },
  },
}

export function createNewComponentAiConfig(): WorkspaceAiConfig {
  return {
    defaultTier: 'standard',
    autoDefaultTier: 'standard',
    generateInScopes: ['segment'],
    tools: {
      structure: { enabled: true, highlightInScopes: ['segment', 'document'] },
      summarize: { enabled: true, highlightInScopes: ['document'] },
      shorten: { enabled: false },
      formalize: { enabled: false },
      bulletPoints: { enabled: false },
      proofread: { enabled: false },
      expand: { enabled: false },
    },
  }
}

export function cloneAiConfig(config: WorkspaceAiConfig): WorkspaceAiConfig {
  return {
    defaultTier: config.defaultTier,
    autoDefaultTier: config.autoDefaultTier,
    autoDefaultTools: config.autoDefaultTools
      ? { ...config.autoDefaultTools }
      : undefined,
    generateInScopes: [...config.generateInScopes],
    tools: Object.fromEntries(
      Object.entries(config.tools).map(([key, rule]) => [
        key,
        {
          enabled: rule.enabled,
          highlightInScopes: rule.highlightInScopes
            ? [...rule.highlightInScopes]
            : undefined,
        },
      ]),
    ) as WorkspaceAiConfig['tools'],
  }
}

export function isAiToolKey(value: string): value is AiToolKey {
  return aiDocumentationToolKeys.includes(value as AiToolKey)
}

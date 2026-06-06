import type { AiModelTier } from '../types'

export const aiModelTiers: AiModelTier[] = ['fast', 'standard', 'thorough']

export type AiToolKey =
  | 'summarize'
  | 'structure'
  | 'shorten'
  | 'formalize'
  | 'bulletPoints'
  | 'proofread'
  | 'expand'

export const aiDocumentationToolKeys: AiToolKey[] = [
  'summarize',
  'structure',
  'shorten',
  'formalize',
  'bulletPoints',
  'proofread',
  'expand',
]

export const aiModelTierLabelKeys = {
  fast: 'aiModelFast',
  standard: 'aiModelStandard',
  thorough: 'aiModelThorough',
} as const

export const aiModelTierHintKeys = {
  fast: 'aiModelFastHint',
  standard: 'aiModelStandardHint',
  thorough: 'aiModelThoroughHint',
} as const

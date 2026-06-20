/** Feature keys for AI usage tracking — no PHI in logs. */
export type AiFeatureKey =
  // legacy route-level keys
  | 'anamnesis_generation'
  | 'verlauf_generation'
  | 'arztbrief_generation'
  | 'psychopathologischer_befund'
  | 'kb_seed'
  | 'kb_pharmacokinetics'
  | 'kb_translation_de'
  | 'medication_combination_check'
  | 'lab_medication_correlation'
  | 'prep_ai_check'
  | 'transcription'
  | 'test_generation'
  | 'pharma_generate'
  | 'pharma_ask'
  | 'discuss_case_ai'
  | 'document_generation'
  | 'butterfly'
  | 'criteria_draft_generate'
  | 'ask_butterfly'
  | 'prior_therapies'
  | 'clinical_metadata_extraction'
  | 'inline_text_edit'
  | 'clinical_intelligence_dimensional'
  | 'clinical_intelligence_mechanism'
  | 'clinical_intelligence_discuss'
  // credit-system granular keys
  | 'simple_rewrite'
  | 'short_verlauf'
  | 'psychopathological_befund'
  | 'somatic_befund'
  | 'lab_formatting'
  | 'anamnesis_structuring'
  | 'diagnosis_formulation'
  | 'medication_summary'
  | 'therapy_plan'
  | 'arztbrief_section'
  | 'full_arztbrief'
  | 'full_case_summary'
  | 'forensic_risk_formulation'
  | 'medication_interaction_check'
  | 'lab_medication_correlation_check'
  | 'full_patient_build'
  | 'document_import_mapping'
  | 'psychopathology_extraction'
  | 'clinical_intelligence_discussion'
  | 'unknown'

/**
 * AI generation mode — user-visible quality tiers.
 * Maps to internal model tiers: economic→fast, standard→standard, gruendlich→thorough.
 */
export type AiMode = 'economic' | 'standard' | 'gruendlich'

export type AiUsageSource = 'provider_reported' | 'estimated_from_chars'

export type AiRequestKind = 'chat' | 'transcription' | 'batch'

export interface AiBudgetConfig {
  id: string
  organisationId: string
  monthlyBudgetUsd: number | null
  monthlyBudgetEur: number | null
  warnAt50: boolean
  warnAt80: boolean
  warnAt100: boolean
  hardLimitEnabled: boolean
  hardLimitUsd: number | null
  hardLimitEur: number | null
  notifyEmails: string[] | null
  updatedAt: string
  updatedBy: string | null
}

export interface AiBudgetWarning {
  id: string
  organisationId: string
  createdAt: string
  thresholdPercent: 50 | 80 | 100
  periodStart: string
  budgetAmount: number
  currentUsage: number
  currency: string
  acknowledged: boolean
}

export interface AiUsageLogEntry {
  id: string
  createdAt: string
  userId: string | null
  organisationId: string | null
  caseId: string | null
  featureKey: AiFeatureKey
  provider: string
  model: string
  requestKind: AiRequestKind
  inputTokens: number
  cachedInputTokens: number
  cacheMissInputTokens: number
  outputTokens: number
  totalTokens: number
  audioMinutes: number | null
  estimatedCostUsd: number | null
  estimatedCostEur: number | null
  usageSource: AiUsageSource
  success: boolean
  errorCode: string | null
  requestId: string | null
  latencyMs: number | null
}

export interface AiUsageMonthlySummary {
  periodStart: string
  periodEnd: string
  totalCostUsd: number
  totalCostEur: number
  totalTokens: number
  generationCount: number
  providerReportedCount: number
  estimatedCount: number
  deepseekTokens: number
  openaiTokens: number
  transcriptionMinutes: number
  openaiFallbackCount: number
  budgetPercent: number | null
  budgetCurrency: 'USD' | 'EUR' | null
  topFeatures: Array<{ featureKey: string; tokens: number; costEur: number; count: number }>
}

export interface CurrentUsageForQuota {
  generationCount: number
  tokenCount: number
  costUsd: number
  costEur: number
  openaiFallbackCount: number
  transcriptionMinutes: number
  providerReportedCount: number
  estimatedCount: number
}

export interface AiUsageBreakdownRow {
  key: string
  tokens: number
  costUsd: number
  costEur: number
  count: number
  providerReportedCount: number
  estimatedCount: number
}

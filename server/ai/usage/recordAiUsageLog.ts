import type { AiFeatureKey, AiRequestKind } from '../../../src/types/aiUsage'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../../services/kbSupabaseAdmin'
import { estimateCost } from './estimateCost'
import { normalizeAiUsage } from './normalizeUsage'
import type { NormalizedAiUsage } from '../types'

export interface RecordAiUsageLogParams {
  userId?: string | null
  organisationId?: string | null
  caseId?: string | null
  featureKey: AiFeatureKey
  provider: string
  model: string
  requestKind?: AiRequestKind
  rawUsage?: unknown
  inputText?: string
  outputText?: string
  audioSeconds?: number
  success?: boolean
  errorCode?: string | null
  requestId?: string | null
  latencyMs?: number | null
  metadata?: Record<string, unknown>
}

function currentPeriodStart(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {}
  const blocked = new Set([
    'prompt',
    'systemPrompt',
    'userPrompt',
    'inputText',
    'outputText',
    'text',
    'clinicalText',
    'patientName',
    'patient',
  ])
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.has(key)) continue
    if (typeof value === 'string' && value.length > 500) continue
    safe[key] = value
  }
  return safe
}

async function maybeRecordBudgetWarning(params: {
  organisationId: string
  thresholdPercent: 50 | 80 | 100
  budgetAmount: number
  currentUsage: number
  currency: string
}): Promise<void> {
  if (!isKbAdminConfigured()) return
  const admin = getKbSupabaseAdmin()
  const periodStart = currentPeriodStart()

  const { data: existing } = await admin
    .from('ai_budget_warnings')
    .select('id')
    .eq('organisation_id', params.organisationId)
    .eq('period_start', periodStart)
    .eq('threshold_percent', params.thresholdPercent)
    .maybeSingle()

  if (existing) return

  await admin.from('ai_budget_warnings').insert({
    organisation_id: params.organisationId,
    threshold_percent: params.thresholdPercent,
    period_start: periodStart,
    budget_amount: params.budgetAmount,
    current_usage: params.currentUsage,
    currency: params.currency,
  })
}

async function checkBudgetThresholds(organisationId: string, addedCostEur: number): Promise<void> {
  if (!isKbAdminConfigured()) return
  const admin = getKbSupabaseAdmin()

  const { data: configRow } = await admin
    .from('ai_budget_configs')
    .select('*')
    .eq('organisation_id', organisationId)
    .maybeSingle()

  if (!configRow) return

  const budgetEur = configRow.monthly_budget_eur != null ? Number(configRow.monthly_budget_eur) : null
  const budgetUsd = configRow.monthly_budget_usd != null ? Number(configRow.monthly_budget_usd) : null
  const budgetAmount = budgetEur ?? budgetUsd
  const currency = budgetEur != null ? 'EUR' : budgetUsd != null ? 'USD' : 'EUR'
  if (budgetAmount == null || budgetAmount <= 0) return

  const periodStart = currentPeriodStart()
  const { data: logs } = await admin
    .from('ai_usage_logs')
    .select('estimated_cost_eur, estimated_cost_usd')
    .eq('organisation_id', organisationId)
    .gte('created_at', periodStart)

  let currentUsage = 0
  for (const row of logs ?? []) {
    if (currency === 'EUR') {
      currentUsage += Number(row.estimated_cost_eur ?? 0)
    } else {
      currentUsage += Number(row.estimated_cost_usd ?? 0)
    }
  }
  void addedCostEur

  const percent = (currentUsage / budgetAmount) * 100
  const thresholds: Array<{ pct: 50 | 80 | 100; enabled: boolean }> = [
    { pct: 50, enabled: configRow.warn_at_50 !== false },
    { pct: 80, enabled: configRow.warn_at_80 !== false },
    { pct: 100, enabled: configRow.warn_at_100 !== false },
  ]

  for (const t of thresholds) {
    if (!t.enabled) continue
    if (percent >= t.pct) {
      await maybeRecordBudgetWarning({
        organisationId,
        thresholdPercent: t.pct,
        budgetAmount,
        currentUsage,
        currency,
      })
    }
  }
}

export async function recordAiUsageLog(params: RecordAiUsageLogParams): Promise<string | null> {
  const usage: NormalizedAiUsage = normalizeAiUsage({
    provider: params.provider,
    model: params.model,
    rawUsage: params.rawUsage,
    inputText: params.inputText,
    outputText: params.outputText,
    audioSeconds: params.audioSeconds,
  })

  const cost = estimateCost({
    provider: params.provider,
    model: params.model,
    usage,
  })

  if (!isKbAdminConfigured()) {
    console.info('[ai-usage]', {
      featureKey: params.featureKey,
      provider: params.provider,
      model: params.model,
      totalTokens: usage.totalTokens,
      usageSource: usage.usageSource,
      success: params.success ?? true,
    })
    return null
  }

  const admin = getKbSupabaseAdmin()
  const row = {
    user_id: params.userId ?? null,
    organisation_id: params.organisationId ?? null,
    case_id: params.caseId ?? null,
    feature_key: params.featureKey,
    provider: params.provider,
    model: params.model,
    request_kind: params.requestKind ?? 'chat',
    input_tokens: usage.inputTokens,
    cached_input_tokens: usage.cachedInputTokens,
    cache_miss_input_tokens: usage.cacheMissInputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
    audio_minutes: usage.audioMinutes,
    estimated_cost_usd: cost.estimatedCostUsd,
    estimated_cost_eur: cost.estimatedCostEur,
    currency_rate_used: cost.currencyRateUsed,
    usage_source: usage.usageSource,
    success: params.success ?? true,
    error_code: params.errorCode ?? null,
    request_id: params.requestId ?? null,
    latency_ms: params.latencyMs ?? null,
    raw_usage_json: usage.rawUsageJson,
    metadata_json: sanitizeMetadata(params.metadata),
  }

  const { data, error } = await admin.from('ai_usage_logs').insert(row).select('id').single()
  if (error) {
    console.error('[ai-usage] insert failed:', error.message)
    return null
  }

  if (params.organisationId && cost.estimatedCostEur != null) {
    void checkBudgetThresholds(params.organisationId, cost.estimatedCostEur)
  }

  return data?.id ? String(data.id) : null
}

export async function isBudgetHardLimitExceeded(organisationId: string): Promise<boolean> {
  if (!isKbAdminConfigured()) return false
  const admin = getKbSupabaseAdmin()

  const { data: configRow } = await admin
    .from('ai_budget_configs')
    .select('*')
    .eq('organisation_id', organisationId)
    .maybeSingle()

  if (!configRow?.hard_limit_enabled) return false

  const limitEur = configRow.hard_limit_eur != null ? Number(configRow.hard_limit_eur) : null
  const limitUsd = configRow.hard_limit_usd != null ? Number(configRow.hard_limit_usd) : null
  const limit = limitEur ?? limitUsd
  const currency = limitEur != null ? 'EUR' : 'USD'
  if (limit == null || limit <= 0) return false

  const periodStart = currentPeriodStart()
  const { data: logs } = await admin
    .from('ai_usage_logs')
    .select('estimated_cost_eur, estimated_cost_usd')
    .eq('organisation_id', organisationId)
    .gte('created_at', periodStart)

  let current = 0
  for (const row of logs ?? []) {
    current +=
      currency === 'EUR'
        ? Number(row.estimated_cost_eur ?? 0)
        : Number(row.estimated_cost_usd ?? 0)
  }

  return current >= limit
}

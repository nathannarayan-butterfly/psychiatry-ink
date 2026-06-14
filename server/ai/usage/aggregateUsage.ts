import type {
  AiUsageBreakdownRow,
  AiUsageMonthlySummary,
} from '../../../src/types/aiUsage'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../../services/kbSupabaseAdmin'

export interface UsageLogRow {
  feature_key: string
  provider: string
  model: string
  user_id: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost_usd: number | null
  estimated_cost_eur: number | null
  usage_source: string
  audio_minutes: number | null
  success: boolean
  metadata_json?: Record<string, unknown>
}

function monthBounds(yearMonth?: string): { periodStart: string; periodEnd: string } {
  let year: number
  let month: number
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    ;[year, month] = yearMonth.split('-').map(Number)
  } else {
    const now = new Date()
    year = now.getUTCFullYear()
    month = now.getUTCMonth() + 1
  }
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { periodStart, periodEnd }
}

export async function fetchUsageLogsForPeriod(params: {
  organisationId: string
  yearMonth?: string
  userId?: string | null
}): Promise<UsageLogRow[]> {
  if (!isKbAdminConfigured()) return []
  const { periodStart, periodEnd } = monthBounds(params.yearMonth)
  const admin = getKbSupabaseAdmin()

  let query = admin
    .from('ai_usage_logs')
    .select(
      'feature_key, provider, model, user_id, input_tokens, output_tokens, total_tokens, estimated_cost_usd, estimated_cost_eur, usage_source, audio_minutes, success, metadata_json',
    )
    .eq('organisation_id', params.organisationId)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd)

  if (params.userId) query = query.eq('user_id', params.userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as UsageLogRow[]
}

function sumRows(rows: UsageLogRow[]) {
  let totalCostUsd = 0
  let totalCostEur = 0
  let totalTokens = 0
  let deepseekTokens = 0
  let openaiTokens = 0
  let transcriptionMinutes = 0
  let providerReportedCount = 0
  let estimatedCount = 0
  let openaiFallbackCount = 0

  const featureMap = new Map<string, { tokens: number; costEur: number; count: number }>()

  for (const row of rows) {
    totalTokens += row.total_tokens ?? 0
    totalCostUsd += Number(row.estimated_cost_usd ?? 0)
    totalCostEur += Number(row.estimated_cost_eur ?? 0)
    if (row.provider === 'deepseek') deepseekTokens += row.total_tokens ?? 0
    if (row.provider === 'openai') openaiTokens += row.total_tokens ?? 0
    transcriptionMinutes += Number(row.audio_minutes ?? 0)
    if (row.usage_source === 'provider_reported') providerReportedCount += 1
    else estimatedCount += 1
    if (row.metadata_json?.openaiFallback === true) openaiFallbackCount += 1

    const f = featureMap.get(row.feature_key) ?? { tokens: 0, costEur: 0, count: 0 }
    f.tokens += row.total_tokens ?? 0
    f.costEur += Number(row.estimated_cost_eur ?? 0)
    f.count += 1
    featureMap.set(row.feature_key, f)
  }

  const topFeatures = [...featureMap.entries()]
    .map(([featureKey, v]) => ({ featureKey, ...v }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)

  return {
    totalCostUsd,
    totalCostEur,
    totalTokens,
    generationCount: rows.length,
    providerReportedCount,
    estimatedCount,
    deepseekTokens,
    openaiTokens,
    transcriptionMinutes,
    openaiFallbackCount,
    topFeatures,
  }
}

export async function buildMonthlySummary(params: {
  organisationId: string
  yearMonth?: string
  userId?: string | null
  budgetAmount?: number | null
  budgetCurrency?: 'USD' | 'EUR' | null
}): Promise<AiUsageMonthlySummary> {
  const { periodStart, periodEnd } = monthBounds(params.yearMonth)
  const rows = await fetchUsageLogsForPeriod(params)
  const sums = sumRows(rows)

  let budgetPercent: number | null = null
  if (params.budgetAmount != null && params.budgetAmount > 0) {
    const usage =
      params.budgetCurrency === 'USD' ? sums.totalCostUsd : sums.totalCostEur
    budgetPercent = Math.round((usage / params.budgetAmount) * 1000) / 10
  }

  return {
    periodStart,
    periodEnd,
    ...sums,
    budgetPercent,
    budgetCurrency: params.budgetCurrency ?? null,
  }
}

export type BreakdownDimension = 'provider' | 'model' | 'feature' | 'user'

export async function aggregateUsageBreakdown(params: {
  organisationId: string
  yearMonth?: string
  dimension: BreakdownDimension
  userId?: string | null
}): Promise<AiUsageBreakdownRow[]> {
  const rows = await fetchUsageLogsForPeriod(params)
  const map = new Map<string, AiUsageBreakdownRow>()

  for (const row of rows) {
    let key: string
    switch (params.dimension) {
      case 'provider':
        key = row.provider
        break
      case 'model':
        key = row.model
        break
      case 'feature':
        key = row.feature_key
        break
      case 'user':
        key = row.user_id ?? '(system)'
        break
    }

    const existing = map.get(key) ?? {
      key,
      tokens: 0,
      costUsd: 0,
      costEur: 0,
      count: 0,
      providerReportedCount: 0,
      estimatedCount: 0,
    }
    existing.tokens += row.total_tokens ?? 0
    existing.costUsd += Number(row.estimated_cost_usd ?? 0)
    existing.costEur += Number(row.estimated_cost_eur ?? 0)
    existing.count += 1
    if (row.usage_source === 'provider_reported') existing.providerReportedCount += 1
    else existing.estimatedCount += 1
    map.set(key, existing)
  }

  return [...map.values()].sort((a, b) => b.tokens - a.tokens)
}

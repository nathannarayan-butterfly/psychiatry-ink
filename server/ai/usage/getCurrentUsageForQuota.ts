import type { CurrentUsageForQuota } from '../../../src/types/aiUsage'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../../services/kbSupabaseAdmin'
import { buildMonthlySummary } from './aggregateUsage'

export type { CurrentUsageForQuota }

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function getCurrentUsageForQuota(params: {
  organisationId: string
  userId?: string | null
}): Promise<CurrentUsageForQuota> {
  if (!isKbAdminConfigured()) {
    return {
      generationCount: 0,
      tokenCount: 0,
      costUsd: 0,
      costEur: 0,
      openaiFallbackCount: 0,
      transcriptionMinutes: 0,
      providerReportedCount: 0,
      estimatedCount: 0,
    }
  }

  const admin = getKbSupabaseAdmin()
  let budgetAmount: number | null = null
  let budgetCurrency: 'USD' | 'EUR' | null = null

  const { data: configRow } = await admin
    .from('ai_budget_configs')
    .select('monthly_budget_eur, monthly_budget_usd')
    .eq('organisation_id', params.organisationId)
    .maybeSingle()

  if (configRow?.monthly_budget_eur != null) {
    budgetAmount = Number(configRow.monthly_budget_eur)
    budgetCurrency = 'EUR'
  } else if (configRow?.monthly_budget_usd != null) {
    budgetAmount = Number(configRow.monthly_budget_usd)
    budgetCurrency = 'USD'
  }

  const summary = await buildMonthlySummary({
    organisationId: params.organisationId,
    yearMonth: currentYearMonth(),
    userId: params.userId,
    budgetAmount,
    budgetCurrency,
  })

  return {
    generationCount: summary.generationCount,
    tokenCount: summary.totalTokens,
    costUsd: summary.totalCostUsd,
    costEur: summary.totalCostEur,
    openaiFallbackCount: summary.openaiFallbackCount,
    transcriptionMinutes: summary.transcriptionMinutes,
    providerReportedCount: summary.providerReportedCount,
    estimatedCount: summary.estimatedCount,
  }
}

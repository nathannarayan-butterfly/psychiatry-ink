/**
 * AI analytics aggregation for the admin surface.
 *
 * The service computes:
 *   1. Revenue per bundle SKU (paid purchases × snapshot priceGbp).
 *   2. Total credits consumed, split monthly vs purchased.
 *   3. Total estimated provider cost (USD).
 *   4. Per-feature gross margin (revenue allocated by credit share).
 *   5. Per-provider and per-model margin.
 *   6. Average cost per distinct case (caseRef).
 *   7. Average cost per distinct user per month within the window.
 *   8. Failed-call cost (success=false).
 *   9. Fallback-call cost (fallback=true).
 *  10. OpenAI and Gründlich cost share.
 *  + marginHealth banner derived from {@link aiPricingConfig.marginWarnThreshold}.
 *
 * No PHI is ever loaded — only metadata columns from AiUsageLog / AiCreditLedger.
 */

import { prisma } from '../db'
import {
  marginCriticalThreshold,
  marginWarnThreshold,
  usdToGbpRate,
} from './aiPricingConfig'

export interface AnalyticsWindow {
  from: Date
  to: Date
}

export interface BundleRevenue {
  sku: string
  purchases: number
  revenueGbp: number
  credits: number
}

export interface FeatureBreakdown {
  featureKey: string
  creditsCharged: number
  estimatedCostUsd: number
  revenueGbp: number
  marginGbp: number
  callCount: number
}

export interface ProviderBreakdown {
  provider: string
  creditsCharged: number
  estimatedCostUsd: number
  revenueGbp: number
  marginGbp: number
  callCount: number
}

export interface ModelBreakdown extends ProviderBreakdown {
  model: string
}

export interface MarginHealth {
  status: 'healthy' | 'warning' | 'critical'
  message: string
  marginPct: number
  costRatio: number
  thresholds: {
    warn: number
    critical: number
  }
}

export interface AnalyticsResponse {
  window: { from: string; to: string; days: number }
  revenue: {
    totalGbp: number
    perBundle: BundleRevenue[]
  }
  credits: {
    totalConsumed: number
    monthlyConsumed: number
    purchasedConsumed: number
  }
  cost: {
    totalEstimatedUsd: number
    totalEstimatedGbp: number
    failedCallCostUsd: number
    fallbackCostUsd: number
    openAiCostUsd: number
    gruendlichCostUsd: number
    openAiCostShare: number
    gruendlichCostShare: number
  }
  averages: {
    costPerPatientUsd: number | null
    costPerUserPerMonthUsd: number | null
    distinctCases: number
    distinctUsers: number
  }
  features: FeatureBreakdown[]
  providers: ProviderBreakdown[]
  models: ModelBreakdown[]
  marginHealth: MarginHealth
  usdToGbpRate: number
  generatedAt: string
}

function startOfDayMinus(days: number): Date {
  const now = new Date()
  const target = new Date(now.getTime() - days * 86_400 * 1000)
  return new Date(Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  ))
}

/** Parse the optional ISO `from` / `to` query params. Defaults to last 30 days. */
export function resolveWindow(input: { from?: string | null; to?: string | null }): AnalyticsWindow {
  const now = new Date()
  let from = startOfDayMinus(30)
  let to = now

  if (input.from) {
    const parsed = new Date(input.from)
    if (!Number.isNaN(parsed.getTime())) from = parsed
  }
  if (input.to) {
    const parsed = new Date(input.to)
    if (!Number.isNaN(parsed.getTime())) to = parsed
  }
  if (from > to) {
    // Defensive: swap if the caller transposed them.
    return { from: to, to: from }
  }
  return { from, to }
}

function rangeDays({ from, to }: AnalyticsWindow): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000))
}

function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0
  return numerator / denominator
}

function toUsd(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number.parseFloat(value.toString())
  return Number.isFinite(n) ? n : 0
}

/** Compute the analytics rollup over the given window. */
export async function computeAnalytics(window: AnalyticsWindow): Promise<AnalyticsResponse> {
  const usdGbp = usdToGbpRate()

  // ── 1. Revenue: paid purchases in window ──────────────────────────────────
  const purchases = await prisma.aiCreditPurchase.findMany({
    where: {
      status: 'paid',
      paidAt: { gte: window.from, lte: window.to },
    },
    include: { bundle: true },
  })

  const revenuePerSku = new Map<string, BundleRevenue>()
  let totalRevenueGbp = 0
  for (const purchase of purchases) {
    const sku = purchase.bundle?.sku ?? 'unknown'
    const priceGbp = toUsd(purchase.priceGbp)
    totalRevenueGbp += priceGbp
    const existing = revenuePerSku.get(sku) ?? {
      sku,
      purchases: 0,
      revenueGbp: 0,
      credits: 0,
    }
    existing.purchases += 1
    existing.revenueGbp += priceGbp
    existing.credits += purchase.credits
    revenuePerSku.set(sku, existing)
  }

  // ── 2. Usage logs in window ───────────────────────────────────────────────
  const usageLogs = await prisma.aiUsageLog.findMany({
    where: { createdAt: { gte: window.from, lte: window.to } },
    select: {
      featureKey: true,
      provider: true,
      model: true,
      mode: true,
      creditsCharged: true,
      estimatedCostUsd: true,
      fallback: true,
      success: true,
      userId: true,
      caseRef: true,
    },
  })

  // ── 3. Bucket-split credits via the ledger ─────────────────────────────────
  const ledgerRows = await prisma.aiCreditLedger.findMany({
    where: {
      type: 'debit',
      createdAt: { gte: window.from, lte: window.to },
    },
    select: { credits: true, bucket: true },
  })
  let monthlyConsumed = 0
  let purchasedConsumed = 0
  for (const row of ledgerRows) {
    const abs = Math.abs(row.credits)
    if (row.bucket === 'purchased') purchasedConsumed += abs
    else monthlyConsumed += abs
  }

  // ── 4. Roll up usage logs into feature / provider / model breakdowns ──────
  const featureMap = new Map<string, FeatureBreakdown>()
  const providerMap = new Map<string, ProviderBreakdown>()
  const modelMap = new Map<string, ModelBreakdown>()
  let totalCreditsCharged = 0
  let totalEstimatedCostUsd = 0
  let failedCallCostUsd = 0
  let fallbackCostUsd = 0
  let openAiCostUsd = 0
  let gruendlichCostUsd = 0
  const caseSet = new Set<string>()
  const userSet = new Set<string>()

  for (const log of usageLogs) {
    const cost = toUsd(log.estimatedCostUsd)
    totalEstimatedCostUsd += cost
    totalCreditsCharged += log.creditsCharged

    if (!log.success) failedCallCostUsd += cost
    if (log.fallback) fallbackCostUsd += cost
    if (log.provider === 'openai') openAiCostUsd += cost
    if (log.mode === 'gruendlich') gruendlichCostUsd += cost
    if (log.caseRef) caseSet.add(log.caseRef)
    if (log.userId) userSet.add(log.userId)

    const fkey = log.featureKey
    const fExisting = featureMap.get(fkey) ?? {
      featureKey: fkey,
      creditsCharged: 0,
      estimatedCostUsd: 0,
      revenueGbp: 0,
      marginGbp: 0,
      callCount: 0,
    }
    fExisting.creditsCharged += log.creditsCharged
    fExisting.estimatedCostUsd += cost
    fExisting.callCount += 1
    featureMap.set(fkey, fExisting)

    const provider = log.provider || 'unknown'
    const pExisting = providerMap.get(provider) ?? {
      provider,
      creditsCharged: 0,
      estimatedCostUsd: 0,
      revenueGbp: 0,
      marginGbp: 0,
      callCount: 0,
    }
    pExisting.creditsCharged += log.creditsCharged
    pExisting.estimatedCostUsd += cost
    pExisting.callCount += 1
    providerMap.set(provider, pExisting)

    const modelKey = `${provider}/${log.model || 'unknown'}`
    const mExisting = modelMap.get(modelKey) ?? {
      provider,
      model: log.model || 'unknown',
      creditsCharged: 0,
      estimatedCostUsd: 0,
      revenueGbp: 0,
      marginGbp: 0,
      callCount: 0,
    }
    mExisting.creditsCharged += log.creditsCharged
    mExisting.estimatedCostUsd += cost
    mExisting.callCount += 1
    modelMap.set(modelKey, mExisting)
  }

  // ── 5. Allocate revenue to breakdowns by credit share ─────────────────────
  // Revenue attributable to a feature ≈ (creditsCharged_feature / total) × totalRevenueGbp.
  // This is a coarse proxy until each feature is priced separately, but it
  // surfaces the right gross-margin signal at the aggregate level.
  function allocateAndMargin(
    rows: Array<FeatureBreakdown | ProviderBreakdown | ModelBreakdown>,
  ) {
    for (const row of rows) {
      row.revenueGbp =
        totalCreditsCharged > 0
          ? (row.creditsCharged / totalCreditsCharged) * totalRevenueGbp
          : 0
      row.marginGbp = row.revenueGbp - row.estimatedCostUsd * usdGbp
    }
  }
  const features = Array.from(featureMap.values())
  const providers = Array.from(providerMap.values())
  const models = Array.from(modelMap.values())
  allocateAndMargin(features)
  allocateAndMargin(providers)
  allocateAndMargin(models)

  features.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
  providers.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
  models.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)

  // ── 6. Averages ───────────────────────────────────────────────────────────
  const days = rangeDays(window)
  const monthsInWindow = days / 30.4375
  const distinctCases = caseSet.size
  const distinctUsers = userSet.size
  const costPerPatientUsd =
    distinctCases > 0 ? totalEstimatedCostUsd / distinctCases : null
  const costPerUserPerMonthUsd =
    distinctUsers > 0
      ? totalEstimatedCostUsd / distinctUsers / Math.max(monthsInWindow, 1 / 30.4375)
      : null

  // ── 7. Margin health banner ───────────────────────────────────────────────
  const totalEstimatedCostGbp = totalEstimatedCostUsd * usdGbp
  const warn = marginWarnThreshold()
  const critical = marginCriticalThreshold()
  const costRatio = safeDiv(totalEstimatedCostGbp, totalRevenueGbp)
  const marginPct = totalRevenueGbp > 0 ? 1 - costRatio : 0

  let status: MarginHealth['status'] = 'healthy'
  let message = `Variable cost is ${(costRatio * 100).toFixed(1)}% of revenue — gross margin ${(marginPct * 100).toFixed(1)}%.`
  if (totalRevenueGbp <= 0) {
    status = 'healthy'
    message =
      'No paid revenue in window yet — margin status will activate once bundle purchases are recorded.'
  } else if (costRatio > critical) {
    status = 'critical'
    message = `CRITICAL: variable cost is ${(costRatio * 100).toFixed(1)}% of revenue (>${(critical * 100).toFixed(0)}% threshold).`
  } else if (costRatio > warn) {
    status = 'warning'
    message = `WARNING: variable cost is ${(costRatio * 100).toFixed(1)}% of revenue (>${(warn * 100).toFixed(0)}% threshold).`
  }

  return {
    window: {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      days,
    },
    revenue: {
      totalGbp: round2(totalRevenueGbp),
      perBundle: Array.from(revenuePerSku.values())
        .map((row) => ({ ...row, revenueGbp: round2(row.revenueGbp) }))
        .sort((a, b) => b.revenueGbp - a.revenueGbp),
    },
    credits: {
      totalConsumed: totalCreditsCharged,
      monthlyConsumed,
      purchasedConsumed,
    },
    cost: {
      totalEstimatedUsd: round6(totalEstimatedCostUsd),
      totalEstimatedGbp: round2(totalEstimatedCostGbp),
      failedCallCostUsd: round6(failedCallCostUsd),
      fallbackCostUsd: round6(fallbackCostUsd),
      openAiCostUsd: round6(openAiCostUsd),
      gruendlichCostUsd: round6(gruendlichCostUsd),
      openAiCostShare: round4(safeDiv(openAiCostUsd, totalEstimatedCostUsd)),
      gruendlichCostShare: round4(safeDiv(gruendlichCostUsd, totalEstimatedCostUsd)),
    },
    averages: {
      costPerPatientUsd: costPerPatientUsd != null ? round6(costPerPatientUsd) : null,
      costPerUserPerMonthUsd:
        costPerUserPerMonthUsd != null ? round6(costPerUserPerMonthUsd) : null,
      distinctCases,
      distinctUsers,
    },
    features: features.map(roundBreakdown),
    providers: providers.map(roundBreakdown),
    models: models.map(roundBreakdown),
    marginHealth: {
      status,
      message,
      marginPct: round4(marginPct),
      costRatio: round4(costRatio),
      thresholds: { warn, critical },
    },
    usdToGbpRate: usdGbp,
    generatedAt: new Date().toISOString(),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000
}
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}
function roundBreakdown<T extends { estimatedCostUsd: number; revenueGbp: number; marginGbp: number }>(
  row: T,
): T {
  row.estimatedCostUsd = round6(row.estimatedCostUsd)
  row.revenueGbp = round2(row.revenueGbp)
  row.marginGbp = round2(row.marginGbp)
  return row
}
